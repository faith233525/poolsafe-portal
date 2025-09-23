import { Router } from "express";
import { prisma } from "../prismaClient";
import {
  requireAuthenticated,
  requireSupport,
  requireAdmin,
  AuthenticatedRequest,
} from "../utils/auth";

export const attachmentsRouter = Router();

// Placeholder: accept metadata and return stored attachment record
attachmentsRouter.post(
  "/",
  requireAuthenticated,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { filename, filepath, mimetype, size, ticketId } = req.body;
      if (!filename || !filepath || !ticketId) {
        return res
          .status(400)
          .json({ error: "filename, filepath, and ticketId required" });
      }

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
  }
);
