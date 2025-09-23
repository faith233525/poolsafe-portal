import { Router } from "express";
import { prisma } from "../prismaClient";
import {
  authenticateToken,
  requireAdmin,
  requireSupport,
  AuthenticatedRequest,
} from "../utils/auth";

export const partnersRouter = Router();

// Apply authentication to all routes
partnersRouter.use(authenticateToken);

// Get all partners (with role-based field filtering)
partnersRouter.get(
  "/",
  requireSupport,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user!.role === "ADMIN" || req.user!.role === "SUPPORT") {
        // Admin/Support get all fields + relationships
        const partners = await prisma.partner.findMany({
          include: {
            users: {
              select: {
                id: true,
                email: true,
                displayName: true,
                role: true,
              },
            },
            tickets: {
              select: {
                id: true,
                subject: true,
                status: true,
                priority: true,
                createdAt: true,
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 5, // Last 5 tickets
            },
            _count: {
              select: {
                tickets: true,
                serviceRecords: true,
                calendarEvents: true,
              },
            },
          },
        });
        res.json(partners);
      } else {
        // Partners get limited fields only - shouldn't reach here due to requireSupport
        return res.status(403).json({ error: "Insufficient permissions" });
      }
    } catch (error) {
      console.error("Error fetching partners:", error);
      res.status(500).json({ error: "Failed to fetch partners" });
    }
  }
);

// Create partner (admin)
partnersRouter.post(
  "/",
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const partnerData = req.body;
      if (!partnerData.companyName) {
        return res.status(400).json({ error: "companyName required" });
      }

      const partner = await prisma.partner.create({
        data: {
          // Business Info
          companyName: partnerData.companyName,
          managementCompany: partnerData.managementCompany,
          streetAddress: partnerData.streetAddress,
          city: partnerData.city,
          state: partnerData.state,
          zip: partnerData.zip,
          country: partnerData.country,
          // LounGenie Info
          numberOfLoungeUnits: partnerData.numberOfLoungeUnits || 0,
          topColour: partnerData.topColour,
          // Login Info
          userPass: partnerData.userPass,
          userEmail: partnerData.userEmail,
          // Lock Info (Admin only)
          lock: partnerData.lock,
          masterCode: partnerData.masterCode,
          subMasterCode: partnerData.subMasterCode,
          lockPart: partnerData.lockPart,
          key: partnerData.key,
          // Map Info
          latitude: partnerData.latitude,
          longitude: partnerData.longitude,
        },
      });

      res.status(201).json(partner);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "internal" });
    }
  }
);

// Get partner by ID (with role-based access)
partnersRouter.get("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    // Partners can only view their own data
    if (req.user!.role === "PARTNER" && req.user!.partnerId !== id) {
      return res
        .status(403)
        .json({ error: "Can only access your own partner data" });
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
      res.json(partner);
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
partnersRouter.put("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Partners can only update their own data
    if (req.user!.role === "PARTNER" && req.user!.partnerId !== id) {
      return res
        .status(403)
        .json({ error: "Can only update your own partner data" });
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
    Object.keys(updateData)
      .filter((key) => allowedFields.includes(key))
      .forEach((key) => {
        filteredData[key] = updateData[key];
      });

    const updatedPartner = await prisma.partner.update({
      where: { id },
      data: filteredData,
    });

    res.json(updatedPartner);
  } catch (error) {
    console.error("Error updating partner:", error);
    res.status(500).json({ error: "Failed to update partner" });
  }
});

// Delete partner (Admin only)
partnersRouter.delete(
  "/:id",
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
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
  }
);

// Get partner statistics
partnersRouter.get(
  "/:id/stats",
  requireSupport,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;

      // Partners can only view their own stats
      if (req.user!.role === "PARTNER" && req.user!.partnerId !== id) {
        return res
          .status(403)
          .json({ error: "Can only access your own partner statistics" });
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
  }
);
