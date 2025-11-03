import { Router } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { z } from "zod";
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
  if (!partner) {return partner;}
  if (role === "ADMIN" || role === "SUPPORT") {return partner;}
  const sensitive = ["lock", "masterCode", "subMasterCode", "lockPart", "key", "userPass"];
  const clone: any = { ...partner };
  sensitive.forEach((k) => {
    if (k in clone) {delete clone[k];}
  });
  return clone;
}

export const partnersRouter = Router();

// Apply authentication to all routes
partnersRouter.use(authenticateToken);

// File upload setup (memory storage for small admin imports)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Admin: Bulk import partners via CSV or Excel (.xlsx)
// Usage: POST /api/partners/import (multipart/form-data), field name: file
// Optional query: ?dryRun=true -> returns what would be imported without saving
partnersRouter.post("/import", requireAdmin, upload.single("file"), async (req, res) => {
  try {
  const file = (req as any).file as { buffer: Buffer; originalname: string } | undefined;
    if (!file?.buffer || !file.originalname) {
      return res.status(400).json({ error: "Missing file upload" });
    }

    const buf = file.buffer;
    const wb = XLSX.read(buf, { type: "buffer" });
    const firstSheet = wb.SheetNames[0];
    if (!firstSheet) {
      return res.status(400).json({ error: "No sheets found in uploaded file" });
    }
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[firstSheet], {
      defval: null,
      raw: false,
      blankrows: false,
    }) as Array<Record<string, any>>;
    if (!rows.length) {
      return res.status(400).json({ error: "No data rows found in uploaded file" });
    }

    // Column mapping (case-insensitive)
    const mapKey = (k: string) => k.trim().toLowerCase();
    const normalize = (row: Record<string, any>) => {
      const m: Record<string, any> = {};
      for (const [k, v] of Object.entries(row)) {
        m[mapKey(k)] = v;
      }
      return {
        companyName: m.companyname ?? m.company_name ?? m.name,
        managementCompany: m.managementcompany ?? m.management_company,
        streetAddress: m.streetaddress ?? m.address ?? m.street_address,
        city: m.city,
        state: m.state,
        zip: m.zip ?? m.postal ?? m.postalcode,
        country: m.country ?? "USA",
        numberOfLoungeUnits: Number(m.numberofloungeunits ?? m.units ?? 0) || 0,
        topColour: m.topcolour ?? m.top_color ?? m.topcolour,
        latitude: m.latitude ? Number(m.latitude) : null,
        longitude: m.longitude ? Number(m.longitude) : null,
      };
    };

    const normalized = rows
      .map((row: Record<string, any>) => normalize(row))
      .filter((r: { companyName?: string }) => r.companyName);
    if (!normalized.length) {
      return res.status(400).json({ error: "No valid rows with companyName found" });
    }

  const dryRunParam = (req.query as any).dryRun ?? (req.query as any).dryrun;
  const dryRun = typeof dryRunParam === "string" ? dryRunParam.toLowerCase() === "true" : false;

    if (dryRun) {
      return res.json({
        dryRun: true,
        totalRows: rows.length,
        validRows: normalized.length,
        sample: normalized.slice(0, 5),
      });
    }

    let created = 0;
    let updated = 0;
    for (const r of normalized) {
      const existing = await prisma.partner.findUnique({ where: { companyName: r.companyName } });
      if (existing) {
        await prisma.partner.update({
          where: { id: existing.id },
          data: {
            managementCompany: r.managementCompany ?? existing.managementCompany,
            streetAddress: r.streetAddress ?? existing.streetAddress,
            city: r.city ?? existing.city,
            state: r.state ?? existing.state,
            zip: r.zip ?? existing.zip,
            country: r.country ?? existing.country,
            numberOfLoungeUnits: r.numberOfLoungeUnits ?? existing.numberOfLoungeUnits,
            topColour: r.topColour ?? existing.topColour,
            latitude: r.latitude ?? existing.latitude,
            longitude: r.longitude ?? existing.longitude,
          },
        });
        updated += 1;
      } else {
        await prisma.partner.create({
          data: {
            companyName: r.companyName,
            managementCompany: r.managementCompany,
            streetAddress: r.streetAddress,
            city: r.city,
            state: r.state,
            zip: r.zip,
            country: r.country,
            numberOfLoungeUnits: r.numberOfLoungeUnits,
            topColour: r.topColour,
            latitude: r.latitude ?? undefined,
            longitude: r.longitude ?? undefined,
          },
        });
        created += 1;
      }
    }

    res.json({ success: true, created, updated, processed: normalized.length });
  } catch (error: any) {
    console.error("Partner import error:", error);
    res.status(500).json({ error: error?.message || "Failed to import partners" });
  }
});

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
          filteredData[key] = (updateData)[key];
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

// Lock Information Management - Support staff can add/update lock info
const lockInfoSchema = z.object({
  topColour: z.string().optional(),
  lock: z
    .string()
    .refine((val) => !val || val === "MAKE" || val === "L&F", {
      message: "Lock must be either 'MAKE' or 'L&F'",
    })
    .optional(),
  masterCode: z.string().optional(),
  subMasterCode: z.string().optional(),
  lockPart: z.string().optional(),
  key: z.string().optional(),
});

partnersRouter.put(
  "/:id/lock-info",
  requireSupport,
  validateBody(lockInfoSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const lockData = (req as any).validated;

      // Verify partner exists
      const existingPartner = await prisma.partner.findUnique({
        where: { id },
        select: { id: true, companyName: true },
      });

      if (!existingPartner) {
        return res.status(404).json({ error: "Partner not found" });
      }

      // Update only the lock-related fields
      const updatedPartner = await prisma.partner.update({
        where: { id },
        data: lockData,
        select: {
          id: true,
          companyName: true,
          topColour: true,
          lock: true,
          masterCode: true,
          subMasterCode: true,
          lockPart: true,
          key: true,
          updatedAt: true,
        },
      });

      res.json({
        success: true,
        message: "Lock information updated successfully",
        data: updatedPartner,
      });
    } catch (error) {
      console.error("Error updating lock information:", error);
      res.status(500).json({ error: "Failed to update lock information" });
    }
  },
);

// Get Lock Information - Support and Admin only
partnersRouter.get("/:id/lock-info", requireSupport, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const partner = await prisma.partner.findUnique({
      where: { id },
      select: {
        id: true,
        companyName: true,
        topColour: true,
        lock: true,
        masterCode: true,
        subMasterCode: true,
        lockPart: true,
        key: true,
        updatedAt: true,
      },
    });

    if (!partner) {
      return res.status(404).json({ error: "Partner not found" });
    }

    res.json({
      success: true,
      data: partner,
    });
  } catch (error) {
    console.error("Error fetching lock information:", error);
    res.status(500).json({ error: "Failed to fetch lock information" });
  }
});
