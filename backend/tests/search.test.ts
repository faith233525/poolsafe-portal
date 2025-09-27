import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import supertest from "supertest";
import { buildApp } from "../src/app";
import { prisma } from "../src/prismaClient";
import { generateToken } from "../src/utils/auth";

describe("Search API", () => {
  const app = buildApp();
  const request = supertest(app);
  let partnerToken: string;
  let supportToken: string;
  let partnerId: string;
  let ticketId: string;
  let knowledgeBaseId: string;

  beforeAll(async () => {
    // Clean up test data
    await prisma.ticket.deleteMany({ where: { subject: { contains: "TEST_SEARCH" } } });
    await prisma.knowledgeBase.deleteMany({ where: { title: { contains: "TEST_SEARCH" } } });
    await prisma.partner.deleteMany({ where: { companyName: { contains: "TEST_SEARCH" } } });

    // Create test partner
    const partner = await prisma.partner.create({
      data: {
        companyName: "TEST_SEARCH Partner Co",
        streetAddress: "123 Test St",
        city: "Test City",
        state: "TS",
        zip: "12345",
      },
    });
    partnerId = partner.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: "search.test@example.com",
        role: "PARTNER",
        partnerId,
      },
    });

    const supportUser = await prisma.user.create({
      data: {
        email: "support.search@example.com",
        role: "SUPPORT",
      },
    });

    partnerToken = generateToken(user.id, user.email, user.role, partnerId);
    supportToken = generateToken(supportUser.id, supportUser.email, supportUser.role);

    // Create test ticket
    const ticket = await prisma.ticket.create({
      data: {
        partnerId,
        subject: "TEST_SEARCH ticket subject",
        description: "This is a searchable ticket description",
        category: "Technical",
        priority: "HIGH",
        status: "OPEN",
        createdByName: "Test User",
      },
    });
    ticketId = ticket.id;

    // Create test knowledge base entry
    const kb = await prisma.knowledgeBase.create({
      data: {
        title: "TEST_SEARCH knowledge article",
        content: "This is searchable knowledge base content about troubleshooting",
        category: "FAQ",
        searchKeywords: "troubleshooting, help, guide",
        isPublished: true,
      },
    });
    knowledgeBaseId = kb.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.ticket.deleteMany({ where: { id: ticketId } });
    await prisma.knowledgeBase.deleteMany({ where: { id: knowledgeBaseId } });
    await prisma.user.deleteMany({ where: { email: { contains: "search.test" } } });
    await prisma.partner.deleteMany({ where: { id: partnerId } });
  });

  describe("GET /api/search", () => {
    it("should search tickets and knowledge base for partner", async () => {
      const response = await request
        .get("/api/search")
        .query({ q: "TEST_SEARCH" })
        .set("Authorization", `Bearer ${partnerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("tickets");
      expect(response.body).toHaveProperty("knowledgeBase");

      expect(response.body.tickets.data).toHaveLength(1);
      expect(response.body.tickets.data[0].subject).toContain("TEST_SEARCH");

      expect(response.body.knowledgeBase.data).toHaveLength(1);
      expect(response.body.knowledgeBase.data[0].title).toContain("TEST_SEARCH");
    });

    it("should search only tickets when knowledge base is excluded", async () => {
      const response = await request
        .get("/api/search")
        .query({
          q: "TEST_SEARCH",
          includeKnowledge: "false",
        })
        .set("Authorization", `Bearer ${partnerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("tickets");
      expect(response.body).not.toHaveProperty("knowledgeBase");
      expect(response.body.tickets.data).toHaveLength(1);
    });

    it("should search only knowledge base when tickets are excluded", async () => {
      const response = await request
        .get("/api/search")
        .query({
          q: "TEST_SEARCH",
          includeTickets: "false",
        })
        .set("Authorization", `Bearer ${partnerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("knowledgeBase");
      expect(response.body).not.toHaveProperty("tickets");
      expect(response.body.knowledgeBase.data).toHaveLength(1);
    });

    it("should handle pagination for tickets", async () => {
      const response = await request
        .get("/api/search")
        .query({
          q: "TEST_SEARCH",
          ticketsPage: "1",
          ticketsPageSize: "1",
          includeKnowledge: "false",
        })
        .set("Authorization", `Bearer ${partnerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.tickets.page).toBe(1);
      expect(response.body.tickets.pageSize).toBe(1);
      expect(response.body.tickets.data).toHaveLength(1);
    });

    it("should handle pagination for knowledge base", async () => {
      const response = await request
        .get("/api/search")
        .query({
          q: "TEST_SEARCH",
          kbPage: "1",
          kbPageSize: "1",
          includeTickets: "false",
        })
        .set("Authorization", `Bearer ${partnerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.knowledgeBase.page).toBe(1);
      expect(response.body.knowledgeBase.pageSize).toBe(1);
      expect(response.body.knowledgeBase.data).toHaveLength(1);
    });

    it("should return empty results for non-matching query", async () => {
      const response = await request
        .get("/api/search")
        .query({ q: "NonExistentSearchTerm12345" })
        .set("Authorization", `Bearer ${partnerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.tickets.data).toHaveLength(0);
      expect(response.body.knowledgeBase.data).toHaveLength(0);
    });

    it("should search in ticket description", async () => {
      const response = await request
        .get("/api/search")
        .query({ q: "searchable ticket description" })
        .set("Authorization", `Bearer ${partnerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.tickets.data).toHaveLength(1);
    });

    it("should search in knowledge base content", async () => {
      const response = await request
        .get("/api/search")
        .query({ q: "troubleshooting" })
        .set("Authorization", `Bearer ${partnerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.knowledgeBase.data).toHaveLength(1);
    });

    it("should search in knowledge base keywords", async () => {
      const response = await request
        .get("/api/search")
        .query({ q: "guide" })
        .set("Authorization", `Bearer ${partnerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.knowledgeBase.data).toHaveLength(1);
    });

    it("should support case insensitive search", async () => {
      const response = await request
        .get("/api/search")
        .query({ q: "test_search" })
        .set("Authorization", `Bearer ${partnerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.tickets.data.length).toBeGreaterThan(0);
      expect(response.body.knowledgeBase.data.length).toBeGreaterThan(0);
    });

    it("should allow support to see all tickets", async () => {
      const response = await request
        .get("/api/search")
        .query({ q: "TEST_SEARCH" })
        .set("Authorization", `Bearer ${supportToken}`);

      expect(response.status).toBe(200);
      expect(response.body.tickets.data).toHaveLength(1);
    });

    it("should require authentication", async () => {
      const response = await request.get("/api/search").query({ q: "TEST_SEARCH" });

      expect(response.status).toBe(401);
    });

    it("should require valid query parameter", async () => {
      const response = await request
        .get("/api/search")
        .set("Authorization", `Bearer ${partnerToken}`);

      expect(response.status).toBe(400);
    });

    it("should validate page parameters", async () => {
      const response = await request
        .get("/api/search")
        .query({
          q: "TEST_SEARCH",
          ticketsPage: "invalid",
        })
        .set("Authorization", `Bearer ${partnerToken}`);

      expect(response.status).toBe(400);
    });

    it("should handle minimum page size", async () => {
      const response = await request
        .get("/api/search")
        .query({
          q: "TEST_SEARCH",
          ticketsPageSize: "0",
        })
        .set("Authorization", `Bearer ${partnerToken}`);

      expect(response.status).toBe(400);
    });

    it("should handle maximum page size", async () => {
      const response = await request
        .get("/api/search")
        .query({
          q: "TEST_SEARCH",
          ticketsPageSize: "101",
        })
        .set("Authorization", `Bearer ${partnerToken}`);

      expect(response.status).toBe(400);
    });
  });
});
