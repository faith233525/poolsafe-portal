import { Request, Response, NextFunction } from "express";
import { prisma } from "../prismaClient";
import { logger } from "./logger";

export interface AuditLogEntry {
  userId?: string;
  userEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  path: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
  requestId?: string;
  metadata?: any;
}

// Audit logging middleware
export const auditLogger = (action: string, resource: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const originalSend = res.send;
    let success = true;
    let errorMessage: string | undefined;

    // Capture response
    res.send = function (body) {
      success = res.statusCode < 400;
      if (!success && typeof body === "string") {
        try {
          const parsed = JSON.parse(body);
          errorMessage = parsed.error || parsed.message;
        } catch {
          errorMessage = body;
        }
      }
      return originalSend.call(this, body);
    };

    // Continue with request
    res.on("finish", async () => {
      const user = (req as any).user;
      const duration = Date.now() - startTime;

      const auditEntry: AuditLogEntry = {
        userId: user?.id,
        userEmail: user?.email,
        action,
        resource,
        resourceId: req.params.id,
        method: req.method,
        path: req.path,
        ipAddress: req.ip || req.socket.remoteAddress || "unknown",
        userAgent: req.get("User-Agent") || "unknown",
        success,
        errorMessage,
        requestId: (req as any).requestId,
        metadata: {
          duration,
          statusCode: res.statusCode,
          query: Object.keys(req.query).length > 0 ? req.query : undefined,
          bodySize: req.get("Content-Length") ? parseInt(req.get("Content-Length")!) : undefined,
        },
      };

      try {
        // Log to structured logger
        logger.info(auditEntry, "Audit log entry");

        // Store critical actions in database
        if (shouldStoreInDatabase(action, resource, success)) {
          await prisma.notification.create({
            data: {
              userId: user?.id,
              recipientEmail: user?.email,
              title: `Audit: ${action} ${resource}`,
              message: `User ${user?.email || "unknown"} performed ${action} on ${resource}${
                auditEntry.resourceId ? ` (ID: ${auditEntry.resourceId})` : ""
              }. Status: ${success ? "SUCCESS" : "FAILED"}${
                errorMessage ? `. Error: ${errorMessage}` : ""
              }`,
              type: "AUDIT",
              relatedId: auditEntry.resourceId,
              relatedType: resource,
            },
          });
        }
      } catch (error) {
        logger.error({ error, auditEntry }, "Failed to create audit log");
      }
    });

    next();
  };
};

// Determine which actions should be stored in database
function shouldStoreInDatabase(action: string, resource: string, success: boolean): boolean {
  // Store all failed operations
  if (!success) {
    return true;
  }

  // Store critical operations
  const criticalActions = [
    "CREATE_USER",
    "DELETE_USER",
    "UPDATE_USER_ROLE",
    "DELETE_TICKET",
    "DELETE_PARTNER",
    "LOGIN_SSO",
    "PASSWORD_CHANGE",
    "ADMIN_ACTION",
  ];

  const criticalResources = ["User", "Partner"];

  return (
    criticalActions.includes(action) ||
    criticalResources.includes(resource) ||
    (action.startsWith("DELETE") && success)
  );
}

// Session management middleware
export const sessionSecurity = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;

  if (!user) {
    return next();
  }

  // Check for suspicious activity patterns
  const userAgent = req.get("User-Agent");
  const ipAddress = req.ip || req.socket.remoteAddress;

  // Set security headers for authenticated sessions
  res.setHeader("X-Session-User-ID", user.id);
  res.setHeader("X-Session-Role", user.role);

  // Add session metadata to request for logging
  (req as any).sessionInfo = {
    userId: user.id,
    userAgent,
    ipAddress,
    sessionStart: Date.now(),
  };

  next();
};

