import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app";
import { createPrismaTestClient } from "./prismaTestFactory";
import jwt from "jsonwebtoken";

const app = buildApp();
const prisma = createPrismaTestClient("test-auth.db");

let tokens: {
  admin: string;
  support: string;
  partner: string;
  partnerInfo: { userId: string; partnerId: string };
};

beforeAll(async () => {
  await prisma.$connect();

  // Get seeded users for token generation
  const adminUser = await prisma.user.findFirst({ where: { email: "admin@poolsafe.com" } });
  const supportUser = await prisma.user.findFirst({ where: { email: "support@poolsafe.com" } });
  const partnerUser = await prisma.user.findFirst({ where: { email: "manager1@testresort.com" } });

  if (!adminUser || !supportUser || !partnerUser) {
    throw new Error("Required seeded users not found. Check seed script and DB state.");
  }

  // Generate JWT tokens for testing
  const JWT_SECRET = process.env.JWT_SECRET || "test-secret";

  tokens = {
    admin: jwt.sign(
      { userId: adminUser.id, email: adminUser.email, role: adminUser.role },
      JWT_SECRET,
      { expiresIn: "24h" },
    ),
    support: jwt.sign(
      { userId: supportUser.id, email: supportUser.email, role: supportUser.role },
      JWT_SECRET,
      { expiresIn: "24h" },
    ),
    partner: jwt.sign(
      {
        userId: partnerUser.id,
        email: partnerUser.email,
        role: partnerUser.role,
        partnerId: partnerUser.partnerId,
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    ),
    partnerInfo: {
      userId: partnerUser.id,
      partnerId: partnerUser.partnerId!,
    },
  };
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Lock Information API", () => {
  describe("PUT /api/partners/:id/lock-info", () => {
    it("should allow support users to update lock information", async () => {
      const lockData = {
        topColour: "Blue",
        lock: "MAKE",
        masterCode: "1234",
        subMasterCode: "5678",
        lockPart: "Part-A1",
        key: "Key-001",
      };

      const response = await request(app)
        .put(`/api/partners/${tokens.partnerInfo.partnerId}/lock-info`)
        .set("Authorization", `Bearer ${tokens.support}`)
        .send(lockData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Lock information updated successfully");
    });

    it("should allow admin users to update lock information", async () => {
      const lockData = {
        topColour: "Red",
        lock: "L&F",
        masterCode: "9999",
        subMasterCode: "8888",
        lockPart: "Part-B2",
        key: "Key-002",
      };

      const response = await request(app)
        .put(`/api/partners/${tokens.partnerInfo.partnerId}/lock-info`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send(lockData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should deny partner users from updating lock information", async () => {
      const lockData = {
        topColour: "Green",
        lock: "MAKE",
      };

      const response = await request(app)
        .put(`/api/partners/${tokens.partnerInfo.partnerId}/lock-info`)
        .set("Authorization", `Bearer ${tokens.partner}`)
        .send(lockData);

      expect(response.status).toBe(403);
    });

    it("should validate lock information data", async () => {
      // Test with invalid data (non-string values)
      const invalidData = {
        topColour: 123,
        lock: true,
        masterCode: null,
      };

      const response = await request(app)
        .put(`/api/partners/${tokens.partnerInfo.partnerId}/lock-info`)
        .set("Authorization", `Bearer ${tokens.support}`)
        .send(invalidData);

      expect(response.status).toBe(400);
    });

    it("should reject invalid lock values", async () => {
      // Test with invalid lock value
      const invalidLockData = {
        topColour: "Blue",
        lock: "INVALID_LOCK_TYPE",
        masterCode: "1234",
      };

      const response = await request(app)
        .put(`/api/partners/${tokens.partnerInfo.partnerId}/lock-info`)
        .set("Authorization", `Bearer ${tokens.support}`)
        .send(invalidLockData);

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/partners/:id/lock-info", () => {
    it("should allow support users to view lock information", async () => {
      const response = await request(app)
        .get(`/api/partners/${tokens.partnerInfo.partnerId}/lock-info`)
        .set("Authorization", `Bearer ${tokens.support}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Note: These values will depend on what was set in previous tests
      expect(response.body.data).toBeDefined();
    });

    it("should allow admin users to view lock information", async () => {
      const response = await request(app)
        .get(`/api/partners/${tokens.partnerInfo.partnerId}/lock-info`)
        .set("Authorization", `Bearer ${tokens.admin}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it("should deny partner users from viewing lock information", async () => {
      const response = await request(app)
        .get(`/api/partners/${tokens.partnerInfo.partnerId}/lock-info`)
        .set("Authorization", `Bearer ${tokens.partner}`);

      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent partner", async () => {
      const response = await request(app)
        .get("/api/partners/99999999-9999-9999-9999-999999999999/lock-info")
        .set("Authorization", `Bearer ${tokens.support}`);

      expect(response.status).toBe(404);
    });

    it("should deny unauthenticated requests", async () => {
      const response = await request(app).get(
        `/api/partners/${tokens.partnerInfo.partnerId}/lock-info`,
      );

      expect(response.status).toBe(401);
    });
  });
});
