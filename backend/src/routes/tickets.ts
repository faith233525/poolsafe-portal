import { Router } from "express";
import { prisma } from "../prismaClient";
import {
  requireAuthenticated,
  requireSupport,
  requireAdmin,
  AuthenticatedRequest,
} from "../utils/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import {
  ticketCreateSchema,
  ticketListQuerySchema,
  ticketUpdateSchema,
  ticketStatusChangeSchema,
} from "../validation/schemas";

export const ticketsRouter = Router();

// Create ticket (authenticated)
ticketsRouter.post(
  "/",
  requireAuthenticated,
  validateBody(ticketCreateSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const {
        partnerId,
        firstName,
        lastName,
        title,
        subject,
        category,
        description,
        unitsAffected,
        priority,
        contactPreference,
        recurringIssue,
        dateOfOccurrence,
        severity,
        followUpNotes,
      } = (req as any).validated;

      // Set partnerId based on user role
      let finalPartnerId = partnerId;
      if (req.user!.role === "PARTNER") {
        finalPartnerId = req.user!.partnerId; // Partners can only create tickets for themselves
      }

      if (!finalPartnerId || !subject) {
        return res
          .status(400)
          .json({ error: "partnerId and subject required" });
      }

      const ticket = await prisma.ticket.create({
        data: {
          partnerId: finalPartnerId,
          firstName,
          lastName,
          title,
          createdByName: `${firstName || ""} ${lastName || ""}`.trim(),
          subject,
          category: category || "General", // Call Button, Charging, Connectivity, Screen, Locking, General Maintenance, Monitor, Antenna, Gateway, LoRa, General System, Other
          description,
          unitsAffected: unitsAffected || 0,
          priority: priority || "MEDIUM", // LOW, MEDIUM, HIGH
          contactPreference,
          recurringIssue: recurringIssue || false,
          dateOfOccurrence: dateOfOccurrence
            ? new Date(dateOfOccurrence)
            : null,
          severity: severity || null, // 1-10 severity slider
          followUpNotes,
        },
        include: {
          partner: {
            select: {
              id: true,
              companyName: true,
              city: true,
              state: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
          attachments: true,
        },
      });

      res.status(201).json(ticket);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "internal" });
    }
  }
);

// List tickets with comprehensive filtering (authenticated)
ticketsRouter.get(
  "/",
  requireAuthenticated,
  validateQuery(ticketListQuerySchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const {
        partnerId,
        category,
        priority,
        status,
        assignedToId,
        startDate,
        endDate,
        search,
      } = (req as any).validatedQuery;

      const where: any = {};

      // Partners can only see their own tickets
      if (req.user!.role === "PARTNER") {
        where.partnerId = req.user!.partnerId;
      } else if (
        partnerId &&
        (req.user!.role === "ADMIN" || req.user!.role === "SUPPORT")
      ) {
        where.partnerId = partnerId;
      }

      if (category) where.category = category;
      if (priority) where.priority = priority;
      if (status) where.status = status;
      if (assignedToId) where.assignedToId = assignedToId;

      // Date range filtering
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      // Search functionality
      if (search) {
        where.OR = [
          { subject: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { createdByName: { contains: search, mode: "insensitive" } },
        ];
      }

      const tickets = await prisma.ticket.findMany({
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
          assignedTo: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
          attachments: true,
          _count: {
            select: {
              attachments: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json(tickets);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "internal" });
    }
  }
);

// Get ticket by id with full details
ticketsRouter.get(
  "/:id",
  requireAuthenticated,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const ticket = await prisma.ticket.findUnique({
        where: { id },
        include: {
          partner: {
            select: {
              id: true,
              companyName: true,
              streetAddress: true,
              city: true,
              state: true,
              zip: true,
              country: true,
              numberOfLoungeUnits: true,
              topColour: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
          attachments: true,
        },
      });

      if (!ticket) {
        return res.status(404).json({ error: "not found" });
      }

      // Partners can only view their own tickets
      if (
        req.user!.role === "PARTNER" &&
        ticket.partnerId !== req.user!.partnerId
      ) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(ticket);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "internal" });
    }
  }
);

