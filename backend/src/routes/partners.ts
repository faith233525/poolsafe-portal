import { Router } from "express";
import { prisma } from "../prismaClient";
import {
  authenticateToken,
  requireAdmin,
  requireSupport,
  AuthenticatedRequest,
} from "../utils/auth";
import { validateQuery, validateBody } from "../middleware/validate";
import {
  partnerListQuerySchema,
  partnerCreateSchema,
  partnerUpdateSchema,
} from "../validation/schemas";

// Utility to mask sensitive partner fields for non-privileged roles
function maskPartner(partner: any, role: string) {
  if (!partner) return partner;
  if (role === "ADMIN" || role === "SUPPORT") return partner;
  const sensitive = ["lock", "masterCode", "subMasterCode", "lockPart", "key", "userPass"];
  const clone: any = { ...partner };
  sensitive.forEach((k) => {
    if (k in clone) delete clone[k];
  });
  return clone;
}

export const partnersRouter = Router();

// Apply authentication to all routes
partnersRouter.use(authenticateToken);

// Get partners (paginated) - Support/Admin only
partnersRouter.get(
  "/",
  requireSupport,
  validateQuery(partnerListQuerySchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { page = 1, pageSize = 25 } = (req as any).validatedQuery || {};
      const [partners, total] = await Promise.all([
        prisma.partner.findMany({
          include: {
            users: {
              select: { id: true, email: true, displayName: true, role: true },
            },
            tickets: {
              select: { id: true, subject: true, status: true, priority: true, createdAt: true },
              orderBy: { createdAt: "desc" },
              take: 5,
            },
            _count: { select: { tickets: true, serviceRecords: true, calendarEvents: true } },
          },
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: "desc" },
        }),
        prisma.partner.count(),
      ]);
      const role = req.user!.role;
      const sanitized = partners.map((p) => maskPartner(p, role));
      res.json({ data: sanitized, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
    } catch (error) {
      console.error("Error fetching partners:", error);
      res.status(500).json({ error: "Failed to fetch partners" });
    }
  },
);

// Create partner (admin)
partnersRouter.post(
  "/",
  requireAdmin,
  validateBody(partnerCreateSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const partnerData = (req as any).validated;
      const partner = await prisma.partner.create({ data: partnerData });
      res.status(201).json(partner);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "internal" });
    }
  },
);

// Get partner by ID (with role-based access)
partnersRouter.get("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    // Partners can only view their own data
    if (req.user!.role === "PARTNER" && req.user!.partnerId !== id) {
      return res.status(403).json({ error: "Can only access your own partner data" });
    }

    if (req.user!.role === "ADMIN" || req.user!.role === "SUPPORT") {
      // Admin/Support get all fields + relationships
      const partner = await prisma.partner.findUnique({
        where: { id },
        include: {
          users: true,
          tickets: {
            orderBy: { createdAt: "desc" },
          },
          serviceRecords: {
            orderBy: { createdAt: "desc" },
          },
          calendarEvents: {
            orderBy: { startDate: "desc" },
          },
        },
      });

      if (!partner) {
        return res.status(404).json({ error: "not found" });
      }
      res.json(maskPartner(partner, req.user!.role));
    } else {
      // Partners get limited fields only
      const partner = await prisma.partner.findUnique({
        where: { id },
        select: {
          id: true,
          companyName: true,
          managementCompany: true,
          streetAddress: true,
          city: true,
          state: true,
          zip: true,
          country: true,
          numberOfLoungeUnits: true,
          topColour: true,
          latitude: true,
          longitude: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!partner) {
        return res.status(404).json({ error: "not found" });
      }
      res.json(partner);
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "internal" });
  }
});

