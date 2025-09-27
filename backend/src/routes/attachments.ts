import { Router } from "express";
import { uploadsTotal } from "../metrics";
import { uploadLimiter } from "../middleware/rateLimiters";
import { prisma } from "../prismaClient";
import { requireAuthenticated, AuthenticatedRequest } from "../utils/auth";
import { validateBody } from "../middleware/validate";
import { attachmentCreateSchema } from "../validation/schemas";
// @ts-expect-error: multer types may not be present in this workspace
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileTypeFromBuffer } from "file-type";
import { config } from "../lib/config";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = (multer as any).diskStorage({
  destination: (_req: any, _file: any, cb: any) => cb(null, UPLOAD_DIR),
  filename: (_req: any, file: any, cb: any) => {
    const unique = `${Date.now()  }-${  Math.round(Math.random() * 1e9)}`;
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${unique  }-${  sanitized}`);
  },
});
const upload = multer({ storage, limits: { fileSize: config.upload.maxSizeBytes } });

export const attachmentsRouter = Router();

// File upload (multipart) -> stores file then creates attachment row
attachmentsRouter.post(
  "/upload",
  requireAuthenticated,
  uploadLimiter,
  upload.single("file"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { ticketId } = req.body;
      if (!ticketId) {return res.status(400).json({ error: "ticketId required" });}
      const file = (req as any).file;
      if (!file) {return res.status(400).json({ error: "file required" });}

      // Whitelist of allowed extensions and mimetypes
      const allowedExt = [".png", ".jpg", ".jpeg", ".gif", ".pdf", ".txt", ".log", ".csv"];
      const ext = path.extname(file.originalname).toLowerCase();
      if (!allowedExt.includes(ext)) {
        fs.unlink(path.join(UPLOAD_DIR, file.filename), () => {});
        return res.status(415).json({ error: "unsupported_file_type" });
      }

      // Sniff actual file type
      const fileBuffer = fs.readFileSync(path.join(UPLOAD_DIR, file.filename));
      const detected = await fileTypeFromBuffer(fileBuffer).catch(() => null);
      if (detected?.mime && !file.mimetype.startsWith(detected.mime.split("/")[0])) {
        // Basic category mismatch (e.g., claimed image but not an image)
        fs.unlink(path.join(UPLOAD_DIR, file.filename), () => {});
        return res.status(400).json({ error: "mime_mismatch" });
      }

      // Hash for duplicate detection (per ticket)
      const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
      const existing = await prisma.ticketAttachment.findFirst({
        where: { ticketId, filepath: hash },
      });
      if (existing) {
        fs.unlink(path.join(UPLOAD_DIR, file.filename), () => {});
        return res.status(409).json({ error: "duplicate_file" });
      }

      const attachment = await prisma.ticketAttachment.create({
        data: {
          ticketId,
          filename: file.originalname,
          filepath: hash, // store hash as logical key, keep physical file under generated name
          mimetype: file.mimetype,
          size: file.size,
        },
      });
      // Rename physical file to hash (no extension to discourage direct browsing)
      const newPath = path.join(UPLOAD_DIR, hash);
      fs.renameSync(path.join(UPLOAD_DIR, file.filename), newPath);
      uploadsTotal.inc({ userRole: req.user!.role });
      res.status(201).json(attachment);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "upload_failed" });
    }
  },
);

// List attachments for a ticket
attachmentsRouter.get(
  "/ticket/:ticketId",
  requireAuthenticated,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { ticketId } = req.params;
      const items = await prisma.ticketAttachment.findMany({
        where: { ticketId },
        orderBy: { uploadedAt: "desc" },
      });
      res.json({ data: items });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "failed_to_list" });
    }
  },
);

// Metadata-only insert (for already uploaded or external references)
attachmentsRouter.post(
  "/",
  requireAuthenticated,
  validateBody(attachmentCreateSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { filename, filepath, mimetype, size, ticketId } = (req as any).validated;
      const attachment = await prisma.ticketAttachment.create({
        data: {
          filename,
          filepath,
          mimetype: mimetype || "application/octet-stream",
          size: size || 0,
          ticketId,
        },
      });
      res.status(201).json(attachment);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "internal" });
    }
  },
);

// Secure download endpoint
attachmentsRouter.get(
  "/:id/download",
  requireAuthenticated,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const attachment = await prisma.ticketAttachment.findUnique({
        where: { id },
        include: { ticket: { select: { partnerId: true } } },
      });
      if (!attachment) {return res.status(404).json({ error: "Not found" });}

      // Partner ownership check unless staff role
      const isStaff = req.user!.role === "ADMIN" || req.user!.role === "SUPPORT";
      if (!isStaff) {
        if (!req.user!.partnerId || req.user!.partnerId !== attachment.ticket.partnerId) {
          return res.status(403).json({ error: "Forbidden" });
        }
      }

      const absolutePath = path.join(UPLOAD_DIR, attachment.filepath);
      if (!fs.existsSync(absolutePath)) {
        return res.status(410).json({ error: "File no longer available" });
      }
      res.setHeader("Content-Type", attachment.mimetype || "application/octet-stream");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${attachment.filename.replace(/"/g, "")}"`,
      );
      fs.createReadStream(absolutePath).pipe(res);
    } catch (e) {
      console.error(e);
      if (!res.headersSent) {res.status(500).json({ error: "download_failed" });}
    }
  },
);
