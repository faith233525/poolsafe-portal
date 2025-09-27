import { Router } from "express";
import { notificationsCreatedTotal } from "../metrics";
import { buildPaginated, errorResponse } from "../lib/response";
import { emitNotification } from "../events/notifications";
import { prisma } from "../prismaClient";
import { requireAuthenticated, requireSupport, AuthenticatedRequest } from "../utils/auth";
import { validateQuery, validateBody } from "../middleware/validate";
import { notificationCreateSchema, notificationListQuerySchema } from "../validation/schemas";
import { notificationCreateLimiter } from "../middleware/rateLimiters";

export const notificationsRouter = Router();

// List notifications (current user unless support/admin filtering by userId)
notificationsRouter.get(
  "/",
  requireAuthenticated,
  validateQuery(notificationListQuerySchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { page = 1, pageSize = 25, userId, type, isRead } = (req as any).validatedQuery || {};
      const effectiveUserId =
        req.user!.role === "ADMIN" || req.user!.role === "SUPPORT"
          ? userId || req.user!.id
          : req.user!.id;

      const where: any = {};
      if (effectiveUserId) {
        where.userId = effectiveUserId;
      }
      if (type) {
        where.type = type;
      }
      if (isRead) {
        where.isRead = isRead === "true";
      }

      const [items, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({ where: { ...where, isRead: false } }),
      ]);

      res.setHeader("X-Unread-Count", unreadCount.toString());
      res.json(buildPaginated(items, page, pageSize, total, { unreadCount }));
    } catch (error) {
      console.error("Error listing notifications:", error);
      res.status(500).json(errorResponse("Failed to list notifications"));
    }
  },
);

// Create notification (support/admin)
notificationsRouter.post(
  "/",
  requireSupport,
  notificationCreateLimiter,
  validateBody(notificationCreateSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const data = (req as any).validated;
      const notification = await prisma.notification.create({ data });
      notificationsCreatedTotal.inc({ creatorRole: req.user!.role, type: data.type });
      const unreadCount = notification.userId
        ? await prisma.notification.count({ where: { userId: notification.userId, isRead: false } })
        : 0;
      if (notification.userId) {
        emitNotification(notification.userId, { event: "notification", notification, unreadCount });
      }
      res.status(201).json(notification);
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({ error: "Failed to create notification" });
    }
  },
);

// Mark single notification read
notificationsRouter.post(
  "/:id/read",
  requireAuthenticated,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const notif = await prisma.notification.findUnique({ where: { id } });
      if (!notif) {
        return res.status(404).json({ error: "Not found" });
      }
      if (
        notif.userId &&
        notif.userId !== req.user!.id &&
        !(req.user!.role === "ADMIN" || req.user!.role === "SUPPORT")
      ) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const updated = await prisma.notification.update({ where: { id }, data: { isRead: true } });
      const unreadCount = updated.userId
        ? await prisma.notification.count({ where: { userId: updated.userId, isRead: false } })
        : 0;
      if (updated.userId) {
        emitNotification(updated.userId, { event: "unread_count", unreadCount });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error marking notification read:", error);
      res.status(500).json({ error: "Failed to mark read" });
    }
  },
);

// Mark all notifications read for current user
notificationsRouter.post(
  "/read-all",
  requireAuthenticated,
  async (req: AuthenticatedRequest, res) => {
    try {
      await prisma.notification.updateMany({
        where: { userId: req.user!.id, isRead: false },
        data: { isRead: true },
      });
      const unreadCount = await prisma.notification.count({
        where: { userId: req.user!.id, isRead: false },
      });
      emitNotification(req.user!.id, { event: "unread_count", unreadCount });
      res.json({ message: "All notifications marked read" });
    } catch (error) {
      console.error("Error marking all read:", error);
      res.status(500).json({ error: "Failed to mark all read" });
    }
  },
);

// SSE stream endpoint
notificationsRouter.get("/stream", requireAuthenticated, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const unreadCount = await prisma.notification.count({ where: { userId, isRead: false } });
    res.write(`event: init\n`);
    res.write(`data: ${JSON.stringify({ unreadCount })}\n\n`);
  } catch {
    res.write("event: error\n");
    res.write(`data: ${JSON.stringify({ message: "init_failed" })}\n\n`);
  }

  const listener = (payload: any) => {
    res.write(`event: ${payload.event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const { addNotificationListener, removeNotificationListener } = await import(
    "../events/notifications"
  );
  addNotificationListener(userId, listener);

  const heartbeat = setInterval(() => {
    res.write(":hb\n\n");
  }, 25000);

  const cleanup = () => {
    clearInterval(heartbeat);
    removeNotificationListener(userId, listener);
  };
  req.on("close", cleanup);
  req.on("end", cleanup);
});
