import { Router } from "express";
import { prisma } from "../prismaClient";
import {
  requireAuthenticated,
  requireSupport,
  requireAdmin,
  AuthenticatedRequest,
} from "../utils/auth";

export const calendarEventsRouter = Router();

// Get all calendar events with filtering (authenticated)
calendarEventsRouter.get(
  "/",
  requireAuthenticated,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { partnerId, eventType, startDate, endDate } = req.query;

      const where: any = {};

      // Partners can only see their own events
      if (req.user!.role === "PARTNER") {
        where.partnerId = req.user!.partnerId;
      } else if (
        partnerId &&
        (req.user!.role === "ADMIN" || req.user!.role === "SUPPORT")
      ) {
        where.partnerId = partnerId as string;
      }

      if (eventType) where.eventType = eventType as string;

      // Date range filtering
      if (startDate || endDate) {
        where.startDate = {};
        if (startDate) where.startDate.gte = new Date(startDate as string);
        if (endDate) where.startDate.lte = new Date(endDate as string);
      }

      const calendarEvents = await prisma.calendarEvent.findMany({
        where,
        include: {
          partner: {
            select: {
              id: true,
              companyName: true,
              city: true,
              state: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
        orderBy: {
          startDate: "asc",
        },
      });

      res.json(calendarEvents);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ error: "Failed to fetch calendar events" });
    }
  }
);

// Get calendar event by ID
calendarEventsRouter.get(
  "/:id",
  requireAuthenticated,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;

      const calendarEvent = await prisma.calendarEvent.findUnique({
        where: { id },
        include: {
          partner: true,
          createdBy: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      });

      if (!calendarEvent) {
        return res.status(404).json({ error: "Calendar event not found" });
      }

      res.json(calendarEvent);
    } catch (error) {
      console.error("Error fetching calendar event:", error);
      res.status(500).json({ error: "Failed to fetch calendar event" });
    }
  }
);

// Create new calendar event
calendarEventsRouter.post(
  "/",
  requireSupport,
  async (req: AuthenticatedRequest, res) => {
    try {
      const {
        partnerId,
        createdById,
        title,
        description,
        eventType,
        startDate,
        endDate,
        isRecurring,
        recurrenceRule,
        reminderMinutes,
      } = req.body;

      if (!partnerId || !title || !eventType || !startDate) {
        return res.status(400).json({
          error: "partnerId, title, eventType, and startDate are required",
        });
      }

      const calendarEvent = await prisma.calendarEvent.create({
        data: {
          partnerId,
          createdById,
          title,
          description,
          eventType, // OPEN, CLOSED, MAINTENANCE, INSTALLATION, UPGRADE, TRAINING
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          isRecurring: isRecurring || false,
          recurrenceRule,
          reminderMinutes,
        },
        include: {
          partner: {
            select: {
              id: true,
              companyName: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      });

      res.status(201).json(calendarEvent);
    } catch (error) {
      console.error("Error creating calendar event:", error);
      res.status(500).json({ error: "Failed to create calendar event" });
    }
  }
);

// Update calendar event
calendarEventsRouter.put(
  "/:id",
  requireSupport,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Convert date strings to Date objects if provided
      if (updateData.startDate) {
        updateData.startDate = new Date(updateData.startDate);
      }
      if (updateData.endDate) {
        updateData.endDate = new Date(updateData.endDate);
      }

      const updatedCalendarEvent = await prisma.calendarEvent.update({
        where: { id },
        data: updateData,
        include: {
          partner: {
            select: {
              id: true,
              companyName: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      });

      res.json(updatedCalendarEvent);
    } catch (error) {
      console.error("Error updating calendar event:", error);
      res.status(500).json({ error: "Failed to update calendar event" });
    }
  }
);

// Delete calendar event
calendarEventsRouter.delete(
  "/:id",
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;

      await prisma.calendarEvent.delete({
        where: { id },
      });

      res.json({ message: "Calendar event deleted successfully" });
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      res.status(500).json({ error: "Failed to delete calendar event" });
    }
  }
);

// Get partner's operational status (open/closed) for a date range
calendarEventsRouter.get(
  "/partner/:partnerId/status",
  requireAuthenticated,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { partnerId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: "startDate and endDate query parameters are required",
        });
      }

      const statusEvents = await prisma.calendarEvent.findMany({
        where: {
          partnerId,
          eventType: {
            in: ["OPEN", "CLOSED"],
          },
          startDate: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string),
          },
        },
        orderBy: {
          startDate: "asc",
        },
      });

      res.json(statusEvents);
    } catch (error) {
      console.error("Error fetching partner status:", error);
      res.status(500).json({ error: "Failed to fetch partner status" });
    }
  }
);

// Get upcoming events for a partner
calendarEventsRouter.get(
  "/partner/:partnerId/upcoming",
  requireAuthenticated,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { partnerId } = req.params;
      const { days = 30 } = req.query; // Default to next 30 days

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + parseInt(days as string));

      const upcomingEvents = await prisma.calendarEvent.findMany({
        where: {
          partnerId,
          startDate: {
            gte: new Date(),
            lte: futureDate,
          },
        },
        include: {
          createdBy: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
        orderBy: {
          startDate: "asc",
        },
      });

      res.json(upcomingEvents);
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
      res.status(500).json({ error: "Failed to fetch upcoming events" });
    }
  }
);

// Get calendar statistics
calendarEventsRouter.get(
  "/stats/summary",
  requireAuthenticated,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { partnerId } = req.query;

      const where: any = {};
      if (partnerId) where.partnerId = partnerId as string;

      const [totalEvents, eventTypeStats, upcomingEvents, monthlyStats] =
        await Promise.all([
          // Total count
          prisma.calendarEvent.count({ where }),

          // By event type
          prisma.calendarEvent.groupBy({
            by: ["eventType"],
            where,
            _count: { eventType: true },
          }),

          // Upcoming events (next 30 days)
          prisma.calendarEvent.count({
            where: {
              ...where,
              startDate: {
                gte: new Date(),
                lte: new Date(new Date().setDate(new Date().getDate() + 30)),
              },
            },
          }),

          // Monthly stats (last 12 months)
          prisma.calendarEvent.groupBy({
            by: ["startDate"],
            where: {
              ...where,
              startDate: {
                gte: new Date(new Date().setMonth(new Date().getMonth() - 12)),
              },
            },
            _count: { id: true },
          }),
        ]);

      res.json({
        totalEvents,
        byEventType: eventTypeStats,
        upcomingEvents,
        monthlyTrend: monthlyStats,
      });
    } catch (error) {
      console.error("Error fetching calendar stats:", error);
      res.status(500).json({ error: "Failed to fetch calendar statistics" });
    }
  }
);