// Enhanced input validation and sanitization
export const inputSanitizer = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Sanitize common injection patterns
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<\s*script\b[^>]*>/i,
      /\bjavascript:/i,
      /\bvbscript:/i,
      /\bdata:text\/html/i,
      /\b(SELECT\s+\*|INSERT\s+INTO|UPDATE\s+SET|DELETE\s+FROM|DROP\s+TABLE|CREATE\s+TABLE|ALTER\s+TABLE)\b/i,
      /(\||&&|;|\$\(|`)/,
    ];

    const requestString = JSON.stringify({ body: req.body, query: req.query });

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(requestString)) {
        logger.warn(
          {
            path: req.path,
            method: req.method,
            ip: req.ip,
            userAgent: req.get("User-Agent"),
            suspiciousContent: requestString,
          },
          "Suspicious input detected",
        );

        return res.status(400).json({
          error: "Invalid input detected. Please check your request data.",
        });
      }
    }

    next();
  } catch (error) {
    logger.error({ error, path: req.path }, "Input sanitization error");
    res.status(500).json({ error: "Input validation failed" });
  }
};

// Helper function to sanitize objects recursively
function sanitizeObject(obj: any): any {
  if (typeof obj === "string") {
    return obj
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .trim();
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  if (typeof obj === "object" && obj !== null) {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
}

// Content Security Policy middleware
export const contentSecurityPolicy = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.hubspot.com https://graph.microsoft.com",
      "frame-src https://outlook.office365.com https://login.microsoftonline.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  );

  // Additional security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

  next();
};

// Request size limiting middleware
export const requestSizeLimiter = (maxSizeBytes: number = 10 * 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get("Content-Length") || "0");

    if (contentLength > maxSizeBytes) {
      logger.warn(
        {
          path: req.path,
          method: req.method,
          contentLength,
          maxSizeBytes,
          ip: req.ip,
        },
        "Request size limit exceeded",
      );

      return res.status(413).json({
        error: `Request size exceeds limit of ${Math.round(maxSizeBytes / 1024 / 1024)}MB`,
      });
    }

    next();
  };
};

// IP address validation and blocking
const blockedIPs = new Set<string>();
const suspiciousIPs = new Map<string, { count: number; lastSeen: number }>();

export const ipSecurityFilter = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || req.socket.remoteAddress || "unknown";

  // Check if IP is blocked
  if (blockedIPs.has(clientIP)) {
    logger.warn({ ip: clientIP, path: req.path }, "Blocked IP attempted access");
    return res.status(403).json({ error: "Access denied" });
  }

  // Track suspicious activity
  const now = Date.now();
  const suspiciousActivity = suspiciousIPs.get(clientIP) || { count: 0, lastSeen: now };

  // Reset count if last activity was more than 1 hour ago
  if (now - suspiciousActivity.lastSeen > 60 * 60 * 1000) {
    suspiciousActivity.count = 0;
  }

  suspiciousActivity.count++;
  suspiciousActivity.lastSeen = now;
  suspiciousIPs.set(clientIP, suspiciousActivity);

  // Block IP if too many suspicious requests
  if (suspiciousActivity.count > 50) {
    blockedIPs.add(clientIP);
    logger.warn(
      { ip: clientIP, count: suspiciousActivity.count },
      "IP blocked for suspicious activity",
    );
    return res.status(403).json({ error: "Access denied due to suspicious activity" });
  }

  next();
};

// Rate limiting per user
const userRateLimits = new Map<string, { count: number; resetTime: number }>();

export const userRateLimit = (maxRequests: number = 100, windowMinutes: number = 15) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return next();
    }

    const userId = user.id;
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    const userLimit = userRateLimits.get(userId) || { count: 0, resetTime: now + windowMs };

    // Reset counter if window has passed
    if (now > userLimit.resetTime) {
      userLimit.count = 0;
      userLimit.resetTime = now + windowMs;
    }

    userLimit.count++;
    userRateLimits.set(userId, userLimit);

    if (userLimit.count > maxRequests) {
      logger.warn(
        {
          userId,
          count: userLimit.count,
          maxRequests,
          path: req.path,
        },
        "User rate limit exceeded",
      );

      return res.status(429).json({
        error: "Rate limit exceeded. Please try again later.",
        resetTime: new Date(userLimit.resetTime).toISOString(),
      });
    }

    // Add rate limit headers
    res.setHeader("X-RateLimit-Limit", maxRequests.toString());
    res.setHeader("X-RateLimit-Remaining", (maxRequests - userLimit.count).toString());
    res.setHeader("X-RateLimit-Reset", new Date(userLimit.resetTime).toISOString());

    next();
  };
};

// Data classification middleware
export const dataClassifier = (
  classification: "public" | "internal" | "confidential" | "restricted",
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Data-Classification", classification);

    // Add extra security for sensitive data
    if (["confidential", "restricted"].includes(classification)) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }

    next();
  };
};
