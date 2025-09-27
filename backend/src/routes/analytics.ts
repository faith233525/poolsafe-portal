import { Router } from "express";
import { prisma } from "../prismaClient";
import { authenticateToken, requireSupport, AuthenticatedRequest } from "../utils/auth";
import { AnalyticsService } from "../services/analyticsService";
import { ActivityLogger } from "../services/activityLogger";

export const analyticsRouter = Router();

// Apply authentication to all routes
analyticsRouter.use(authenticateToken);

// Get dashboard overview statistics (Support/Admin only)
analyticsRouter.get("/dashboard", requireSupport, async (req: AuthenticatedRequest, res) => {
  try {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Basic counts
    const [
      totalPartners,
      totalTickets,
      totalUsers,
      totalKnowledgeArticles,
      recentTickets,
      openTickets,
      resolvedTickets,
      highPriorityTickets,
    ] = await Promise.all([
      prisma.partner.count(),
      prisma.ticket.count(),
      prisma.user.count(),
      prisma.knowledgeBase.count({ where: { isPublished: true } }),
      prisma.ticket.count({ where: { createdAt: { gte: last30Days } } }),
      prisma.ticket.count({ where: { status: "OPEN" } }),
      prisma.ticket.count({ where: { status: "RESOLVED" } }),
      prisma.ticket.count({ where: { priority: "HIGH" } }),
    ]);

    // Distribution statistics
    const [partnersByCountry, ticketsByCategory, ticketsByStatus] = await Promise.all([
      prisma.partner.groupBy({
        by: ["country"],
        _count: { country: true },
        orderBy: { _count: { country: "desc" } },
        take: 10,
      }),
      prisma.ticket.groupBy({
        by: ["category"],
        _count: { category: true },
        orderBy: { _count: { category: "desc" } },
      }),
      prisma.ticket.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
    ]);

    // Recent activity and top content
    const [recentUsers, topArticles, serviceRecordStats] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: last7Days } } }),
      prisma.knowledgeBase.findMany({
        where: { isPublished: true },
        orderBy: [{ viewCount: "desc" }, { rating: "desc" }],
        take: 5,
        select: {
          id: true,
          title: true,
          viewCount: true,
          rating: true,
          category: true,
        },
      }),
      prisma.serviceRecord.groupBy({
        by: ["serviceType"],
        _count: { serviceType: true },
      }),
    ]);

    // Calculate average resolution time
    const resolvedTicketsWithTime = await prisma.ticket.findMany({
      where: {
        status: "RESOLVED",
        resolutionTime: { not: null },
      },
      select: {
        resolutionTime: true,
      },
    });

    const avgResolutionHours =
      resolvedTicketsWithTime.length > 0
        ? resolvedTicketsWithTime.reduce((sum, ticket) => {
            return sum + (ticket.resolutionTime || 0);
          }, 0) / resolvedTicketsWithTime.length
        : 0;

    // Monthly ticket trend
    const monthlyTickets = await prisma.ticket.findMany({
      where: {
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth() - 11, 1),
        },
      },
      select: {
        createdAt: true,
        status: true,
      },
    });

    // Group by month
    const monthlyTrend = monthlyTickets.reduce(
      (acc, ticket) => {
        const month = ticket.createdAt.toISOString().substring(0, 7);
        if (!acc[month]) {
          acc[month] = { total: 0, resolved: 0 };
        }
        acc[month].total++;
        if (ticket.status === "RESOLVED") {
          acc[month].resolved++;
        }
        return acc;
      },
      {} as Record<string, { total: number; resolved: number }>,
    );

    const trendData = Object.entries(monthlyTrend)
      .map(([month, data]) => ({
        month,
        total: data.total,
        resolved: data.resolved,
        resolutionRate: data.total > 0 ? ((data.resolved / data.total) * 100).toFixed(1) : "0",
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      overview: {
        totalPartners,
        totalTickets,
        totalUsers,
        totalKnowledgeArticles,
        recentTickets,
        openTickets,
        resolvedTickets,
        highPriorityTickets,
        recentUsers,
        avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
      },
      distributions: {
        partnersByCountry: partnersByCountry.map((p) => ({
          country: p.country || "Unknown",
          count: p._count.country,
        })),
        ticketsByCategory: ticketsByCategory.map((t) => ({
          category: t.category,
          count: t._count.category,
        })),
        ticketsByStatus: ticketsByStatus.map((t) => ({
          status: t.status,
          count: t._count.status,
        })),
        serviceRecordsByType: serviceRecordStats.map((s) => ({
          type: s.serviceType,
          count: s._count.serviceType,
        })),
      },
      trends: {
        monthly: trendData,
      },
      topContent: {
        articles: topArticles,
      },
    });
  } catch (error) {
    console.error("Error fetching analytics dashboard:", error);
    res.status(500).json({ error: "Failed to fetch analytics dashboard" });
  }
});

