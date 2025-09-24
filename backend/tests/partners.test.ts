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

describe("Partners API", () => {
  describe("GET /api/partners", () => {
    it("should return partners list for support staff", async () => {
      const response = await request(app)
        .get("/api/partners")
        .set("Authorization", `Bearer ${tokens.support}`)
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("page", 1);
      expect(response.body).toHaveProperty("pageSize", 25);
      expect(response.body).toHaveProperty("total");
      expect(response.body).toHaveProperty("totalPages");
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("should return partners list for admin", async () => {
      const response = await request(app)
        .get("/api/partners")
        .set("Authorization", `Bearer ${tokens.admin}`)
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("should deny access to partners", async () => {
      await request(app)
        .get("/api/partners")
        .set("Authorization", `Bearer ${tokens.partner}`)
        .expect(403);
    });

    it("should deny unauthenticated access", async () => {
      await request(app).get("/api/partners").expect(401);
    });

    it("should support pagination", async () => {
      const response = await request(app)
        .get("/api/partners?page=1&pageSize=10")
        .set("Authorization", `Bearer ${tokens.support}`)
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.pageSize).toBe(10);
    });
  });

  describe("GET /api/partners/:id", () => {
    it("should allow partner to view own data", async () => {
      // First get the partner's ID from the token context
      const partnerId = tokens.partnerInfo.partnerId;

      const response = await request(app)
        .get(`/api/partners/${partnerId}`)
        .set("Authorization", `Bearer ${tokens.partner}`)
        .expect(200);

      expect(response.body).toHaveProperty("id", partnerId);
      expect(response.body).toHaveProperty("companyName");
      // Sensitive fields should not be present for partner role
      expect(response.body).not.toHaveProperty("lock");
      expect(response.body).not.toHaveProperty("masterCode");
      expect(response.body).not.toHaveProperty("userPass");
    });

    it("should deny partner access to other partner data", async () => {
      // Use a different partner ID
      const otherPartnerId = "00000000-0000-0000-0000-000000000000";

      await request(app)
        .get(`/api/partners/${otherPartnerId}`)
        .set("Authorization", `Bearer ${tokens.partner}`)
        .expect(403);
    });

    it("should allow support to view any partner", async () => {
      const partnerId = tokens.partnerInfo.partnerId;

      const response = await request(app)
        .get(`/api/partners/${partnerId}`)
        .set("Authorization", `Bearer ${tokens.support}`)
        .expect(200);

      expect(response.body).toHaveProperty("id", partnerId);
      expect(response.body).toHaveProperty("companyName");
      // Support should see all fields
      expect(response.body).toHaveProperty("users");
      expect(response.body).toHaveProperty("tickets");
    });

    it("should allow admin to view any partner", async () => {
      const partnerId = tokens.partnerInfo.partnerId;

      const response = await request(app)
        .get(`/api/partners/${partnerId}`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .expect(200);

      expect(response.body).toHaveProperty("id", partnerId);
      expect(response.body).toHaveProperty("companyName");
      // Admin should see all fields including sensitive ones
      expect(response.body).toHaveProperty("users");
      expect(response.body).toHaveProperty("tickets");
    });

    it("should return 404 for non-existent partner", async () => {
      const nonExistentId = "99999999-9999-9999-9999-999999999999";

      await request(app)
        .get(`/api/partners/${nonExistentId}`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .expect(404);
    });
  });

  describe("POST /api/partners", () => {
    const validPartnerData = {
      companyName: "New Test Resort",
      managementCompany: "Test Management",
      streetAddress: "123 Test St",
      city: "Test City",
      state: "TS",
      zip: "12345",
      country: "USA",
      numberOfLoungeUnits: 5,
      topColour: "Classic Blue",
    };

    it("should allow admin to create partner", async () => {
      const response = await request(app)
        .post("/api/partners")
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send(validPartnerData)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("companyName", validPartnerData.companyName);
      expect(response.body).toHaveProperty("city", validPartnerData.city);
    });

    it("should deny support staff from creating partners", async () => {
      await request(app)
        .post("/api/partners")
        .set("Authorization", `Bearer ${tokens.support}`)
        .send(validPartnerData)
        .expect(403);
    });

    it("should deny partner from creating partners", async () => {
      await request(app)
        .post("/api/partners")
        .set("Authorization", `Bearer ${tokens.partner}`)
        .send(validPartnerData)
        .expect(403);
    });

    it("should validate required fields", async () => {
      const invalidData = {
        managementCompany: "Test Management",
        // Missing required companyName
      };

      await request(app)
        .post("/api/partners")
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send(invalidData)
        .expect(400);
    });

    it("should deny unauthenticated requests", async () => {
      await request(app).post("/api/partners").send(validPartnerData).expect(401);
    });
  });
});