// Update partner
partnersRouter.put(
  "/:id",
  validateBody(partnerUpdateSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const updateData = (req as any).validated;

      // Partners can only update their own data
      if (req.user!.role === "PARTNER" && req.user!.partnerId !== id) {
        return res.status(403).json({ error: "Can only update your own partner data" });
      }

      // Filter update data based on role
      let allowedFields = [
        "companyName",
        "managementCompany",
        "streetAddress",
        "city",
        "state",
        "zip",
        "country",
        "numberOfLoungeUnits",
        "topColour",
      ];

      if (req.user!.role === "ADMIN" || req.user!.role === "SUPPORT") {
        allowedFields = [
          ...allowedFields,
          "userPass",
          "userEmail",
          "lock",
          "masterCode",
          "subMasterCode",
          "lockPart",
          "key",
          "latitude",
          "longitude",
        ];
      }

      const filteredData: any = {};
      Object.keys(updateData || {})
        .filter((key) => allowedFields.includes(key))
        .forEach((key) => {
          filteredData[key] = (updateData as any)[key];
        });

      const updatedPartner = await prisma.partner.update({
        where: { id },
        data: filteredData,
      });

      res.json(maskPartner(updatedPartner, req.user!.role));
    } catch (error) {
      console.error("Error updating partner:", error);
      res.status(500).json({ error: "Failed to update partner" });
    }
  },
);

// Delete partner (Admin only)
partnersRouter.delete("/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    await prisma.partner.delete({
      where: { id },
    });

    res.json({ message: "Partner deleted successfully" });
  } catch (error) {
    console.error("Error deleting partner:", error);
    res.status(500).json({ error: "Failed to delete partner" });
  }
});

// Get partner statistics
partnersRouter.get("/:id/stats", requireSupport, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    // Partners can only view their own stats
    if (req.user!.role === "PARTNER" && req.user!.partnerId !== id) {
      return res.status(403).json({ error: "Can only access your own partner statistics" });
    }

    const stats = await prisma.partner.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tickets: true,
            serviceRecords: true,
            calendarEvents: true,
          },
        },
      },
    });

    if (!stats) {
      return res.status(404).json({ error: "Partner not found" });
    }

    // Get ticket statistics
    const ticketStats = await prisma.ticket.groupBy({
      by: ["status"],
      where: { partnerId: id },
      _count: {
        status: true,
      },
    });

    // Get service statistics
    const serviceStats = await prisma.serviceRecord.groupBy({
      by: ["serviceType"],
      where: { partnerId: id },
      _count: {
        serviceType: true,
      },
    });

    res.json({
      totalCounts: stats._count,
      ticketsByStatus: ticketStats,
      servicesByType: serviceStats,
    });
  } catch (error) {
    console.error("Error fetching partner stats:", error);
    res.status(500).json({ error: "Failed to fetch partner statistics" });
  }
});

// Map data endpoint - Support/Admin only
partnersRouter.get("/map", requireSupport, async (req: AuthenticatedRequest, res) => {
  try {
    const partners = await prisma.partner.findMany({
      select: {
        id: true,
        companyName: true,
        latitude: true,
        longitude: true,
        city: true,
        state: true,
      },
    });

    // Fetch open ticket counts per partner
    const openTickets = await prisma.ticket.groupBy({
      by: ["partnerId"],
      where: { status: { notIn: ["RESOLVED", "CLOSED"] } as any },
      _count: { partnerId: true },
    });
    const openLookup = openTickets.reduce<Record<string, number>>((acc, t: any) => {
      acc[t.partnerId] = t._count.partnerId;
      return acc;
    }, {});

    const points = partners
      .filter((p) => typeof p.latitude === "number" && typeof p.longitude === "number")
      .map((p) => ({
        id: p.id,
        name: p.companyName,
        lat: p.latitude,
        lng: p.longitude,
        city: p.city,
        state: p.state,
        openTicketCount: openLookup[p.id] || 0,
      }));

    res.json({ data: points, total: points.length });
  } catch (error) {
    console.error("Error fetching partners map data:", error);
    res.status(500).json({ error: "Failed to fetch partners map data" });
  }
});