// Get detailed ticket analytics (Support/Admin only)
analyticsRouter.get("/tickets", requireSupport, async (req: AuthenticatedRequest, res) => {
  try {
    const { period = "30", category, priority, assignedTo } = req.query;
    const daysBack = parseInt(period as string);
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    const where: any = {
      createdAt: { gte: startDate },
    };

    if (category) {where.category = category;}
    if (priority) {where.priority = priority;}
    if (assignedTo) {where.assignedToId = assignedTo;}

    // Detailed ticket statistics
    const [totalTickets, byStatus, byCategory, byPriority] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.groupBy({
        by: ["status"],
        where,
        _count: { status: true },
      }),
      prisma.ticket.groupBy({
        by: ["category"],
        where,
        _count: { category: true },
        orderBy: { _count: { category: "desc" } },
      }),
      prisma.ticket.groupBy({
        by: ["priority"],
        where,
        _count: { priority: true },
      }),
    ]);

    // Top assignees by ticket count
    const topAssignees = await prisma.ticket.groupBy({
      by: ["assignedToId"],
      where: {
        ...where,
        assignedToId: { not: null },
      },
      _count: { assignedToId: true },
      orderBy: { _count: { assignedToId: "desc" } },
      take: 10,
    });

    // Get assignee details
    const assigneeIds = topAssignees
      .map((a) => a.assignedToId)
      .filter((id) => id !== null);

    const assigneeDetails =
      assigneeIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: assigneeIds } },
            select: { id: true, displayName: true, email: true },
          })
        : [];

    const enrichedAssignees = topAssignees.map((assignee) => {
      const user = assigneeDetails.find((u) => u.id === assignee.assignedToId);
      return {
        assigneeId: assignee.assignedToId,
        name: user?.displayName || user?.email || "Unknown",
        ticketCount: assignee._count.assignedToId,
      };
    });

    res.json({
      summary: {
        totalTickets,
        period: `${daysBack} days`,
      },
      distributions: {
        byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.status })),
        byCategory: byCategory.map((c) => ({ category: c.category, count: c._count.category })),
        byPriority: byPriority.map((p) => ({ priority: p.priority, count: p._count.priority })),
      },
      performance: {
        topAssignees: enrichedAssignees,
      },
    });
  } catch (error) {
    console.error("Error fetching ticket analytics:", error);
    res.status(500).json({ error: "Failed to fetch ticket analytics" });
  }
});

