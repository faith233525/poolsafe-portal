import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Response, NextFunction } from "express";
import {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  authenticateToken,
  requireRole,
  requireAdmin,
  requireSupport,
  requireAuthenticated,
  AuthenticatedRequest,
} from "../src/utils/auth";

// Mock jwt and bcrypt
vi.mock("jsonwebtoken");
vi.mock("bcryptjs");

describe("Auth Utilities", () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "test-secret";

    mockReq = {
      headers: {},
      user: undefined,
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();

    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalEnv;
  });

  describe("generateToken", () => {
    it("should generate JWT token with correct payload", () => {
      const mockToken = "mock.jwt.token";
      (jwt.sign as any).mockReturnValue(mockToken);

      const token = generateToken("user123", "test@example.com", "PARTNER", "partner123");

      expect(jwt.sign).toHaveBeenCalledWith(
        {
          userId: "user123",
          email: "test@example.com",
          role: "PARTNER",
          partnerId: "partner123",
        },
        "test-secret",
        { expiresIn: "24h" },
      );
      expect(token).toBe(mockToken);
    });

    it("should generate token without partnerId", () => {
      const mockToken = "mock.jwt.token";
      (jwt.sign as any).mockReturnValue(mockToken);

      const token = generateToken("user123", "admin@example.com", "ADMIN");

      expect(jwt.sign).toHaveBeenCalledWith(
        {
          userId: "user123",
          email: "admin@example.com",
          role: "ADMIN",
          partnerId: undefined,
        },
        "test-secret",
        { expiresIn: "24h" },
      );
      expect(token).toBe(mockToken);
    });
  });

  describe("verifyToken", () => {
    it("should verify valid token and return payload", () => {
      const mockPayload = { userId: "123", email: "test@example.com", role: "PARTNER" };
      (jwt.verify as any).mockReturnValue(mockPayload);

      const result = verifyToken("valid.jwt.token");

      expect(jwt.verify).toHaveBeenCalledWith("valid.jwt.token", "test-secret");
      expect(result).toEqual(mockPayload);
    });

    it("should return null for invalid token", () => {
      (jwt.verify as any).mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const result = verifyToken("invalid.token");

      expect(result).toBeNull();
    });

    it("should return null for expired token", () => {
      (jwt.verify as any).mockImplementation(() => {
        const error = new Error("Token expired");
        error.name = "TokenExpiredError";
        throw error;
      });

      const result = verifyToken("expired.token");

      expect(result).toBeNull();
    });
  });

  describe("hashPassword", () => {
    it("should hash password with bcrypt", async () => {
      const hashedPassword = "hashed.password.123";
      (bcrypt.hash as any).mockResolvedValue(hashedPassword);

      const result = await hashPassword("plaintext-password");

      expect(bcrypt.hash).toHaveBeenCalledWith("plaintext-password", 10);
      expect(result).toBe(hashedPassword);
    });

    it("should handle bcrypt errors", async () => {
      (bcrypt.hash as any).mockRejectedValue(new Error("Hash failed"));

      await expect(hashPassword("password")).rejects.toThrow("Hash failed");
    });
  });

  describe("comparePassword", () => {
    it("should return true for matching passwords", async () => {
      (bcrypt.compare as any).mockResolvedValue(true);

      const result = await comparePassword("plaintext", "hashed.password");

      expect(bcrypt.compare).toHaveBeenCalledWith("plaintext", "hashed.password");
      expect(result).toBe(true);
    });

    it("should return false for non-matching passwords", async () => {
      (bcrypt.compare as any).mockResolvedValue(false);

      const result = await comparePassword("wrong-password", "hashed.password");

      expect(result).toBe(false);
    });
  });

  describe("authenticateToken middleware", () => {
    it("should authenticate valid token and set user", () => {
      const mockPayload = {
        userId: "123",
        email: "test@example.com",
        role: "PARTNER",
        partnerId: "partner123",
      };
      mockReq.headers = { authorization: "Bearer valid.jwt.token" };
      (jwt.verify as any).mockReturnValue(mockPayload);

      authenticateToken(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual({
        id: "123",
        email: "test@example.com",
        role: "PARTNER",
        partnerId: "partner123",
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it("should return 401 for missing token", () => {
      mockReq.headers = {};

      authenticateToken(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Access token required" });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 403 for invalid token", () => {
      mockReq.headers = { authorization: "Bearer invalid.token" };
      (jwt.verify as any).mockImplementation(() => {
        throw new Error("Invalid token");
      });

      authenticateToken(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Invalid or expired token" });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle malformed authorization header", () => {
      mockReq.headers = { authorization: "InvalidFormat" };

      authenticateToken(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Access token required" });
    });
  });

  describe("requireRole middleware", () => {
    beforeEach(() => {
      mockReq.user = {
        id: "123",
        email: "test@example.com",
        role: "PARTNER",
        partnerId: "partner123",
      };
    });

    it("should allow access for authorized role", () => {
      const middleware = requireRole(["PARTNER", "ADMIN"]);

      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should deny access for unauthorized role", () => {
      mockReq.user!.role = "READONLY";
      const middleware = requireRole(["ADMIN"]);

      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Insufficient permissions" });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should deny access for unauthenticated user", () => {
      mockReq.user = undefined;
      const middleware = requireRole(["PARTNER"]);

      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Authentication required" });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("composite middleware", () => {
    it("requireAdmin should require ADMIN role", () => {
      mockReq.headers = { authorization: "Bearer valid.token" };
      const mockPayload = { userId: "123", email: "admin@example.com", role: "ADMIN" };
      (jwt.verify as any).mockReturnValue(mockPayload);

      requireAdmin(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("requireSupport should allow SUPPORT and ADMIN roles", () => {
      mockReq.headers = { authorization: "Bearer valid.token" };
      const mockPayload = { userId: "123", email: "support@example.com", role: "SUPPORT" };
      (jwt.verify as any).mockReturnValue(mockPayload);

      requireSupport(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("requireAuthenticated should allow all valid roles", () => {
      mockReq.headers = { authorization: "Bearer valid.token" };
      const mockPayload = { userId: "123", email: "partner@example.com", role: "PARTNER" };
      (jwt.verify as any).mockReturnValue(mockPayload);

      requireAuthenticated(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
