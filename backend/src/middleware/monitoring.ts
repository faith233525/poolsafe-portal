import { Request, Response, NextFunction } from "express";
import { getPrismaClient } from "../prismaClient";
import { logger } from "./logger";

// Performance metrics storage
interface PerformanceMetric {
  timestamp: Date;
  method: string;
  path: string;
  responseTime: number;
  statusCode: number;
  userId?: string;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface SystemAlert {
  id: string;
  type: "performance" | "error" | "security" | "resource";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  timestamp: Date;
  resolved: boolean;
  metadata?: Record<string, any>;
}

// In-memory storage for real-time metrics
const performanceMetrics: PerformanceMetric[] = [];
const activeAlerts: SystemAlert[] = [];
const errorRates = new Map<string, { errors: number; total: number; windowStart: number }>();

// Configuration thresholds
const MONITORING_CONFIG = {
  RESPONSE_TIME_THRESHOLD: 5000, // 5 seconds
  ERROR_RATE_THRESHOLD: 0.05, // 5%
  MEMORY_THRESHOLD: 0.85, // 85% of available memory
  CPU_THRESHOLD: 0.8, // 80% CPU usage
  METRICS_RETENTION_HOURS: 24,
  ALERT_COOLDOWN_MINUTES: 15,
};

// Performance monitoring middleware
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const _startMemory = process.memoryUsage();
  const startCpu = process.cpuUsage();

  // Override res.end to capture response time
  const originalEnd = res.end.bind(res);
  res.end = function (this: Response, ...args: any[]) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const endMemory = process.memoryUsage();
    const endCpu = process.cpuUsage(startCpu);

    // Calculate CPU usage percentage (rough estimate)
    const cpuUsage = (endCpu.user + endCpu.system) / 1000000; // Convert to seconds

    // Calculate memory usage percentage
    const memoryUsage = endMemory.heapUsed / endMemory.heapTotal;

    // Store performance metric
    const metric: PerformanceMetric = {
      timestamp: new Date(),
      method: req.method,
      path: req.route?.path || req.path,
      responseTime,
      statusCode: res.statusCode,
      userId: (req as any).user?.id,
      errorRate: calculateErrorRate(req.path, res.statusCode),
      memoryUsage,
      cpuUsage,
    };

    performanceMetrics.push(metric);

    // Check for performance alerts
    checkPerformanceAlerts(metric);

    // Log slow requests
    if (responseTime > MONITORING_CONFIG.RESPONSE_TIME_THRESHOLD) {
      logger.warn(`Slow request detected: ${req.method} ${req.path} - ${responseTime}ms`);
    }

    // Clean up old metrics
    cleanupOldMetrics();

    return originalEnd.apply(this, args as any);
  };

  next();
};

// Calculate error rate for a given endpoint
function calculateErrorRate(path: string, statusCode: number): number {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5-minute window

  if (!errorRates.has(path)) {
    errorRates.set(path, { errors: 0, total: 0, windowStart: now });
  }

  const stats = errorRates.get(path)!;

  // Reset window if it's been too long
  if (now - stats.windowStart > windowMs) {
    stats.errors = 0;
    stats.total = 0;
    stats.windowStart = now;
  }

  stats.total++;
  if (statusCode >= 400) {
    stats.errors++;
  }

  return stats.total > 0 ? stats.errors / stats.total : 0;
}

// Check for various performance alerts
function checkPerformanceAlerts(metric: PerformanceMetric) {
  const alerts: SystemAlert[] = [];

  // Response time alert
  if (metric.responseTime > MONITORING_CONFIG.RESPONSE_TIME_THRESHOLD) {
    alerts.push({
      id: `perf-${Date.now()}`,
      type: "performance",
      severity: metric.responseTime > 10000 ? "critical" : "high",
      message: `High response time detected: ${metric.responseTime}ms for ${metric.method} ${metric.path}`,
      timestamp: new Date(),
      resolved: false,
      metadata: { metric },
    });
  }

  // Error rate alert
  if (metric.errorRate > MONITORING_CONFIG.ERROR_RATE_THRESHOLD) {
    alerts.push({
      id: `error-rate-${Date.now()}`,
      type: "error",
      severity: metric.errorRate > 0.2 ? "critical" : "high",
      message: `High error rate detected: ${(metric.errorRate * 100).toFixed(2)}% for ${metric.path}`,
      timestamp: new Date(),
      resolved: false,
      metadata: { errorRate: metric.errorRate, path: metric.path },
    });
  }

  // Memory usage alert
  if (metric.memoryUsage > MONITORING_CONFIG.MEMORY_THRESHOLD) {
    alerts.push({
      id: `memory-${Date.now()}`,
      type: "resource",
      severity: metric.memoryUsage > 0.95 ? "critical" : "high",
      message: `High memory usage detected: ${(metric.memoryUsage * 100).toFixed(2)}%`,
      timestamp: new Date(),
      resolved: false,
      metadata: { memoryUsage: metric.memoryUsage },
    });
  }

  // Add alerts (with cooldown to prevent spam)
  for (const alert of alerts) {
    addAlertWithCooldown(alert);
  }
}

