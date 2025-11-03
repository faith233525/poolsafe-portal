import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken, AuthenticatedRequest } from "../utils/auth";
import rateLimit from "express-rate-limit";
import { emailService } from "../lib/emailService";

const router = Router();
const prisma = new PrismaClient();

// Rate limiting for error reporting
const errorReportLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 error reports per windowMs
  message: "Too many error reports, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    (req.headers["x-bypass-ratelimit"] as string) === "true" ||
    (typeof req.headers["user-agent"] === "string" &&
      req.headers["user-agent"].includes("Cypress/")) ||
    process.env.NODE_ENV === "test" ||
    process.env.CI === "true",
});

interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  context: {
    userId?: string;
    route?: string;
    userAgent?: string;
    timestamp?: string;
    errorInfo?: any;
    type?: string;
    severity?: "low" | "medium" | "high" | "critical";
    tags?: string[];
    metadata?: Record<string, any>;
  };
  count: number;
  firstSeen: string;
  lastSeen: string;
}

// POST /api/errors - Report a new error
router.post("/", errorReportLimit, async (req: Request, res: Response) => {
  try {
    const errorReport: ErrorReport = req.body;

    // Validate required fields
    if (!errorReport.id || !errorReport.message) {
      return res.status(400).json({
        error: "Missing required fields: id and message are required",
      });
    }

    // Check if error already exists
    const existingError = await prisma.errorLog.findUnique({
      where: { errorId: errorReport.id },
    });

    const clientIp = req.ip || req.socket.remoteAddress || "unknown";

    if (existingError) {
      // Update existing error
      await prisma.errorLog.update({
        where: { errorId: errorReport.id },
        data: {
          count: existingError.count + errorReport.count,
          lastSeen: errorReport.lastSeen,
          context: JSON.stringify(errorReport.context),
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new error record
      await prisma.errorLog.create({
        data: {
          errorId: errorReport.id,
          message: errorReport.message,
          stack: errorReport.stack,
          context: JSON.stringify(errorReport.context),
          count: errorReport.count,
          firstSeen: errorReport.firstSeen,
          lastSeen: errorReport.lastSeen,
          severity: errorReport.context.severity || "medium",
          type: errorReport.context.type || "unknown",
          ipAddress: clientIp,
          userAgent: req.get("User-Agent") || "unknown",
        },
      });
    }

    // Log and email critical errors immediately
    if (errorReport.context.severity === "critical") {
      console.error("CRITICAL ERROR REPORTED:", {
        id: errorReport.id,
        message: errorReport.message,
        context: errorReport.context,
        stack: errorReport.stack,
      });

      // Send email alert to support admin
      const supportEmail = process.env.SUPPORT_ADMIN_EMAIL || "support@poolsafe.com";
      await emailService.sendNotification(
        { to: supportEmail },
        {
          title: `CRITICAL ERROR: ${errorReport.message}`,
          message:
            `A critical error was reported in the Pool Safe Inc Portal.\n\n` +
            `Error ID: ${errorReport.id}\n` +
            `Message: ${errorReport.message}\n` +
            `Severity: ${errorReport.context.severity}\n` +
            `Type: ${errorReport.context.type || "unknown"}\n` +
            `Route: ${errorReport.context.route || "unknown"}\n` +
            `Timestamp: ${errorReport.context.timestamp || new Date().toISOString()}\n` +
            `User ID: ${errorReport.context.userId || "unknown"}\n` +
            `Stack: ${errorReport.stack || "(none)"}`,
          type: "error",
          actionUrl: "https://poolsafe.com/admin/errors",
          actionText: "View Error Dashboard",
        },
      );
    }

    res.status(200).json({ success: true, message: "Error reported successfully" });
  } catch (error) {
    console.error("Failed to store error report:", error);
    res.status(500).json({
      error: "Failed to store error report",
      details: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
});

// GET /api/errors - Get error reports (admin only)
router.get("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = (req as any).user;

    // Only allow admins and staff to view error reports
    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { page = 1, limit = 50, severity, type, startDate, endDate, search } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (severity) {
      where.severity = severity;
    }

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    if (search) {
      where.OR = [
        { message: { contains: search as string, mode: "insensitive" } },
        { errorId: { contains: search as string, mode: "insensitive" } },
      ];
    }

    // Get errors with pagination
    const [errors, total] = await Promise.all([
      prisma.errorLog.findMany({
        where,
        orderBy: { lastSeen: "desc" },
        skip: offset,
        take: limitNum,
      }),
      prisma.errorLog.count({ where }),
    ]);

    // Parse context JSON
    const processedErrors = errors.map((error) => ({
      ...error,
      context: error.context ? JSON.parse(error.context) : {},
    }));

    res.json({
      errors: processedErrors,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Failed to fetch error reports:", error);
    res.status(500).json({
      error: "Failed to fetch error reports",
      details: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
});

// GET /api/errors/stats - Get error statistics (admin only)
router.get("/stats", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = (req as any).user;

    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { days = 7 } = req.query;
    const daysNum = parseInt(days as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    // Get error statistics
    const [totalErrors, recentErrors, errorsBySeverity, errorsByType, topErrors] =
      await Promise.all([
        // Total error count
        prisma.errorLog.count(),

        // Recent errors (last N days)
        prisma.errorLog.count({
          where: { createdAt: { gte: startDate } },
        }),

        // Errors by severity
        prisma.errorLog.groupBy({
          by: ["severity"],
          _count: { _all: true },
          _sum: { count: true },
        }),

        // Errors by type
        prisma.errorLog.groupBy({
          by: ["type"],
          _count: { _all: true },
          _sum: { count: true },
          orderBy: { _sum: { count: "desc" } },
          take: 10,
        }),

        // Top 10 most frequent errors
        prisma.errorLog.findMany({
          orderBy: { count: "desc" },
          take: 10,
          select: {
            errorId: true,
            message: true,
            count: true,
            severity: true,
            type: true,
            lastSeen: true,
          },
        }),
      ]);

    // Error trend (daily counts for the period)
    const dailyErrors = await prisma.errorLog.groupBy({
      by: ["createdAt"],
      where: { createdAt: { gte: startDate } },
      _count: { _all: true },
      orderBy: { createdAt: "asc" },
    });

    // Process daily errors into a more useful format
    const errorTrend = [];
    for (let i = 0; i < daysNum; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (daysNum - 1 - i));
      const dateStr = date.toISOString().split("T")[0];

      const dayErrors = dailyErrors.filter(
        (e) => e.createdAt.toISOString().split("T")[0] === dateStr,
      );

      errorTrend.push({
        date: dateStr,
        count: dayErrors.reduce((sum, e) => sum + e._count._all, 0),
      });
    }

    res.json({
      summary: {
        totalErrors,
        recentErrors,
        period: `${daysNum} days`,
      },
      bySeverity: errorsBySeverity.map((item) => ({
        severity: item.severity,
        uniqueErrors: item._count._all,
        totalOccurrences: item._sum.count || 0,
      })),
      byType: errorsByType.map((item) => ({
        type: item.type,
        uniqueErrors: item._count._all,
        totalOccurrences: item._sum.count || 0,
      })),
      topErrors,
      trend: errorTrend,
    });
  } catch (error) {
    console.error("Failed to fetch error statistics:", error);
    res.status(500).json({
      error: "Failed to fetch error statistics",
      details: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
});

// DELETE /api/errors - Clear all error reports (admin only)
router.delete("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = (req as any).user;

    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const { olderThan } = req.query;

    let where = {};
    if (olderThan) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThan as string));
      where = { createdAt: { lt: cutoffDate } };
    }

    const result = await prisma.errorLog.deleteMany({ where });

    res.json({
      success: true,
      message: `Deleted ${result.count} error reports`,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error("Failed to delete error reports:", error);
    res.status(500).json({
      error: "Failed to delete error reports",
      details: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
});

export default router;
