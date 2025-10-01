import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import { AppError, errorHandler } from "../src/middleware/error";
import * as errorLogger from "../src/services/errorLogger";

// Mock the errorLogger service
vi.mock("../src/services/errorLogger", () => ({
  persistError: vi.fn(),
}));

describe("Error Middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      ip: "127.0.0.1",
      path: "/test",
      method: "GET",
      headers: {
        "user-agent": "test-agent",
      },
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  describe("AppError", () => {
    it("should create an AppError with message and default status code", () => {
      const error = new AppError("Test error");

      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(400);
      expect(error.details).toBeUndefined();
      expect(error instanceof Error).toBe(true);
    });

    it("should create an AppError with custom status code", () => {
      const error = new AppError("Not found", 404);

      expect(error.message).toBe("Not found");
      expect(error.statusCode).toBe(404);
    });

    it("should create an AppError with details", () => {
      const details = { field: "email", code: "INVALID" };
      const error = new AppError("Validation error", 422, details);

      expect(error.message).toBe("Validation error");
      expect(error.statusCode).toBe(422);
      expect(error.details).toEqual(details);
    });
  });

  describe("errorHandler", () => {
    it("should handle AppError with custom status code", () => {
      const error = new AppError("Test error", 404);
      (mockReq as any).requestId = "test-request-id";

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Test error",
        details: undefined,
        requestId: "test-request-id",
      });
      expect(errorLogger.persistError).not.toHaveBeenCalled();
    });

    it("should handle generic Error with default 500 status", () => {
      const error = new Error("Generic error");
      (mockReq as any).requestId = "test-request-id";

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Generic error",
        details: undefined,
        requestId: "test-request-id",
      });
      expect(errorLogger.persistError).toHaveBeenCalledWith(error, {
        severity: "high",
        type: "Error",
        ipAddress: "127.0.0.1",
        userAgent: "test-agent",
        context: {
          path: "/test",
          method: "GET",
          requestId: "test-request-id",
        },
      });
    });

    it("should persist server errors (status >= 500)", () => {
      const error = new AppError("Internal server error", 500);
      (mockReq as any).requestId = "test-request-id";

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(errorLogger.persistError).toHaveBeenCalledWith(error, {
        severity: "high",
        type: "AppError",
        ipAddress: "127.0.0.1",
        userAgent: "test-agent",
        context: {
          path: "/test",
          method: "GET",
          requestId: "test-request-id",
        },
      });
    });

    it("should not persist client errors (status < 500)", () => {
      const error = new AppError("Bad request", 400);
      (mockReq as any).requestId = "test-request-id";

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(errorLogger.persistError).not.toHaveBeenCalled();
    });

    it("should include error details when available", () => {
      const details = { validationErrors: ["field required"] };
      const error = new AppError("Validation failed", 422, details);
      (mockReq as any).requestId = "test-request-id";

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Validation failed",
        details,
        requestId: "test-request-id",
      });
    });

    it("should handle errors without name property", () => {
      const error = { message: "Custom error", statusCode: 500 };
      (mockReq as any).requestId = "test-request-id";

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(errorLogger.persistError).toHaveBeenCalledWith(error, {
        severity: "high",
        type: "unknown",
        ipAddress: "127.0.0.1",
        userAgent: "test-agent",
        context: {
          path: "/test",
          method: "GET",
          requestId: "test-request-id",
        },
      });
    });

    it("should handle errors without message", () => {
      const error = { statusCode: 500 };
      (mockReq as any).requestId = "test-request-id";

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Internal Server Error",
        details: undefined,
        requestId: "test-request-id",
      });
    });

    it("should handle errors without requestId", () => {
      const error = new AppError("Test error", 400);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Test error",
        details: undefined,
        requestId: undefined,
      });
    });

    it("should handle errors without user agent", () => {
      const error = new AppError("Server error", 500);
      (mockReq as any).requestId = "test-request-id";
      mockReq.headers = {};

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(errorLogger.persistError).toHaveBeenCalledWith(error, {
        severity: "high",
        type: "AppError",
        ipAddress: "127.0.0.1",
        userAgent: undefined,
        context: {
          path: "/test",
          method: "GET",
          requestId: "test-request-id",
        },
      });
    });

    it("should handle non-integer status codes", () => {
      const error = { statusCode: "not-a-number", message: "Test" };
      (mockReq as any).requestId = "test-request-id";

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it("should handle null error object", () => {
      const error = null;
      (mockReq as any).requestId = "test-request-id";

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Internal Server Error",
        details: undefined,
        requestId: "test-request-id",
      });
    });
  });
});
