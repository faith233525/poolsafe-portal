import { prisma } from "../prismaClient";
import { ActivityLogger } from "./activityLogger";

export interface DashboardAnalytics {
  overview: {
    totalPartners: number;
    totalTickets: number;
    activeTickets: number;
    totalUsers: number;
    todayLogins: number;
  };
  ticketStats: {
    byStatus: Array<{ status: string; count: number }>;
    byPriority: Array<{ priority: string; count: number }>;
    byCategory: Array<{ category: string; count: number }>;
    recentTickets: Array<{
      id: string;
      subject: string;
      priority: string;
      status: string;
      partnerName: string;
      createdAt: Date;
    }>;
  };
  partnerStats: {
    byUnits: Array<{ companyName: string; numberOfLoungeUnits: number }>;
    byState: Array<{ state: string; count: number }>;
    recentPartners: Array<{
      id: string;
      companyName: string;
      city: string | null;
      state: string | null;
      numberOfLoungeUnits: number;
      createdAt: Date;
    }>;
  };
  activityStats: {
    loginTrends: Array<{ date: string; logins: number; uniqueUsers: number }>;
    topActions: Array<{ action: string; count: number }>;
    userActivity: Array<{ userRole: string; count: number }>;
    recentActivity: Array<{
      userEmail: string;
      userRole: string;
      action: string;
      success: boolean;
      createdAt: Date;
    }>;
  };
  systemHealth: {
    errorRate: number;
    averageResponseTime: number;
    uptime: string;
    databaseConnections: number;
  };
}

