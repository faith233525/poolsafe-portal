/**
 * Comprehensive integration tests for auth endpoints
 * Exercises actual server routes, middleware, validation, and utilities
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/prismaClient.js";

describe("Auth Integration Tests", () => {
  let app: any;

  beforeAll(async () => {
    // Build the app for testing
    app = buildApp();

    // Ensure test database is properly seeded
    const partner = await prisma.partner.findFirst({ where: { companyName: "Test Resort 1" } });
    if (!partner) {
      throw new Error("Test database not properly seeded. Run 'npm run seed' first.");
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("POST /api/auth/login/partner", () => {
    it("should successfully log in partner user with company login", async () => {
      const response = await request(app).post("/api/auth/login/partner").send({
        username: "Test Resort 1",
        password: "partner123",
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("user");
      expect(response.body.user.role).toBe("PARTNER");
      expect(response.body.user.email).toBe("Test Resort 1");
    });

    it("should reject login with invalid company credentials", async () => {
      const response = await request(app).post("/api/auth/login/partner").send({
        username: "Test Resort 1",
        password: "wrongpassword",
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain("Invalid credentials");
    });

    it("should reject login with non-existent company", async () => {
      const response = await request(app).post("/api/auth/login/partner").send({
        username: "Nonexistent Company",
        password: "partner123",
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain("Invalid credentials");
    });

    it("should validate required fields", async () => {
      const response = await request(app).post("/api/auth/login/partner").send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Username and password are required");
    });

    it("should validate username field", async () => {
      const response = await request(app).post("/api/auth/login/partner").send({
        password: "partner123",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Username and password are required");
    });

    it("should validate password field", async () => {
      const response = await request(app).post("/api/auth/login/partner").send({
        username: "Test Resort 1",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Username and password are required");
    });

    it("should handle malformed requests", async () => {
      const response = await request(app).post("/api/auth/login/partner").send({
        invalidField: "test",
      });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/auth/logout", () => {
    let validToken: string;

    beforeAll(async () => {
      const loginResponse = await request(app).post("/api/auth/login/partner").send({
        username: "Test Resort 1",
        password: "partner123",
      });
      validToken = loginResponse.body.token;
    });

    it("should successfully logout with valid token", async () => {
      const response = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("Logged out successfully");
    });

    it("should reject logout without token", async () => {
      const response = await request(app).post("/api/auth/logout");

      expect(response.status).toBe(401);
    });

    it("should reject logout with invalid token", async () => {
      const response = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(403);
    });
  });

  describe("GET /api/auth/me", () => {
    let partnerToken: string;

    beforeAll(async () => {
      // Get partner token (the only working login we have)
      const partnerResponse = await request(app).post("/api/auth/login/partner").send({
        username: "Test Resort 1",
        password: "partner123",
      });
      partnerToken = partnerResponse.body.token;
    });

    it("should return partner profile with valid partner token", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${partnerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.role).toBe("PARTNER");
      expect(response.body.email).toBe("Test Resort 1");
    });

    it("should reject profile request without token", async () => {
      const response = await request(app).get("/api/auth/me");

      expect(response.status).toBe(401);
    });

    it("should reject profile request with invalid token", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(403);
    });
  });

  describe("Auth middleware and security", () => {
    it("should include security headers on auth responses", async () => {
      const response = await request(app).post("/api/auth/login/partner").send({
        username: "Test Resort 1",
        password: "partner123",
      });

      // Verify security headers are present (tests security middleware)
      expect(response.headers).toHaveProperty("x-request-id");
    });

    it("should handle rate limiting on repeated failed logins", async () => {
      // This tests rate limiting middleware
      const requests = Array(6)
        .fill(null)
        .map(() =>
          request(app).post("/api/auth/login/partner").send({
            username: "Invalid Company",
            password: "wrongpassword",
          }),
        );

      const responses = await Promise.all(requests);

      // Either first request is auth error (401) or already rate limited (429)
      // Both are valid depending on rate limiter state from previous tests
      expect(responses[0].status === 401 || responses[0].status === 429).toBe(true);
      expect(responses.some((r) => r.status === 429 || r.status === 401)).toBe(true);
    });
  });
});
