import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { logger, logHelpers } from "../lib/logger";

// API Key Authentication Middleware
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers["x-api-key"] as string;
  const expectedApiKey = process.env.API_KEY;

  if (!expectedApiKey) {
    logger.warn("API key authentication disabled - no API_KEY environment variable set");
    return next();
  }

  if (!apiKey) {
    logHelpers.logSecurity(
      "API key missing",
      {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        url: req.url,
        method: req.method,
      },
      "medium",
    );

    return res.status(401).json({
      error: "API key required",
      code: "MISSING_API_KEY",
    });
  }

  if (apiKey !== expectedApiKey) {
    logHelpers.logSecurity(
      "Invalid API key attempt",
      {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        url: req.url,
        method: req.method,
        providedKey: `${apiKey.substring(0, 8)}...`, // Log partial key for debugging
      },
      "high",
    );

    return res.status(401).json({
      error: "Invalid API key",
      code: "INVALID_API_KEY",
    });
  }

  logHelpers.logSecurity(
    "API key authenticated",
    {
      ip: req.ip,
      url: req.url,
      method: req.method,
    },
    "low",
  );

  next();
};

// Enhanced Rate Limiting with different tiers
export const createRateLimit = (
  windowMs: number,
  max: number,
  message: string,
  skipSuccessfulRequests = false,
) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000),
      code: "RATE_LIMIT_EXCEEDED",
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise IP
      return (req as any).user?.userId || req.ip;
    },
    handler: (req: Request, res: Response) => {
      logHelpers.logSecurity(
        "Rate limit exceeded",
        {
          ip: req.ip,
          userAgent: req.get("User-Agent"),
          url: req.url,
          method: req.method,
          userId: (req as any).user?.userId,
        },
        "medium",
      );

      res.status(429).json({
        error: "Too many requests. Please try again later.",
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });
};

// Strict rate limiting for authentication endpoints
export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts per window
  "Too many authentication attempts, please try again later",
  false,
);

// Standard rate limiting for general API endpoints
export const apiRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  200, // 200 requests per window
  "Too many requests, please try again later",
  true,
);

// Strict rate limiting for sensitive operations
export const sensitiveRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  10, // 10 requests per hour
  "Too many sensitive operations, please try again later",
  false,
);

// Simple delay middleware for progressive delay (manual implementation)
export const createSlowDown = (windowMs: number, delayAfter: number, maxDelayMs: number = 5000) => {
  const requests = new Map<string, { count: number; firstRequest: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = (req as any).user?.userId || req.ip || "unknown";
    const now = Date.now();
    const window = requests.get(key);

    if (!window || now - window.firstRequest > windowMs) {
      requests.set(key, { count: 1, firstRequest: now });
      return next();
    }

    window.count++;

    if (window.count <= delayAfter) {
      return next();
    }

    const delayMs = Math.min((window.count - delayAfter) * 500, maxDelayMs);

    logHelpers.logSecurity(
      "Slow down triggered",
      {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        url: req.url,
        method: req.method,
        userId: (req as any).user?.userId,
        delay: delayMs,
      },
      "low",
    );

    setTimeout(() => next(), delayMs);
  };
};

// Progressive slow down for API endpoints
export const apiSlowDown = createSlowDown(
  15 * 60 * 1000, // 15 minutes
  100, // Start slowing down after 100 requests
  2000, // Max 2 second delay
);

// IP Whitelist Middleware
export const ipWhitelist = (allowedIPs: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (allowedIPs.length === 0) {
      return next(); // No whitelist configured
    }

    const clientIP = req.ip;
    const forwarded = req.get("X-Forwarded-For");
    const realIP = req.get("X-Real-IP");

    const allIPs = [clientIP, forwarded, realIP].filter(Boolean);

    const isAllowed = allowedIPs.some((allowedIP) => allIPs.some((ip) => ip?.includes(allowedIP)));

    if (!isAllowed) {
      logHelpers.logSecurity(
        "IP not whitelisted",
        {
          clientIP,
          forwarded,
          realIP,
          userAgent: req.get("User-Agent"),
          url: req.url,
          method: req.method,
        },
        "high",
      );

      return res.status(403).json({
        error: "Access denied from this IP address",
        code: "IP_NOT_WHITELISTED",
      });
    }

    next();
  };
};

// Request size limiter
export const requestSizeLimit = (maxSize: string = "10mb") => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get("Content-Length");

    if (contentLength) {
      const sizeInBytes = parseInt(contentLength);
      const maxSizeInBytes = parseSize(maxSize);

      if (sizeInBytes > maxSizeInBytes) {
        logHelpers.logSecurity(
          "Request size exceeded",
          {
            ip: req.ip,
            contentLength: sizeInBytes,
            maxAllowed: maxSizeInBytes,
            url: req.url,
            method: req.method,
          },
          "medium",
        );

        return res.status(413).json({
          error: "Request entity too large",
          maxSize,
          code: "REQUEST_TOO_LARGE",
        });
      }
    }

    next();
  };
};

// Helper function to parse size strings
function parseSize(size: string): number {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)$/);
  if (!match) {
    throw new Error(`Invalid size format: ${size}`);
  }

  const [, number, unit] = match;
  return parseInt(number) * units[unit];
}

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Strict Transport Security
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

  // Content Security Policy
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob:; " +
      "font-src 'self'; " +
      "connect-src 'self' ws: wss:; " +
      "frame-ancestors 'none';",
  );

  // X-Frame-Options
  res.setHeader("X-Frame-Options", "DENY");

  // X-Content-Type-Options
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Referrer Policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy
  res.setHeader(
    "Permissions-Policy",
    "camera=(), " +
      "microphone=(), " +
      "geolocation=(), " +
      "payment=(), " +
      "usb=(), " +
      "magnetometer=(), " +
      "gyroscope=(), " +
      "accelerometer=()",
  );

  next();
};

// Request validation middleware
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  // Check for suspicious patterns in URL
  const suspiciousPatterns = [
    /\.\.\//g, // Directory traversal
    /<script/gi, // Script injection
    /union.*select/gi, // SQL injection
    /javascript:/gi, // JavaScript protocol
    /data:.*base64/gi, // Base64 data URLs
    /vbscript:/gi, // VBScript protocol
  ];

  const url = decodeURIComponent(req.url);
  const suspiciousPattern = suspiciousPatterns.find((pattern) => pattern.test(url));

  if (suspiciousPattern) {
    logHelpers.logSecurity(
      "Suspicious URL pattern detected",
      {
        ip: req.ip,
        url: req.url,
        decodedUrl: url,
        pattern: suspiciousPattern.toString(),
        userAgent: req.get("User-Agent"),
        method: req.method,
      },
      "high",
    );

    return res.status(400).json({
      error: "Invalid request format",
      code: "SUSPICIOUS_REQUEST",
    });
  }

  next();
};

// Honeypot middleware to catch bots
export const honeypot = (req: Request, res: Response, next: NextFunction) => {
  const honeypotFields = ["username", "email_address", "phone_number"];
  const hasHoneypotField = honeypotFields.some(
    (field) => req.body && req.body[field] !== undefined,
  );

  if (hasHoneypotField) {
    logHelpers.logSecurity(
      "Honeypot triggered",
      {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        url: req.url,
        method: req.method,
        body: req.body,
      },
      "high",
    );

    // Return success to not tip off the bot
    return res.status(200).json({ success: true });
  }

  next();
};
