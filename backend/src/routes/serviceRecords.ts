import { Router } from "express";
import { prisma } from "../prismaClient";
import {
  requireAuthenticated,
  requireSupport,
  requireAdmin,
  AuthenticatedRequest,
} from "../utils/auth";
import { validateQuery, validateBody } from "../middleware/validate";
import {
  serviceRecordListQuerySchema,
  serviceRecordCreateSchema,
  serviceRecordUpdateSchema,
} from "../validation/schemas";

export const serviceRecordsRouter = Router();

// Get all service records with filtering (authenticated)
serviceRecordsRouter.get(
  "/",
  requireAuthenticated,
  validateQuery(serviceRecordListQuerySchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const {
        partnerId,
        serviceType,
        status,
        assignedToId,
        page = 1,
        pageSize = 25,
      } = (req as any).validatedQuery || {};

      const where: any = {};

      if (req.user!.role === "PARTNER") {
        where.partnerId = req.user!.partnerId;
      } else if (partnerId && (req.user!.role === "ADMIN" || req.user!.role === "SUPPORT")) {
        where.partnerId = partnerId as string;
      }
      if (serviceType) where.serviceType = serviceType;
      if (status) where.status = status;
      if (assignedToId) where.assignedToId = assignedToId;

      const [records, total] = await Promise.all([
        prisma.serviceRecord.findMany({
          where,
          include: {
            partner: { select: { id: true, companyName: true, city: true, state: true } },
            assignedTo: { select: { id: true, displayName: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.serviceRecord.count({ where }),
      ]);

      res.json({ data: records, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
    } catch (error) {
      console.error("Error fetching service records:", error);
      res.status(500).json({ error: "Failed to fetch service records" });
    }
  },
);

// Get service record by ID
serviceRecordsRouter.get("/:id", requireAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const serviceRecord = await prisma.serviceRecord.findUnique({
      where: { id },
      include: {
        partner: true,
        assignedTo: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    if (!serviceRecord) {
      return res.status(404).json({ error: "Service record not found" });
    }

    // Partners can only view their own service records
    if (req.user!.role === "PARTNER" && serviceRecord.partnerId !== req.user!.partnerId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(serviceRecord);
  } catch (error) {
    console.error("Error fetching service record:", error);
    res.status(500).json({ error: "Failed to fetch service record" });
  }
});

// Create new service record (Support/Admin)
serviceRecordsRouter.post(
  "/",
  requireSupport,
  validateBody(serviceRecordCreateSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const {
        partnerId,
        assignedToId,
        serviceType,
        description,
        notes,
        scheduledDate,
        attachments,
      } = (req as any).validated;

      const serviceRecord = await prisma.serviceRecord.create({
        data: {
          partnerId,
          assignedToId: assignedToId || null,
          serviceType,
          description: description || null,
          notes: notes || null,
          scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
          attachments: attachments ? JSON.stringify(attachments) : null,
        },
        include: {
          partner: { select: { id: true, companyName: true } },
          assignedTo: { select: { id: true, displayName: true, email: true } },
        },
      });

      res.status(201).json(serviceRecord);
    } catch (error) {
      console.error("Error creating service record:", error);
      res.status(500).json({ error: "Failed to create service record" });
    }
  },
);

// Update service record
serviceRecordsRouter.put(
  "/:id",
  requireSupport,
  validateBody(serviceRecordUpdateSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const updateData = (req as any).validated;

      if (updateData.scheduledDate) updateData.scheduledDate = new Date(updateData.scheduledDate);
      if (updateData.completedDate) updateData.completedDate = new Date(updateData.completedDate);
      if (updateData.attachments && Array.isArray(updateData.attachments)) {
        updateData.attachments = JSON.stringify(updateData.attachments);
      }

      const updatedServiceRecord = await prisma.serviceRecord.update({
        where: { id },
        data: updateData,
        include: {
          partner: { select: { id: true, companyName: true } },
          assignedTo: { select: { id: true, displayName: true, email: true } },
        },
      });

      res.json(updatedServiceRecord);
    } catch (error) {
      console.error("Error updating service record:", error);
      res.status(500).json({ error: "Failed to update service record" });
    }
  },
);

// Delete service record
serviceRecordsRouter.delete("/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    await prisma.serviceRecord.delete({
      where: { id },
    });

    res.json({ message: "Service record deleted successfully" });
  } catch (error) {
    console.error("Error deleting service record:", error);
    res.status(500).json({ error: "Failed to delete service record" });
  }
});

// Get service statistics
serviceRecordsRouter.get(
  "/stats/summary",
  requireAuthenticated,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { partnerId, assignedToId } = req.query;

      const where: any = {};
      if (partnerId) where.partnerId = partnerId as string;
      if (assignedToId) where.assignedToId = assignedToId as string;

      const [totalRecords, statusStats, typeStats, monthlyStats] = await Promise.all([
        // Total count
        prisma.serviceRecord.count({ where }),

        // By status
        prisma.serviceRecord.groupBy({
          by: ["status"],
          where,
          _count: { status: true },
        }),

        // By type
        prisma.serviceRecord.groupBy({
          by: ["serviceType"],
          where,
          _count: { serviceType: true },
        }),

        // Monthly stats (last 12 months)
        prisma.serviceRecord.groupBy({
          by: ["createdAt"],
          where: {
            ...where,
            createdAt: {
              gte: new Date(new Date().setMonth(new Date().getMonth() - 12)),
            },
          },
          _count: { id: true },
        }),
      ]);

      res.json({
        totalRecords,
        byStatus: statusStats,
        byType: typeStats,
        monthlyTrend: monthlyStats,
      });
    } catch (error) {
      console.error("Error fetching service stats:", error);
      res.status(500).json({ error: "Failed to fetch service statistics" });
    }
  },
);
