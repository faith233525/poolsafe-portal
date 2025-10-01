import { Request } from "express";
import { prisma } from "../prismaClient";

export interface ActivityLogData {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
  duration?: number;
}

export class ActivityLogger {
  static async log(data: ActivityLogData, req?: Request): Promise<void> {
    try {
      const ipAddress = req ? this.getClientIP(req) : undefined;
      const userAgent = req?.headers["user-agent"];

      await prisma.activityLog.create({
        data: {
          userId: data.userId,
          userEmail: data.userEmail,
          userRole: data.userRole,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          details: data.details ? JSON.stringify(data.details) : undefined,
          ipAddress,
          userAgent,
          success: data.success ?? true,
          errorMessage: data.errorMessage,
          duration: data.duration,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
      // Don't throw - activity logging should not break the main flow
    }
  }

  static async logLogin(
    userEmail: string,
    userRole: string,
    success: boolean,
    req: Request,
    errorMessage?: string,
  ): Promise<void> {
    await this.log(
      {
        userEmail,
        userRole,
        action: "LOGIN",
        success,
        errorMessage,
      },
      req,
    );
  }

  static async logLogout(userEmail: string, userRole: string, req: Request): Promise<void> {
    await this.log(
      {
        userEmail,
        userRole,
        action: "LOGOUT",
      },
      req,
    );
  }

  static async logTicketAction(
    action: string,
    ticketId: string,
    userEmail: string,
    userRole: string,
    req: Request,
    details?: Record<string, any>,
  ): Promise<void> {
    await this.log(
      {
        userEmail,
        userRole,
        action,
        entityType: "TICKET",
        entityId: ticketId,
        details,
      },
      req,
    );
  }

  static async logPartnerAction(
    action: string,
    partnerId: string,
    userEmail: string,
    userRole: string,
    req: Request,
    details?: Record<string, any>,
  ): Promise<void> {
    await this.log(
      {
        userEmail,
        userRole,
        action,
        entityType: "PARTNER",
        entityId: partnerId,
        details,
      },
      req,
    );
  }

  static async logKnowledgeBaseAction(
    action: string,
    kbId: string,
    userEmail: string,
    userRole: string,
    req: Request,
  ): Promise<void> {
    await this.log(
      {
        userEmail,
        userRole,
        action,
        entityType: "KNOWLEDGE_BASE",
        entityId: kbId,
      },
      req,
    );
  }

  static async getActivityStats(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [loginStats, actionStats, userActivityStats, failedAttempts] = await Promise.all([
      // Login statistics
      prisma.activityLog.groupBy({
        by: ["action", "success"],
        where: {
          action: "LOGIN",
          createdAt: { gte: startDate },
        },
        _count: true,
      }),

      // Action statistics
      prisma.activityLog.groupBy({
        by: ["action"],
        where: {
          createdAt: { gte: startDate },
          action: { not: "LOGIN" },
        },
        _count: true,
        orderBy: { _count: { action: "desc" } },
      }),

      // User activity by role
      prisma.activityLog.groupBy({
        by: ["userRole"],
        where: {
          createdAt: { gte: startDate },
        },
        _count: true,
      }),

      // Failed login attempts
      prisma.activityLog.findMany({
        where: {
          action: "LOGIN",
          success: false,
          createdAt: { gte: startDate },
        },
        select: {
          userEmail: true,
          ipAddress: true,
          createdAt: true,
          errorMessage: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    return {
      loginStats,
      actionStats,
      userActivityStats,
      failedAttempts,
    };
  }

  static async getRecentActivity(limit: number = 100) {
    return prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        userEmail: true,
        userRole: true,
        action: true,
        entityType: true,
        success: true,
        createdAt: true,
        details: true,
      },
    });
  }

  static async getActivityLogs(options: { where?: any; skip?: number; take?: number }) {
    return prisma.activityLog.findMany({
      where: options.where,
      skip: options.skip,
      take: options.take,
      orderBy: { createdAt: "desc" },
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
    });
  }

  static async getActivityLogCount(where?: any) {
    return prisma.activityLog.count({ where });
  }

  private static getClientIP(req: Request): string | undefined {
    return (
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      undefined
    );
  }
}

export default ActivityLogger;
