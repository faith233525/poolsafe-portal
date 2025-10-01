import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";
import { memoryCache } from "../lib/optimizedQueries";

// Define custom request type
interface CustomRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

// Cache configuration for different endpoints
export const cacheConfig = {
  // Dashboard data - short term
  dashboard: {
    ttl: 2 * 60 * 1000, // 2 minutes
    keyPrefix: "dashboard",
  },

  // Partner information - medium term
  partners: {
    ttl: 10 * 60 * 1000, // 10 minutes
    keyPrefix: "partners",
  },

  // Knowledge base - long term
  knowledgeBase: {
    ttl: 30 * 60 * 1000, // 30 minutes
    keyPrefix: "kb",
  },

  // Static data - very long term
  static: {
    ttl: 60 * 60 * 1000, // 1 hour
    keyPrefix: "static",
  },
};

// Smart cache middleware that varies cache based on user context
export const smartCache = (config: { ttl: number; keyPrefix: string; varyBy?: string[] }) => {
  return (req: CustomRequest, res: Response, next: NextFunction) => {
    // Build cache key based on URL, method, user, and optional vary parameters
    const keyParts = [
      config.keyPrefix,
      req.method,
      req.originalUrl,
      req.user?.userId || "anonymous",
    ];

    // Add vary parameters if specified
    if (config.varyBy) {
      config.varyBy.forEach((param) => {
        const val = req.query[param];
        if (val !== undefined) {
          const str = Array.isArray(val)
            ? val.map((v) => (typeof v === "string" ? v : JSON.stringify(v))).join(",")
            : typeof val === "object"
              ? JSON.stringify(val)
              : String(val);
          keyParts.push(`${param}:${str}`);
        }
      });
    }

    const cacheKey = keyParts.join(":");

    // Try to get from cache first
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      logger.debug("Cache hit", { key: cacheKey });
      return res.json(cached);
    }

    // Override res.json to cache successful responses
    const originalJson = res.json;
    res.json = function (data: any) {
      if (res.statusCode === 200 && data) {
        memoryCache.set(cacheKey, data, config.ttl);
        logger.debug("Cache set", { key: cacheKey });
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

// Cache invalidation utilities
export const cacheInvalidation = {
  // Invalidate all caches for a specific partner
  invalidatePartner: (partnerId: string) => {
    const patterns = ["dashboard", "partners", "tickets"];
    patterns.forEach((pattern) => {
      const keyPattern = `${pattern}:*:*:${partnerId}`;
      logger.debug("Invalidating cache pattern", { pattern: keyPattern });
      // Note: Simple implementation - in production use Redis with pattern matching
    });
  },

  // Invalidate specific cache types
  invalidateType: (type: keyof typeof cacheConfig) => {
    const config = cacheConfig[type];
    if (config) {
      logger.debug("Invalidating cache type", { type, keyPrefix: config.keyPrefix });
      // Note: Simple implementation - in production use Redis with pattern matching
    }
  },

  // Clear all cache
  clearAll: () => {
    memoryCache.clear();
    logger.info("All cache cleared");
  },
};

// Cache warming for frequently accessed data
export const cacheWarmer = {
  // Warm up dashboard caches for active partners
  warmDashboards: (partnerIds: string[]) => {
    logger.info("Starting dashboard cache warming", { count: partnerIds.length });

    for (const partnerId of partnerIds) {
      try {
        // Simulate dashboard data loading
        // In real implementation, call actual dashboard service
        const dashboardData = {
          partnerId,
          warmedAt: new Date(),
          // Add actual dashboard data structure
        };

        const cacheKey = `dashboard:GET:/api/dashboard:${partnerId}`;
        memoryCache.set(cacheKey, dashboardData, cacheConfig.dashboard.ttl);

        logger.debug("Dashboard cache warmed", { partnerId, cacheKey });
      } catch (error) {
        logger.error("Error warming dashboard cache", { partnerId, error });
      }
    }
  },

  // Warm up knowledge base cache
  warmKnowledgeBase: () => {
    logger.info("Warming knowledge base cache");

    try {
      // In real implementation, fetch and cache KB articles
      const kbData = {
        articles: [],
        categories: [],
        warmedAt: new Date(),
      };

      const cacheKey = "kb:GET:/api/knowledge-base:anonymous";
      memoryCache.set(cacheKey, kbData, cacheConfig.knowledgeBase.ttl);

      logger.debug("Knowledge base cache warmed");
    } catch (error) {
      logger.error("Error warming knowledge base cache", { error });
    }
  },
};

// Cache statistics and monitoring
export const cacheStats = () => {
  const stats = memoryCache.getStats();

  return {
    size: stats.size,
    keys: stats.keys.length,
    keysByPrefix: stats.keys.reduce((acc: Record<string, number>, key) => {
      const prefix = key.split(":")[0];
      acc[prefix] = (acc[prefix] || 0) + 1;
      return acc;
    }, {}),
    timestamp: new Date(),
  };
};
