import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validateBody, validateQuery } from "../src/middleware/validate";

describe("Validation Middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn();
  });

  describe("validateBody", () => {
    const testSchema = z.object({
      name: z.string().min(1, "Name is required"),
      age: z.number().positive("Age must be positive"),
      email: z.string().email("Invalid email format"),
    });

    it("should call next() for valid data", () => {
      mockReq.body = {
        name: "John Doe",
        age: 25,
        email: "john@example.com",
      };

      const middleware = validateBody(testSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as any).validated).toEqual({
        name: "John Doe",
        age: 25,
        email: "john@example.com",
      });
    });

    it("should return validation error for invalid data", () => {
      mockReq.body = {
        name: "",
        age: -1,
        email: "invalid-email",
      };

      const middleware = validateBody(testSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const jsonCall = mockRes.json as any;
      const errorResponse = jsonCall.mock.calls[0][0];

      expect(errorResponse.error).toBe("VALIDATION_ERROR");
      expect(Array.isArray(errorResponse.issues)).toBe(true);
      expect(errorResponse.issues.length).toBeGreaterThan(0);

      // Check that we have issues for each field
      const paths = errorResponse.issues.map((issue: any) => issue.path);
      expect(paths).toContain("name");
      expect(paths).toContain("age");
      expect(paths).toContain("email");

      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle array validation", () => {
      const arraySchema = z.object({
        items: z.array(
          z.object({
            id: z.number(),
            name: z.string().min(1),
          }),
        ),
      });

      mockReq.body = {
        items: [
          { id: 1, name: "Valid Item" },
          { id: "invalid", name: "" },
        ],
      };

      const middleware = validateBody(arraySchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const jsonCall = mockRes.json as any;
      const errorResponse = jsonCall.mock.calls[0][0];

      expect(errorResponse.error).toBe("VALIDATION_ERROR");
      expect(Array.isArray(errorResponse.issues)).toBe(true);
      expect(errorResponse.issues.length).toBeGreaterThan(0);
    });
  });

  describe("validateQuery", () => {
    const querySchema = z.object({
      page: z.string().regex(/^\d+$/, "Page must be a number"),
      status: z.enum(["active", "inactive"]).optional(),
    });

    it("should call next() for valid query parameters", () => {
      mockReq.query = {
        page: "1",
        status: "active",
      };

      const middleware = validateQuery(querySchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as any).validatedQuery).toEqual({
        page: "1",
        status: "active",
      });
    });

    it("should handle invalid query parameters", () => {
      mockReq.query = {
        page: "invalid",
        status: "invalid-status",
      };

      const middleware = validateQuery(querySchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const jsonCall = mockRes.json as any;
      const errorResponse = jsonCall.mock.calls[0][0];

      expect(errorResponse.error).toBe("VALIDATION_ERROR");
      expect(Array.isArray(errorResponse.issues)).toBe(true);
      expect(errorResponse.issues.length).toBeGreaterThan(0);
    });
  });
});
