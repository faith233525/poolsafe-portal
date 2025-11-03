import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAdmin, requireSupport, AuthenticatedRequest } from "../utils/auth";

const ASSETS_DIR = path.join(process.cwd(), "uploads", "assets");
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// Video/logo upload setup (memory storage for small admin uploads)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB for videos
});

export const assetsRouter = Router();

// Upload logo (admin only) - stores as logo.png/jpg/svg
assetsRouter.post(
  "/logo",
  requireAdmin,
  upload.single("file"),
  (req: AuthenticatedRequest, res) => {
    try {
      const file = (req as any).file as { buffer: Buffer; originalname: string } | undefined;
      if (!file?.buffer) {
        return res.status(400).json({ error: "Missing file upload" });
      }

      const ext = path.extname(file.originalname).toLowerCase();
      const allowedExt = [".png", ".jpg", ".jpeg", ".svg", ".webp"];
      if (!allowedExt.includes(ext)) {
        return res.status(415).json({ error: "Logo must be PNG, JPG, SVG, or WebP" });
      }

      const filename = `logo${ext}`;
      const filepath = path.join(ASSETS_DIR, filename);
      
      // Remove old logos
      const existing = fs.readdirSync(ASSETS_DIR).filter((f) => f.startsWith("logo."));
      existing.forEach((f) => fs.unlinkSync(path.join(ASSETS_DIR, f)));

      fs.writeFileSync(filepath, file.buffer);
      res.json({ success: true, filename, url: `/api/assets/logo${ext}` });
    } catch (error: any) {
      console.error("Logo upload error:", error);
      res.status(500).json({ error: error?.message || "Failed to upload logo" });
    }
  },
);

// Upload video (admin/support) - stores with sanitized original name
assetsRouter.post(
  "/video",
  requireSupport,
  upload.single("file"),
  (req: AuthenticatedRequest, res) => {
    try {
      const file = (req as any).file as { buffer: Buffer; originalname: string } | undefined;
      if (!file?.buffer) {
        return res.status(400).json({ error: "Missing file upload" });
      }

      const ext = path.extname(file.originalname).toLowerCase();
      const allowedExt = [".mp4", ".webm", ".mov", ".avi"];
      if (!allowedExt.includes(ext)) {
        return res.status(415).json({ error: "Video must be MP4, WebM, MOV, or AVI" });
      }

      // Sanitize filename
      const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
      const timestamp = Date.now();
      const filename = `${basename}_${timestamp}${ext}`;
      const filepath = path.join(ASSETS_DIR, filename);

      fs.writeFileSync(filepath, file.buffer);
      res.json({ success: true, filename, url: `/api/assets/${filename}` });
    } catch (error: any) {
      console.error("Video upload error:", error);
      res.status(500).json({ error: error?.message || "Failed to upload video" });
    }
  },
);

// List all assets (admin only)
assetsRouter.get("/", requireAdmin, (req: AuthenticatedRequest, res) => {
  try {
    const files = fs.readdirSync(ASSETS_DIR);
    const assets = files.map((f) => ({
      filename: f,
      url: `/api/assets/${f}`,
      size: fs.statSync(path.join(ASSETS_DIR, f)).size,
      uploaded: fs.statSync(path.join(ASSETS_DIR, f)).mtime,
    }));
    res.json({ data: assets });
  } catch (error: any) {
    console.error("List assets error:", error);
    res.status(500).json({ error: error?.message || "Failed to list assets" });
  }
});

// Serve asset (public read)
assetsRouter.get("/:filename", (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(ASSETS_DIR, filename);

    if (!fs.existsSync(filepath) || !filename.match(/^[a-zA-Z0-9._-]+$/)) {
      return res.status(404).json({ error: "Asset not found" });
    }

    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mov": "video/quicktime",
      ".avi": "video/x-msvideo",
    };

    res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
    fs.createReadStream(filepath).pipe(res);
  } catch (error) {
    console.error("Serve asset error:", error);
    res.status(500).json({ error: "Failed to serve asset" });
  }
});

// Delete asset (admin only)
assetsRouter.delete("/:filename", requireAdmin, (req: AuthenticatedRequest, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(ASSETS_DIR, filename);

    if (!fs.existsSync(filepath) || !filename.match(/^[a-zA-Z0-9._-]+$/)) {
      return res.status(404).json({ error: "Asset not found" });
    }

    fs.unlinkSync(filepath);
    res.json({ success: true, message: "Asset deleted" });
  } catch (error: any) {
    console.error("Delete asset error:", error);
    res.status(500).json({ error: error?.message || "Failed to delete asset" });
  }
});