// Add alert with cooldown to prevent spam
function addAlertWithCooldown(alert: SystemAlert) {
  const cooldownMs = MONITORING_CONFIG.ALERT_COOLDOWN_MINUTES * 60 * 1000;
  const now = Date.now();

  // Check if similar alert exists within cooldown period
  const similarAlert = activeAlerts.find(
    (existing) =>
      existing.type === alert.type &&
      existing.severity === alert.severity &&
      !existing.resolved &&
      now - existing.timestamp.getTime() < cooldownMs,
  );

  if (!similarAlert) {
    activeAlerts.push(alert);
    logger.error(`System Alert [${alert.severity.toUpperCase()}]: ${alert.message}`);

    // Store critical alerts in database
    if (alert.severity === "critical") {
      void storeCriticalAlert(alert);
    }
  }
}

// Store critical alerts in database for persistence
async function storeCriticalAlert(alert: SystemAlert) {
  try {
    const prisma = getPrismaClient();
    await prisma.notification.create({
      data: {
        userId: null,
        recipientEmail: null,
        title: `Critical System Alert: ${alert.type.toUpperCase()}`,
        message: `${alert.message} - Severity: ${alert.severity}`,
        type: "SYSTEM_ALERT",
        relatedId: alert.id,
        relatedType: "monitoring",
      },
    });
  } catch {
    logger.error("Failed to store critical alert in database");
  }
}

// Clean up old metrics to prevent memory leaks
function cleanupOldMetrics() {
  const retentionMs = MONITORING_CONFIG.METRICS_RETENTION_HOURS * 60 * 60 * 1000;
  const cutoffTime = Date.now() - retentionMs;

  // Remove old performance metrics
  for (let i = performanceMetrics.length - 1; i >= 0; i--) {
    if (performanceMetrics[i].timestamp.getTime() < cutoffTime) {
      performanceMetrics.splice(i, 1);
    }
  }

  // Remove old resolved alerts
  for (let i = activeAlerts.length - 1; i >= 0; i--) {
    if (activeAlerts[i].resolved && activeAlerts[i].timestamp.getTime() < cutoffTime) {
      activeAlerts.splice(i, 1);
    }
  }
}

// Health check middleware for system status
export const healthCheck = (req: Request, res: Response) => {
  const systemHealth = {
    status: "healthy",
    timestamp: new Date(),
    uptime: process.uptime(),
    memory: {
      used: process.memoryUsage().heapUsed,
      total: process.memoryUsage().heapTotal,
      percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
    },
    activeAlerts: activeAlerts.filter((alert) => !alert.resolved),
    recentMetrics: {
      totalRequests: performanceMetrics.length,
      averageResponseTime: calculateAverageResponseTime(),
      errorRate: calculateOverallErrorRate(),
    },
  };

  // Determine overall health status
  const criticalAlerts = activeAlerts.filter(
    (alert) => !alert.resolved && (alert.severity === "critical" || alert.severity === "high"),
  );

  if (criticalAlerts.length > 0) {
    systemHealth.status = "degraded";
  }

  if (
    systemHealth.memory.percentage > 90 ||
    criticalAlerts.some((a) => a.severity === "critical")
  ) {
    systemHealth.status = "unhealthy";
  }

  const statusCode =
    systemHealth.status === "healthy" ? 200 : systemHealth.status === "degraded" ? 206 : 503;

  res.status(statusCode).json(systemHealth);
};

// Calculate average response time from recent metrics
function calculateAverageResponseTime(): number {
  if (performanceMetrics.length === 0) {
    return 0;
  }

  const recentMetrics = performanceMetrics.slice(-100); // Last 100 requests
  const totalTime = recentMetrics.reduce((sum, metric) => sum + metric.responseTime, 0);
  return Math.round(totalTime / recentMetrics.length);
}

// Calculate overall error rate
function calculateOverallErrorRate(): number {
  if (performanceMetrics.length === 0) {
    return 0;
  }

  const recentMetrics = performanceMetrics.slice(-100); // Last 100 requests
  const errors = recentMetrics.filter((metric) => metric.statusCode >= 400).length;
  return errors / recentMetrics.length;
}

