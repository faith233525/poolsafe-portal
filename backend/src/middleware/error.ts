import { Request, Response, NextFunction } from "express";
import { persistError } from "../services/errorLogger";

// Generic operational error wrapper (extensible later for typed errors)
export class AppError extends Error {
  statusCode: number;
  details?: any;
  constructor(message: string, statusCode = 400, details?: any) {
    super(message);
    // Ensure the error name is AppError for identification in logs/tests
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  // Guard against null/undefined error objects
  const safeErr: any = err ?? {};
  const status =
    safeErr.statusCode && Number.isInteger(safeErr.statusCode) ? safeErr.statusCode : 500;
  if (status >= 500) {
    // Fire-and-forget persistence with explicit void and error swallow
    void Promise.resolve(
      persistError(safeErr, {
        severity: status >= 500 ? "high" : "medium",
        type: safeErr.name || "unknown",
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        context: { path: req.path, method: req.method, requestId: (req as any).requestId },
      }),
    ).catch(() => {
      /* ignore error logging failures */
    });
  }
  res.status(status).json({
    error: safeErr.message || "Internal Server Error",
    details: safeErr.details || undefined,
    requestId: (req as any).requestId,
  });
}
