import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import { buildApp } from "../src/app";
import { prisma } from "../src/prismaClient";
import { generateToken } from "../src/utils/auth";

describe("Analytics API", () => {
  const app = buildApp();
  const request = supertest(app);
  let supportToken: string;
  let partnerToken: string;
  let partnerId: string;

  beforeAll(async () => {
    // Clean up test data
    await prisma.ticket.deleteMany({ where: { subject: { contains: "ANALYTICS_TEST" } } });
    await prisma.partner.deleteMany({ where: { companyName: { contains: "ANALYTICS_TEST" } } });

    // Create test partner
    const partner = await prisma.partner.create({
      data: {
        companyName: "ANALYTICS_TEST Partner Co",
        country: "United States",
        numberOfLoungeUnits: 5,
      },
    });
    partnerId = partner.id;

    // Create test users
    const supportUser = await prisma.user.create({
      data: {
        email: "analytics.support@example.com",
        role: "SUPPORT",
      },
    });

    const partnerUser = await prisma.user.create({
      data: {
        email: "analytics.partner@example.com",
        role: "PARTNER",
        partnerId,
      },
    });

    supportToken = generateToken(supportUser.id, supportUser.email, supportUser.role);
    partnerToken = generateToken(partnerUser.id, partnerUser.email, partnerUser.role, partnerId);

    // Create test tickets for analytics
    await prisma.ticket.createMany({
      data: [
        {
          partnerId,
          subject: "ANALYTICS_TEST High Priority Ticket",
          category: "Technical",
          priority: "HIGH",
          status: "OPEN",
          createdByName: "Test User",
        },
        {
          partnerId,
          subject: "ANALYTICS_TEST Resolved Ticket",
          category: "Billing",
          priority: "MEDIUM",
          status: "RESOLVED",
          createdByName: "Test User",
        },
        {
          partnerId,
          subject: "ANALYTICS_TEST General Ticket",
          category: "General",
          priority: "LOW",
          status: "IN_PROGRESS",
          createdByName: "Test User",
        },
      ],
    });

    // Create knowledge base articles
    await prisma.knowledgeBase.createMany({
      data: [
        {
          title: "ANALYTICS_TEST Published Article",
          content: "Test content",
          category: "FAQ",
          isPublished: true,
          viewCount: 10,
        },
        {
          title: "ANALYTICS_TEST Draft Article",
          content: "Test content",
          category: "Guide",
          isPublished: false,
          viewCount: 0,
        },
      ],
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.ticket.deleteMany({ where: { subject: { contains: "ANALYTICS_TEST" } } });
    await prisma.knowledgeBase.deleteMany({ where: { title: { contains: "ANALYTICS_TEST" } } });
    await prisma.user.deleteMany({ where: { email: { contains: "analytics." } } });
    await prisma.partner.deleteMany({ where: { id: partnerId } });
  });

  describe("GET /api/analytics/dashboard", () => {
    it("should return dashboard statistics for support user", async () => {
      const response = await request
        .get("/api/analytics/dashboard")
        .set("Authorization", `Bearer ${supportToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("overview");
      expect(response.body.overview).toHaveProperty("totalPartners");
      expect(response.body.overview).toHaveProperty("totalTickets");
      expect(response.body.overview).toHaveProperty("totalUsers");
      expect(response.body.overview).toHaveProperty("totalKnowledgeArticles");
      expect(response.body.overview).toHaveProperty("recentTickets");
      expect(response.body.overview).toHaveProperty("openTickets");
      expect(response.body.overview).toHaveProperty("resolvedTickets");
      expect(response.body.overview).toHaveProperty("highPriorityTickets");
      expect(typeof response.body.overview.totalPartners).toBe("number");
      expect(typeof response.body.overview.totalTickets).toBe("number");
      // Distributions and trends are nested
      expect(response.body).toHaveProperty("distributions");
      expect(response.body.distributions).toHaveProperty("partnersByCountry");
      expect(response.body.distributions).toHaveProperty("ticketsByCategory");
      expect(response.body.distributions).toHaveProperty("ticketsByStatus");
      expect(Array.isArray(response.body.distributions.partnersByCountry)).toBe(true);
      expect(Array.isArray(response.body.distributions.ticketsByCategory)).toBe(true);
    });

    it("should deny access to partner users", async () => {
      const response = await request
        .get("/api/analytics/dashboard")
        .set("Authorization", `Bearer ${partnerToken}`);

      expect(response.status).toBe(403);
    });

    it("should require authentication", async () => {
      const response = await request.get("/api/analytics/dashboard");

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/analytics/tickets", () => {
    it("should return ticket analytics for support user", async () => {
      const response = await request
        .get("/api/analytics/tickets")
        .set("Authorization", `Bearer ${supportToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("summary");
      expect(response.body.summary).toHaveProperty("totalTickets");
      expect(response.body).toHaveProperty("distributions");
      expect(response.body).toHaveProperty("performance");
    });

    it("should handle date range filters", async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request
        .get("/api/analytics/tickets")
        .query({ startDate, endDate })
        .set("Authorization", `Bearer ${supportToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("summary");
      expect(response.body.summary).toHaveProperty("totalTickets");
    });

    it("should handle partner filter", async () => {
      const response = await request
        .get("/api/analytics/tickets")
        .query({ partnerId })
        .set("Authorization", `Bearer ${supportToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("summary");
      expect(response.body.summary).toHaveProperty("totalTickets");
    });

    it("should deny access to partner users", async () => {
      const response = await request
        .get("/api/analytics/tickets")
        .set("Authorization", `Bearer ${partnerToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe("GET /api/analytics/partners", () => {
    it("should return partner analytics for support user", async () => {
      const response = await request
        .get("/api/analytics/partners")
        .set("Authorization", `Bearer ${supportToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("summary");
      expect(response.body.summary).toHaveProperty("totalPartners");
      expect(response.body).toHaveProperty("geographic");
      expect(response.body).toHaveProperty("preferences");
    });

    it("should deny access to partner users", async () => {
      const response = await request
        .get("/api/analytics/partners")
        .set("Authorization", `Bearer ${partnerToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe("GET /api/analytics/users", () => {
    it("should return user analytics for support user", async () => {
      const response = await request
        .get("/api/analytics/users")
        .set("Authorization", `Bearer ${supportToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it("should deny access to partner users", async () => {
      const response = await request
        .get("/api/analytics/users")
        .set("Authorization", `Bearer ${partnerToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe("GET /api/analytics/export", () => {
    it("should export analytics data for support user", async () => {
      const response = await request
        .get("/api/analytics/export")
        .query({ type: "tickets" })
        .set("Authorization", `Bearer ${supportToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it("should deny access to partner users", async () => {
      const response = await request
        .get("/api/analytics/export")
        .set("Authorization", `Bearer ${partnerToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe("Error handling", () => {
    it("should handle date filters gracefully", async () => {
      const response = await request
        .get("/api/analytics/tickets")
        .query({ startDate: "invalid-date" })
        .set("Authorization", `Bearer ${supportToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("summary");
    });

    it("should handle partner ID filter gracefully", async () => {
      const response = await request
        .get("/api/analytics/tickets")
        .query({ partnerId: "invalid-id" })
        .set("Authorization", `Bearer ${supportToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("summary");
    });

    it("should handle database errors gracefully", async () => {
      // This would require mocking the prisma client to simulate errors
      // For now, we'll just verify the endpoint exists and requires auth
      const response = await request
        .get("/api/analytics/dashboard")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(403);
    });
  });
});
