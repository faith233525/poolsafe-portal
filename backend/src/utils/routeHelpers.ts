import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Async route wrapper that catches errors and passes them to error handler
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any> | any,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  error: string;
  message: string;
  timestamp: string;
  path: string;
  details?: any;
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: string,
  message: string,
  req: Request,
  details?: any,
): ErrorResponse {
  return {
    error,
    message,
    timestamp: new Date().toISOString(),
    path: req.path,
    ...(details && { details }),
  };
}

/**
 * Common error handler for routes
 */
export function handleRouteError(error: any, req: Request, res: Response, defaultMessage?: string) {
  console.error(`Route error on ${req.method} ${req.path}:`, error);

  // Handle Prisma errors
  if (error.code === "P2002") {
    return res
      .status(409)
      .json(
        createErrorResponse("Conflict", "Resource already exists", req, {
          field: error.meta?.target,
        }),
      );
  }

  if (error.code === "P2025") {
    return res.status(404).json(createErrorResponse("Not Found", "Resource not found", req));
  }

  // Handle validation errors
  if (error.name === "ValidationError") {
    return res
      .status(400)
      .json(createErrorResponse("Validation Error", error.message, req, error.errors));
  }

  // Handle general errors
  const status = error.status || error.statusCode || 500;
  const message = error.message || defaultMessage || "Internal server error";

  return res
    .status(status)
    .json(
      createErrorResponse(status >= 500 ? "Internal Server Error" : "Client Error", message, req),
    );
}

/**
 * Middleware for handling async route errors
 */
export function errorMiddleware(error: any, req: Request, res: Response, _next: NextFunction) {
  handleRouteError(error, req, res);
}
