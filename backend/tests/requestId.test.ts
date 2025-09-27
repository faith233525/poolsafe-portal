import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import { requestId } from "../src/middleware/requestId";

describe("RequestId Middleware", () => {
  let mockReq: any;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      setHeader: vi.fn(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it("should generate and set request ID", () => {
    requestId(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.requestId).toBeDefined();
    expect(typeof mockReq.requestId).toBe("string");
    expect(mockReq.requestId.length).toBeGreaterThan(0);
    expect(mockRes.setHeader).toHaveBeenCalledWith("X-Request-ID", mockReq.requestId);
    expect(mockNext).toHaveBeenCalled();
  });

  it("should generate unique IDs for concurrent requests", () => {
    const req1: any = { headers: {} };
    const req2: any = { headers: {} };
    const res = { setHeader: vi.fn() } as any;

    requestId(req1, res, mockNext);
    requestId(req2, res, mockNext);

    expect(req1.requestId).toBeDefined();
    expect(req2.requestId).toBeDefined();
    expect(req1.requestId).not.toBe(req2.requestId);
  });

  it("should generate UUID format", () => {
    requestId(mockReq as Request, mockRes as Response, mockNext);

    // UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(mockReq.requestId).toMatch(uuidRegex);
  });

  it("should call next middleware", () => {
    requestId(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith();
  });
});
