import { Request, Response, NextFunction } from "express";

// Generic operational error wrapper (extensible later for typed errors)
export class AppError extends Error {
  statusCode: number;
  details?: any;
  constructor(message: string, statusCode = 400, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  if (status >= 500) {
    console.error("[ERROR]", err);
  }
  res.status(status).json({
    error: err.message || "Internal Server Error",
    details: err.details || undefined,
  });
}