// Get partner analytics (Support/Admin only)
analyticsRouter.get("/partners", requireSupport, async (req: AuthenticatedRequest, res) => {
  try {
    const [totalPartners, partnersByCountry, partnersByState, colorDistribution, recentPartners] =
      await Promise.all([
        prisma.partner.count(),
        prisma.partner.groupBy({
          by: ["country"],
          _count: { country: true },
          orderBy: { _count: { country: "desc" } },
        }),
        prisma.partner.groupBy({
          by: ["state"],
          _count: { state: true },
          orderBy: { _count: { state: "desc" } },
          take: 10,
        }),
        prisma.partner.groupBy({
          by: ["topColour"],
          _count: { topColour: true },
          orderBy: { _count: { topColour: "desc" } },
        }),
        prisma.partner.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

    // Calculate unit distribution
    const unitData = await prisma.partner.findMany({
      select: { numberOfLoungeUnits: true },
    });

    const units = unitData.map((p) => p.numberOfLoungeUnits || 0);
    const unitStats = {
      total: units.reduce((sum, count) => sum + count, 0),
      average: units.length > 0 ? units.reduce((sum, count) => sum + count, 0) / units.length : 0,
      distribution: [
        { range: "1-5", count: units.filter((u) => u >= 1 && u <= 5).length },
        { range: "6-10", count: units.filter((u) => u >= 6 && u <= 10).length },
        { range: "11-20", count: units.filter((u) => u >= 11 && u <= 20).length },
        { range: "21-50", count: units.filter((u) => u >= 21 && u <= 50).length },
        { range: "50+", count: units.filter((u) => u > 50).length },
      ],
    };

    res.json({
      summary: {
        totalPartners,
        recentPartners,
        unitStats,
      },
      geographic: {
        byCountry: partnersByCountry.map((p) => ({
          country: p.country || "Unknown",
          count: p._count.country,
        })),
        byState: partnersByState.map((p) => ({
          state: p.state || "Unknown",
          count: p._count.state,
        })),
      },
      preferences: {
        topColors: colorDistribution.map((c) => ({
          color: c.topColour || "Unknown",
          count: c._count.topColour,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching partner analytics:", error);
    res.status(500).json({ error: "Failed to fetch partner analytics" });
  }
});

// Get user activity analytics (Support/Admin only)
analyticsRouter.get("/users", requireSupport, async (req: AuthenticatedRequest, res) => {
  try {
    const [usersByRole, recentActivity] = await Promise.all([
      prisma.user.groupBy({
        by: ["role"],
        _count: { role: true },
      }),
      prisma.user.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        select: {
          createdAt: true,
          role: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    res.json({
      summary: {
        byRole: usersByRole.map((u) => ({
          role: u.role,
          count: u._count.role,
        })),
        recentActivity: recentActivity.length,
      },
    });
  } catch (error) {
    console.error("Error fetching user analytics:", error);
    res.status(500).json({ error: "Failed to fetch user analytics" });
  }
});

// Export analytics data (Support/Admin only)
analyticsRouter.get("/export", requireSupport, async (req: AuthenticatedRequest, res) => {
  try {
    const { type, format = "json" } = req.query;

    let data: any = {};

    switch (type) {
      case "tickets":
        data = await prisma.ticket.findMany({
          include: {
            partner: {
              select: { companyName: true, country: true },
            },
            assignedTo: {
              select: { displayName: true, email: true },
            },
          },
        });
        break;
      case "partners":
        data = await prisma.partner.findMany();
        break;
      case "users":
        data = await prisma.user.findMany({
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
            createdAt: true,
            partner: {
              select: { companyName: true },
            },
          },
        });
        break;
      default:
        return res.status(400).json({ error: "Invalid export type" });
    }

    if (format === "csv") {
      const csv = convertToCSV(data);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${type}-export.csv"`);
      res.send(csv);
    } else {
      res.json(data);
    }
  } catch (error) {
    console.error("Error exporting analytics data:", error);
    res.status(500).json({ error: "Failed to export data" });
  }
});

// Enhanced dashboard analytics with activity logging
analyticsRouter.get("/enhanced-dashboard", requireSupport, async (req: AuthenticatedRequest, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const analytics = await AnalyticsService.getDashboardAnalytics(days);
    
    // Log analytics access
    await ActivityLogger.log({
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'VIEW_ENHANCED_DASHBOARD',
      details: { timeRange: `${days} days` },
    }, req);

    res.json(analytics);
  } catch (error) {
    console.error('Error getting enhanced dashboard analytics:', error);
    res.status(500).json({ error: 'Failed to get enhanced dashboard analytics' });
  }
});

// Get activity logs with pagination and filtering
analyticsRouter.get("/activity-logs", requireSupport, async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const action = req.query.action as string;
    const userRole = req.query.userRole as string;
    const success = req.query.success === 'true' ? true : req.query.success === 'false' ? false : undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (action) where.action = action;
    if (userRole) where.userRole = userRole;
    if (success !== undefined) where.success = success;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userEmail: true,
          userRole: true,
          action: true,
          entityType: true,
          success: true,
          createdAt: true,
          details: true,
          ipAddress: true,
          errorMessage: true,
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    // Log activity log access
    await ActivityLogger.log({
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'VIEW_ACTIVITY_LOGS',
      details: { page, limit, filters: { action, userRole, success, startDate, endDate } },
    }, req);

    res.json({
      logs: logs.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : null,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error getting activity logs:', error);
    res.status(500).json({ error: 'Failed to get activity logs' });
  }
});

// Get activity statistics
analyticsRouter.get("/activity-stats", requireSupport, async (req: AuthenticatedRequest, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const stats = await ActivityLogger.getActivityStats(days);

    // Log stats access
    await ActivityLogger.log({
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'VIEW_ACTIVITY_STATS',
      details: { timeRange: `${days} days` },
    }, req);

    res.json(stats);
  } catch (error) {
    console.error('Error getting activity stats:', error);
    res.status(500).json({ error: 'Failed to get activity statistics' });
  }
});

// Get security alerts (failed login attempts, suspicious activity)
analyticsRouter.get("/security-alerts", requireSupport, async (req: AuthenticatedRequest, res) => {
  try {
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const [failedLogins, suspiciousActivity] = await Promise.all([
      prisma.activityLog.findMany({
        where: {
          action: 'LOGIN',
          success: false,
          createdAt: { gte: last24Hours },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          userEmail: true,
          ipAddress: true,
          createdAt: true,
          errorMessage: true,
        },
      }),
      prisma.activityLog.groupBy({
        by: ['ipAddress'],
        where: {
          action: 'LOGIN',
          success: false,
          createdAt: { gte: last24Hours },
          ipAddress: { not: null },
        },
        _count: true,
        having: {
          ipAddress: {
            _count: {
              gte: 5, // 5 or more failed attempts from same IP
            },
          },
        },
      }),
    ]);

    // Log security alert access
    await ActivityLogger.log({
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action: 'VIEW_SECURITY_ALERTS',
    }, req);

    res.json({
      failedLogins,
      suspiciousIPs: suspiciousActivity.map(item => ({
        ipAddress: item.ipAddress,
        failedAttempts: item._count,
      })),
    });
  } catch (error) {
    console.error('Error getting security alerts:', error);
    res.status(500).json({ error: 'Failed to get security alerts' });
  }
});

// Helper function to convert to CSV
function convertToCSV(data: any[]): string {
  if (data.length === 0) {return "";}

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          const strValue =
            typeof value === "object" && value !== null
              ? JSON.stringify(value)
              : String(value || "");
          return strValue.includes(",") || strValue.includes('"')
            ? `"${strValue.replace(/"/g, '""')}"`
            : strValue;
        })
        .join(","),
    ),
  ];

  return csvRows.join("\n");
}
