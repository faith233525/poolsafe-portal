import { Router } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { z } from "zod";
import { prisma } from "../prismaClient";
import { requireAdmin, AuthenticatedRequest } from "../utils/auth";
import { hashPassword } from "../utils/auth";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const usersImportRouter = Router();

// Admin: Bulk import support/admin users via CSV or Excel (.xlsx)
// Usage: POST /api/users/import (multipart/form-data), field name: file
// Optional query: ?dryRun=true -> returns what would be imported without saving
usersImportRouter.post("/import", requireAdmin, upload.single("file"), async (req, res) => {
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
        email: m.email,
        displayName: m.displayname ?? m.display_name ?? m.name,
        role: (m.role ?? "SUPPORT").toUpperCase(),
        password: m.password,
      };
    };

    const normalized = rows
      .map((row: Record<string, any>) => normalize(row))
      .filter((r: { email?: string }) => r.email);
    if (!normalized.length) {
      return res.status(400).json({ error: "No valid rows with email found" });
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
      const existing = await prisma.user.findUnique({ where: { email: r.email.toLowerCase() } });
      
      if (existing) {
        // Update displayName and role if provided
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            displayName: r.displayName ?? existing.displayName,
            role: ["ADMIN", "SUPPORT"].includes(r.role) ? r.role : existing.role,
          },
        });
        updated += 1;
      } else {
        // Create new user with hashed password
        const hashedPassword = r.password ? await hashPassword(r.password) : await hashPassword("ChangeMe123!!");
        await prisma.user.create({
          data: {
            email: r.email.toLowerCase(),
            displayName: r.displayName || r.email,
            role: ["ADMIN", "SUPPORT"].includes(r.role) ? r.role : "SUPPORT",
            password: hashedPassword,
          },
        });
        created += 1;
      }
    }

    res.json({ success: true, created, updated, processed: normalized.length });
  } catch (error: any) {
    console.error("User import error:", error);
    res.status(500).json({ error: error?.message || "Failed to import users" });
  }
});