export class AnalyticsService {
  static async getDashboardAnalytics(days: number = 30): Promise<DashboardAnalytics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    try {
      // Get overview statistics
      const [totalPartners, totalTickets, activeTickets, totalUsers, todayLogins] =
        await Promise.all([
          prisma.partner.count(),
          prisma.ticket.count(),
          prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
          prisma.user.count(),
          prisma.activityLog.count({
            where: {
              action: "LOGIN",
              success: true,
              createdAt: { gte: todayStart },
            },
          }),
        ]);

      // Get ticket statistics
      const [ticketsByStatus, ticketsByPriority, ticketsByCategory, recentTickets] =
        await Promise.all([
          prisma.ticket.groupBy({
            by: ["status"],
            _count: true,
            orderBy: { _count: { status: "desc" } },
          }),
          prisma.ticket.groupBy({
            by: ["priority"],
            _count: true,
            orderBy: { _count: { priority: "desc" } },
          }),
          prisma.ticket.groupBy({
            by: ["category"],
            _count: true,
            orderBy: { _count: { category: "desc" } },
          }),
          prisma.ticket.findMany({
            take: 10,
            orderBy: { createdAt: "desc" },
            include: {
              partner: {
                select: { companyName: true },
              },
            },
          }),
        ]);

      // Get partner statistics
      const [partnersByUnits, partnersByState, recentPartners] = await Promise.all([
        prisma.partner.findMany({
          select: {
            companyName: true,
            numberOfLoungeUnits: true,
          },
          orderBy: { numberOfLoungeUnits: "desc" },
          take: 10,
        }),
        prisma.partner.groupBy({
          by: ["state"],
          _count: true,
          where: {
            state: { not: null },
          },
          orderBy: { _count: { state: "desc" } },
        }),
        prisma.partner.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            companyName: true,
            city: true,
            state: true,
            numberOfLoungeUnits: true,
            createdAt: true,
          },
        }),
      ]);

      // Get activity statistics
      const activityStats = await ActivityLogger.getActivityStats(days);
      const recentActivity = await ActivityLogger.getRecentActivity(20);

      // Get login trends (last 7 days)
      const loginTrends = await this.getLoginTrends(7);

      // Get system health metrics
      const systemHealth = await this.getSystemHealth();

      return {
        overview: {
          totalPartners,
          totalTickets,
          activeTickets,
          totalUsers,
          todayLogins,
        },
        ticketStats: {
          byStatus: ticketsByStatus.map((item) => ({ status: item.status, count: item._count })),
          byPriority: ticketsByPriority.map((item) => ({
            priority: item.priority,
            count: item._count,
          })),
          byCategory: ticketsByCategory.map((item) => ({
            category: item.category,
            count: item._count,
          })),
          recentTickets: recentTickets.map((ticket) => ({
            id: ticket.id,
            subject: ticket.subject,
            priority: ticket.priority,
            status: ticket.status,
            partnerName: ticket.partner.companyName,
            createdAt: ticket.createdAt,
          })),
        },
        partnerStats: {
          byUnits: partnersByUnits,
          byState: partnersByState.map((item) => ({
            state: item.state || "Unknown",
            count: item._count,
          })),
          recentPartners,
        },
        activityStats: {
          loginTrends,
          topActions: activityStats.actionStats.map((item) => ({
            action: item.action,
            count: item._count,
          })),
          userActivity: activityStats.userActivityStats.map((item) => ({
            userRole: item.userRole || "Unknown",
            count: item._count,
          })),
          recentActivity: recentActivity.map((activity) => ({
            userEmail: activity.userEmail || "System",
            userRole: activity.userRole || "Unknown",
            action: activity.action,
            success: activity.success,
            createdAt: activity.createdAt,
          })),
        },
        systemHealth,
      };
    } catch (error) {
      console.error("Error getting dashboard analytics:", error);
      throw new Error("Failed to get dashboard analytics");
    }
  }

  private static async getLoginTrends(days: number) {
    const trends = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [logins, uniqueUsers] = await Promise.all([
        prisma.activityLog.count({
          where: {
            action: "LOGIN",
            success: true,
            createdAt: { gte: date, lt: nextDate },
          },
        }),
        prisma.activityLog
          .findMany({
            where: {
              action: "LOGIN",
              success: true,
              createdAt: { gte: date, lt: nextDate },
            },
            select: { userEmail: true },
            distinct: ["userEmail"],
          })
          .then((users) => users.length),
      ]);

      trends.push({
        date: date.toISOString().split("T")[0],
        logins,
        uniqueUsers,
      });
    }

    return trends;
  }

  private static async getSystemHealth() {
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const [errorCount, totalRequests] = await Promise.all([
      prisma.errorLog.count({
        where: {
          createdAt: { gte: last24Hours },
        },
      }),
      prisma.activityLog.count({
        where: {
          createdAt: { gte: last24Hours },
        },
      }),
    ]);

    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

    return {
      errorRate: Math.round(errorRate * 100) / 100,
      averageResponseTime: Math.random() * 100 + 50, // Mock data - would need real monitoring
      uptime: "99.9%", // Mock data - would need real monitoring
      databaseConnections: 10, // Mock data - would need real monitoring
    };
  }

  static async getPartnerAnalytics(partnerId: string) {
    try {
      const [partner, ticketStats, recentTickets, activityCount] = await Promise.all([
        prisma.partner.findUnique({
          where: { id: partnerId },
          include: {
            _count: {
              select: {
                tickets: true,
                serviceRecords: true,
                calendarEvents: true,
              },
            },
          },
        }),
        prisma.ticket.groupBy({
          by: ["status"],
          where: { partnerId },
          _count: true,
        }),
        prisma.ticket.findMany({
          where: { partnerId },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            subject: true,
            status: true,
            priority: true,
            createdAt: true,
          },
        }),
        prisma.activityLog.count({
          where: {
            userEmail: partnerId,
            userRole: "PARTNER",
          },
        }),
      ]);

      return {
        partner,
        ticketStats: ticketStats.map((item) => ({ status: item.status, count: item._count })),
        recentTickets,
        activityCount,
      };
    } catch (error) {
      console.error("Error getting partner analytics:", error);
      throw new Error("Failed to get partner analytics");
    }
  }
}

export default AnalyticsService;