// Update ticket (authenticated with role-based permissions)
ticketsRouter.put(
  "/:id",
  requireAuthenticated,
  validateBody(ticketUpdateSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
  let updateData = (req as any).validated;

      // Check if ticket exists and user has access
      const existingTicket = await prisma.ticket.findUnique({
        where: { id },
      });

      if (!existingTicket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      // Partners can only update their own tickets and limited fields
      if (req.user!.role === "PARTNER") {
        if (existingTicket.partnerId !== req.user!.partnerId) {
          return res.status(403).json({ error: "Access denied" });
        }
        // Partners can only update certain fields
        const allowedFields = [
          "description",
          "followUpNotes",
          "contactPreference",
          "severity",
        ];
        const filteredData: any = {};
        Object.keys(updateData)
          .filter((key) => allowedFields.includes(key))
          .forEach((key) => {
            filteredData[key] = updateData[key];
          });
        updateData = filteredData;
      }

      // Convert date strings to Date objects if provided
      if (updateData.dateOfOccurrence) {
        updateData.dateOfOccurrence = new Date(updateData.dateOfOccurrence);
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id },
        data: updateData,
        include: {
          partner: {
            select: {
              id: true,
              companyName: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
          attachments: true,
        },
      });

      res.json(updatedTicket);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "internal" });
    }
  }
);

// Assign ticket to staff member (support/admin)
ticketsRouter.post(
  "/:id/assign",
  requireSupport,
  validateBody(
    ticketUpdateSchema.pick({ assignedToId: true, internalNotes: true })
  ),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
  const { assignedToId, internalNotes } = (req as any).validated;

      const updatedTicket = await prisma.ticket.update({
        where: { id },
        data: {
          assignedToId,
          internalNotes,
          status: "IN_PROGRESS", // Auto-update status when assigned
        },
        include: {
          partner: {
            select: {
              id: true,
              companyName: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      });

      res.json(updatedTicket);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "internal" });
    }
  }
);

// Update ticket status (support/admin)
ticketsRouter.post(
  "/:id/status",
  requireSupport,
  validateBody(ticketStatusChangeSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
  const { status, internalNotes, resolutionTime } = (req as any).validated;

      // status validity already guaranteed by schema

      const updateData: any = { status };
      if (internalNotes) updateData.internalNotes = internalNotes;
      if (resolutionTime && status === "RESOLVED") {
        updateData.resolutionTime = resolutionTime;
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id },
        data: updateData,
        include: {
          partner: {
            select: {
              id: true,
              companyName: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      });

      res.json(updatedTicket);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "internal" });
    }
  }
);

// Get ticket statistics
ticketsRouter.get(
  "/stats/summary",
  requireAuthenticated,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { partnerId, assignedToId } = req.query as any;

      const where: any = {};

      // Partners can only see stats for their own tickets
      if (req.user!.role === "PARTNER") {
        where.partnerId = req.user!.partnerId;
      } else {
        if (partnerId) where.partnerId = partnerId;
        if (assignedToId) where.assignedToId = assignedToId;
      }

      const [
        totalTickets,
        statusStats,
        categoryStats,
        priorityStats,
        assignmentStats,
        averageResolutionTime,
      ] = await Promise.all([
        // Total count
        prisma.ticket.count({ where }),

        // By status
        prisma.ticket.groupBy({
          by: ["status"],
          where,
          _count: { status: true },
        }),

        // By category
        prisma.ticket.groupBy({
          by: ["category"],
          where,
          _count: { category: true },
        }),

        // By priority
        prisma.ticket.groupBy({
          by: ["priority"],
          where,
          _count: { priority: true },
        }),

        // By assignment status
        prisma.ticket.count({
          where: {
            ...where,
            assignedToId: { not: null },
          },
        }),

        // Average resolution time
        prisma.ticket.aggregate({
          where: {
            ...where,
            status: "RESOLVED",
            resolutionTime: { not: null },
          },
          _avg: { resolutionTime: true },
        }),
      ]);

      res.json({
        totalTickets,
        byStatus: statusStats,
        byCategory: categoryStats,
        byPriority: priorityStats,
        assignedTickets: assignmentStats,
        unassignedTickets: totalTickets - assignmentStats,
        averageResolutionTime: averageResolutionTime._avg.resolutionTime,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "internal" });
    }
  }
);