// Get monitoring dashboard data
export const getMonitoringData = (req: Request, res: Response) => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Filter recent metrics
  const recentMetrics = performanceMetrics.filter((metric) => metric.timestamp > oneHourAgo);

  // Group metrics by endpoint
  const endpointStats = recentMetrics.reduce(
    (acc, metric) => {
      const key = `${metric.method} ${metric.path}`;
      if (!acc[key]) {
        acc[key] = {
          requests: 0,
          totalResponseTime: 0,
          errors: 0,
          avgResponseTime: 0,
          errorRate: 0,
        };
      }

      // Prevent prototype pollution by checking if key exists and is safe
      if (Object.prototype.hasOwnProperty.call(acc, key)) {
        acc[key].requests++;
        acc[key].totalResponseTime += metric.responseTime;
        if (metric.statusCode >= 400) {
          acc[key].errors++;
        }
      }

      return acc;
    },
    {} as Record<string, any>,
  );

  // Calculate averages
  Object.keys(endpointStats).forEach((key) => {
    // Prevent prototype pollution by checking if key exists and is safe
    if (Object.prototype.hasOwnProperty.call(endpointStats, key)) {
      const stats = endpointStats[key];
      stats.avgResponseTime = Math.round(stats.totalResponseTime / stats.requests);
      stats.errorRate = (stats.errors / stats.requests) * 100;
    }
  });

  // System resource trends (last hour, 5-minute intervals)
  const resourceTrends = generateResourceTrends(recentMetrics);

  const dashboard = {
    summary: {
      totalRequests: recentMetrics.length,
      avgResponseTime: calculateAverageResponseTime(),
      errorRate: calculateOverallErrorRate() * 100,
      activeAlerts: activeAlerts.filter((a) => !a.resolved).length,
    },
    endpointStats,
    resourceTrends,
    alerts: activeAlerts.filter((a) => !a.resolved).slice(-20), // Last 20 active alerts
    systemInfo: {
      uptime: process.uptime(),
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    },
  };

  res.json(dashboard);
};

// Generate resource usage trends
function generateResourceTrends(metrics: PerformanceMetric[]) {
  const intervals = 12; // 5-minute intervals over 1 hour
  const intervalMs = 5 * 60 * 1000; // 5 minutes
  const now = Date.now();

  const trends = {
    responseTime: [] as { timestamp: string; value: number }[],
    memoryUsage: [] as { timestamp: string; value: number }[],
    requestRate: [] as { timestamp: string; value: number }[],
  };

  for (let i = intervals - 1; i >= 0; i--) {
    const intervalStart = now - (i + 1) * intervalMs;
    const intervalEnd = now - i * intervalMs;
    const timestamp = new Date(intervalEnd).toISOString();

    const intervalMetrics = metrics.filter(
      (m) => m.timestamp.getTime() >= intervalStart && m.timestamp.getTime() < intervalEnd,
    );

    // Average response time for interval
    const avgResponseTime =
      intervalMetrics.length > 0
        ? intervalMetrics.reduce((sum, m) => sum + m.responseTime, 0) / intervalMetrics.length
        : 0;

    // Average memory usage for interval
    const avgMemoryUsage =
      intervalMetrics.length > 0
        ? (intervalMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / intervalMetrics.length) *
          100
        : 0;

    // Request rate (requests per minute)
    const requestRate = intervalMetrics.length / 5; // 5-minute interval

    trends.responseTime.push({ timestamp, value: Math.round(avgResponseTime) });
    trends.memoryUsage.push({ timestamp, value: Math.round(avgMemoryUsage * 100) / 100 });
    trends.requestRate.push({ timestamp, value: Math.round(requestRate * 100) / 100 });
  }

  return trends;
}

// Resolve alert by ID
export const resolveAlert = async (req: Request, res: Response) => {
  const { alertId } = req.params;
  const user = (req as any).user;

  const alert = activeAlerts.find((a) => a.id === alertId);
  if (!alert) {
    return res.status(404).json({ error: "Alert not found" });
  }

  alert.resolved = true;

  // Log alert resolution
  logger.info(`Alert resolved by user ${user?.id}: ${alert.message}`);

  // Store resolution in notification log
  try {
    const prisma = getPrismaClient();
    await prisma.notification.create({
      data: {
        userId: user?.id || null,
        recipientEmail: null,
        title: "Alert Resolved",
        message: `${alert.type} alert resolved: ${alert.message}`,
        type: "ALERT_RESOLUTION",
        relatedId: alertId,
        relatedType: "monitoring",
      },
    });
  } catch {
    logger.error("Failed to log alert resolution");
  }

  res.json({ success: true, message: "Alert resolved successfully" });
};

// Export monitoring utilities for testing
export const monitoringUtils = {
  getActiveAlerts: () => activeAlerts.filter((a) => !a.resolved),
  getPerformanceMetrics: () => performanceMetrics,
  clearMetrics: () => {
    performanceMetrics.length = 0;
    activeAlerts.length = 0;
    errorRates.clear();
  },
};
