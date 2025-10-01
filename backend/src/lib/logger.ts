import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { config } from "./config";

// Custom log format for better readability
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss",
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const { level, message, timestamp, stack, ...meta } = info as Record<string, unknown>;
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : "";
    const stackTrace = stack ? `\n${JSON.stringify(stack, null, 2)}` : "";
    const safeMessage = typeof message === "string" ? message : JSON.stringify(message);
    const safeLevel =
      typeof level === "string" ? level.toUpperCase() : JSON.stringify(level).toUpperCase();
    const safeTimestamp =
      typeof timestamp === "string" ? timestamp : JSON.stringify(timestamp ?? "");
    return `${safeTimestamp} [${safeLevel}]: ${safeMessage}${stackTrace}${metaString ? `\n${metaString}` : ""}`;
  }),
);

// Daily rotate file transport for error logs
const errorFileTransport = new DailyRotateFile({
  filename: "logs/error-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  level: "error",
  maxSize: "20m",
  maxFiles: "14d",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
});

// Daily rotate file transport for all logs
const combinedFileTransport = new DailyRotateFile({
  filename: "logs/combined-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "30d",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
});

// Console transport with colors for development
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(winston.format.colorize(), logFormat),
});

// Create the logger instance
export const logger = winston.createLogger({
  level: config.logLevel || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: {
    service: "poolsafe-portal",
    version: process.env.npm_package_version || "1.0.0",
  },
  transports: [
    errorFileTransport,
    combinedFileTransport,
    ...(process.env.NODE_ENV === "production" ? [] : [consoleTransport]),
  ],
  exitOnError: false,
});

// Add console transport in production if needed for debugging
if (process.env.NODE_ENV === "production" && process.env.ENABLE_CONSOLE_LOGS === "true") {
  logger.add(consoleTransport);
}

// Handle uncaught exceptions and unhandled rejections
logger.exceptions.handle(new winston.transports.File({ filename: "logs/exceptions.log" }));

logger.rejections.handle(new winston.transports.File({ filename: "logs/rejections.log" }));

// Audit log for security events
export const auditLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new DailyRotateFile({
      filename: "logs/audit-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "90d", // Keep audit logs longer
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),
  ],
});

// Performance log for monitoring response times
export const performanceLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new DailyRotateFile({
      filename: "logs/performance-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "50m",
      maxFiles: "7d",
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),
  ],
});

// Security events logger
export const securityLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new DailyRotateFile({
      filename: "logs/security-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "90d", // Keep security logs longer
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),
  ],
});

// Helper functions for structured logging
export const logHelpers = {
  // Log authentication events
  logAuth: (
    event: string,
    userId?: string,
    ip?: string,
    userAgent?: string,
    success: boolean = true,
  ) => {
    const logData = {
      event,
      userId,
      ip,
      userAgent,
      success,
      timestamp: new Date().toISOString(),
      type: "authentication",
    };

    auditLogger.info("Authentication Event", logData);
    securityLogger.info("Authentication Event", logData);

    if (!success) {
      logger.warn(`Failed authentication attempt: ${event}`, logData);
    }
  },

  // Log API requests
  logRequest: (
    method: string,
    url: string,
    userId?: string,
    responseTime?: number,
    statusCode?: number,
  ) => {
    const logData = {
      method,
      url,
      userId,
      responseTime,
      statusCode,
      timestamp: new Date().toISOString(),
      type: "api_request",
    };

    if (responseTime) {
      performanceLogger.info("API Request", logData);
    }

    if (statusCode && statusCode >= 400) {
      logger.warn(`API Error: ${method} ${url}`, logData);
    } else {
      logger.info(`API Request: ${method} ${url}`, logData);
    }
  },

  // Log security events
  logSecurity: (
    event: string,
    details: any,
    severity: "low" | "medium" | "high" | "critical" = "medium",
  ) => {
    const logData = {
      event,
      details,
      severity,
      timestamp: new Date().toISOString(),
      type: "security_event",
    };

    securityLogger.info("Security Event", logData);

    switch (severity) {
      case "critical":
        logger.error(`CRITICAL SECURITY EVENT: ${event}`, logData);
        break;
      case "high":
        logger.error(`HIGH SECURITY EVENT: ${event}`, logData);
        break;
      case "medium":
        logger.warn(`MEDIUM SECURITY EVENT: ${event}`, logData);
        break;
      case "low":
        logger.info(`LOW SECURITY EVENT: ${event}`, logData);
        break;
    }
  },

  // Log business events
  logBusiness: (
    event: string,
    entityType: string,
    entityId: string,
    userId?: string,
    details?: any,
  ) => {
    const logData = {
      event,
      entityType,
      entityId,
      userId,
      details,
      timestamp: new Date().toISOString(),
      type: "business_event",
    };

    auditLogger.info("Business Event", logData);
    logger.info(`Business Event: ${event}`, logData);
  },

  // Log database operations
  logDatabase: (
    operation: string,
    table: string,
    recordId?: string,
    userId?: string,
    executionTime?: number,
  ) => {
    const logData = {
      operation,
      table,
      recordId,
      userId,
      executionTime,
      timestamp: new Date().toISOString(),
      type: "database_operation",
    };

    if (executionTime && executionTime > 1000) {
      performanceLogger.warn("Slow Database Query", logData);
    }

    logger.debug(`Database Operation: ${operation} on ${table}`, logData);
  },
};

// Export default logger
export default logger;
