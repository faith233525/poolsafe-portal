import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app";
import { createPrismaTestClient } from "./prismaTestFactory";
import jwt from "jsonwebtoken";

const app = buildApp();
// Use the same seeded test database that the app uses during tests
const testPrisma = createPrismaTestClient("test-auth.db");

describe("Knowledge Base API Integration Tests", () => {
  let tokens: {
    admin: string;
    support: string;
    partner: string;
    userInfo: {
      adminId: string;
      supportId: string;
      partnerId: string;
      partnerUserId: string;
    };
  };

  beforeAll(async () => {
    await testPrisma.$connect();

    // Get seeded users for token generation
    const adminUser = await testPrisma.user.findFirst({ where: { email: "admin@poolsafe.com" } });
    const supportUser = await testPrisma.user.findFirst({
      where: { email: "support@poolsafe.com" },
    });
    const partnerUser = await testPrisma.user.findFirst({
      where: { email: "manager1@testresort.com" },
    });

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
      userInfo: {
        adminId: adminUser.id,
        supportId: supportUser.id,
        partnerId: partnerUser.partnerId!,
        partnerUserId: partnerUser.id,
      },
    };
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up knowledge base articles before each test
    await testPrisma.knowledgeBase.deleteMany();
  });

  describe("GET /api/knowledge-base", () => {
    beforeEach(async () => {
      // Create test articles
      await testPrisma.knowledgeBase.createMany({
        data: [
          {
            title: "Pool Maintenance Guide",
            content: "Complete guide to pool maintenance",
            category: "MAINTENANCE",
            tags: JSON.stringify(["pool", "maintenance", "cleaning"]),
            searchKeywords: "pool maintenance cleaning guide",
            viewCount: 100,
            rating: 4.5,
            isPublished: true,
          },
          {
            title: "Safety Protocol",
            content: "Safety procedures for pool operations",
            category: "SAFETY",
            tags: JSON.stringify(["safety", "protocol"]),
            searchKeywords: "safety protocol procedures",
            viewCount: 50,
            rating: 4.8,
            isPublished: true,
          },
          {
            title: "Draft Article",
            content: "This is a draft article",
            category: "GENERAL",
            searchKeywords: "draft article",
            viewCount: 5,
            isPublished: false,
          },
        ],
      });
    });

    it("should return paginated published articles for authenticated users", async () => {
      const response = await request(app)
        .get("/api/knowledge-base")
        .set("Authorization", `Bearer ${tokens.partner}`)
        .expect(200);

      expect(response.body).toHaveProperty("items");
      expect(response.body).toHaveProperty("pagination");
      expect(response.body.items).toHaveLength(2); // Only published articles
      expect(response.body.pagination.total).toBe(2);
      expect(response.body.items[0].title).toBe("Pool Maintenance Guide"); // Ordered by viewCount desc
    });

    it("should filter articles by category", async () => {
      const response = await request(app)
        .get("/api/knowledge-base?category=SAFETY")
        .set("Authorization", `Bearer ${tokens.partner}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].category).toBe("SAFETY");
    });

    it("should search articles by title and content", async () => {
      const response = await request(app)
        .get("/api/knowledge-base?search=maintenance")
        .set("Authorization", `Bearer ${tokens.partner}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].title).toBe("Pool Maintenance Guide");
    });

    it("should include unpublished articles when published=all (support users)", async () => {
      const response = await request(app)
        .get("/api/knowledge-base?published=all")
        .set("Authorization", `Bearer ${tokens.support}`)
        .expect(200);

      expect(response.body.items).toHaveLength(3); // All articles including draft
    });

    it("should support pagination parameters", async () => {
      const response = await request(app)
        .get("/api/knowledge-base?page=1&pageSize=1")
        .set("Authorization", `Bearer ${tokens.partner}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.pageSize).toBe(1);
      expect(response.body.pagination.total).toBe(2);
    });

    it("should require authentication", async () => {
      await request(app).get("/api/knowledge-base").expect(401);
    });
  });

  describe("GET /api/knowledge-base/:id", () => {
    let testArticleId: string;

    beforeEach(async () => {
      const article = await testPrisma.knowledgeBase.create({
        data: {
          title: "Test Article",
          content: "Test content",
          category: "GENERAL",
          viewCount: 10,
          isPublished: true,
        },
      });
      testArticleId = article.id;
    });

    it("should return article by ID and increment view count", async () => {
      const response = await request(app)
        .get(`/api/knowledge-base/${testArticleId}`)
        .set("Authorization", `Bearer ${tokens.partner}`)
        .expect(200);

      expect(response.body.id).toBe(testArticleId);
      expect(response.body.title).toBe("Test Article");
      expect(response.body.viewCount).toBe(11); // Incremented from 10 to 11
    });

    it("should return 404 for non-existent article", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";
      await request(app)
        .get(`/api/knowledge-base/${nonExistentId}`)
        .set("Authorization", `Bearer ${tokens.partner}`)
        .expect(404);
    });

    it("should require authentication", async () => {
      await request(app).get(`/api/knowledge-base/${testArticleId}`).expect(401);
    });
  });

  describe("POST /api/knowledge-base", () => {
    const validArticleData = {
      title: "New Article",
      content: "Article content here",
      category: "MAINTENANCE",
      tags: ["pool", "maintenance"],
      searchKeywords: "pool maintenance new",
      isPublished: true,
    };

    it("should create article with support role", async () => {
      const response = await request(app)
        .post("/api/knowledge-base")
        .set("Authorization", `Bearer ${tokens.support}`)
        .send(validArticleData)
        .expect(201);

      expect(response.body.title).toBe(validArticleData.title);
      expect(response.body.category).toBe(validArticleData.category);
      expect(JSON.parse(response.body.tags)).toEqual(validArticleData.tags);
      expect(response.body.isPublished).toBe(true);
    });

    it("should create article with admin role", async () => {
      const response = await request(app)
        .post("/api/knowledge-base")
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send(validArticleData)
        .expect(201);

      expect(response.body.title).toBe(validArticleData.title);
    });

    it("should reject creation from partner role", async () => {
      await request(app)
        .post("/api/knowledge-base")
        .set("Authorization", `Bearer ${tokens.partner}`)
        .send(validArticleData)
        .expect(403);
    });

    it("should validate required fields", async () => {
      const invalidData = { title: "A" }; // Too short title, missing content and category

      const response = await request(app)
        .post("/api/knowledge-base")
        .set("Authorization", `Bearer ${tokens.support}`)
        .send(invalidData)
        .expect(400);

      // Our validator returns a standardized code
      expect(response.body.error).toBe("VALIDATION_ERROR");
    });

    it("should create article with optional fields", async () => {
      const minimalData = {
        title: "Minimal Article",
        content: "Basic content",
        category: "GENERAL",
      };

      const response = await request(app)
        .post("/api/knowledge-base")
        .set("Authorization", `Bearer ${tokens.support}`)
        .send(minimalData)
        .expect(201);

      expect(response.body.title).toBe("Minimal Article");
      expect(response.body.isPublished).toBe(true); // Default value
      expect(response.body.viewCount).toBe(0);
    });

    it("should handle attachments and videos arrays", async () => {
      const dataWithMedia = {
        ...validArticleData,
        attachments: [{ filename: "guide.pdf", path: "/files/guide.pdf" }],
        videos: ["https://example.com/video1", "https://example.com/video2"],
      };

      const response = await request(app)
        .post("/api/knowledge-base")
        .set("Authorization", `Bearer ${tokens.support}`)
        .send(dataWithMedia)
        .expect(201);

      expect(JSON.parse(response.body.attachments)).toEqual(dataWithMedia.attachments);
      expect(JSON.parse(response.body.videos)).toEqual(dataWithMedia.videos);
    });

    it("should require authentication", async () => {
      await request(app).post("/api/knowledge-base").send(validArticleData).expect(401);
    });
  });

  describe("PUT /api/knowledge-base/:id", () => {
    let testArticleId: string;

    beforeEach(async () => {
      const article = await testPrisma.knowledgeBase.create({
        data: {
          title: "Original Article",
          content: "Original content",
          category: "GENERAL",
          isPublished: true,
        },
      });
      testArticleId = article.id;
    });

    it("should update article with support role", async () => {
      const updateData = {
        title: "Updated Article",
        content: "Updated content",
        category: "MAINTENANCE",
        isPublished: false,
      };

      const response = await request(app)
        .put(`/api/knowledge-base/${testArticleId}`)
        .set("Authorization", `Bearer ${tokens.support}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe("Updated Article");
      expect(response.body.category).toBe("MAINTENANCE");
      expect(response.body.isPublished).toBe(false);
    });

    it("should update article with admin role", async () => {
      const updateData = { title: "Admin Updated" };

      const response = await request(app)
        .put(`/api/knowledge-base/${testArticleId}`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe("Admin Updated");
    });

    it("should reject updates from partner role", async () => {
      const updateData = { title: "Partner Update" };

      await request(app)
        .put(`/api/knowledge-base/${testArticleId}`)
        .set("Authorization", `Bearer ${tokens.partner}`)
        .send(updateData)
        .expect(403);
    });

    it("should handle partial updates", async () => {
      const updateData = { title: "Partially Updated" };

      const response = await request(app)
        .put(`/api/knowledge-base/${testArticleId}`)
        .set("Authorization", `Bearer ${tokens.support}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe("Partially Updated");
      expect(response.body.content).toBe("Original content"); // Should remain unchanged
    });

    it("should update media arrays correctly", async () => {
      const updateData = {
        tags: ["updated", "tags"],
        attachments: [{ name: "new.pdf" }],
        videos: ["https://new-video.com"],
      };

      const response = await request(app)
        .put(`/api/knowledge-base/${testArticleId}`)
        .set("Authorization", `Bearer ${tokens.support}`)
        .send(updateData)
        .expect(200);

      expect(JSON.parse(response.body.tags)).toEqual(["updated", "tags"]);
      expect(JSON.parse(response.body.attachments)).toEqual([{ name: "new.pdf" }]);
    });

    it("should return 500 for non-existent article", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";
      const updateData = { title: "Update Non-existent" };

      await request(app)
        .put(`/api/knowledge-base/${nonExistentId}`)
        .set("Authorization", `Bearer ${tokens.support}`)
        .send(updateData)
        .expect(500);
    });

    it("should require authentication", async () => {
      await request(app)
        .put(`/api/knowledge-base/${testArticleId}`)
        .send({ title: "Unauthenticated Update" })
        .expect(401);
    });
  });

  describe("DELETE /api/knowledge-base/:id", () => {
    let testArticleId: string;

    beforeEach(async () => {
      const article = await testPrisma.knowledgeBase.create({
        data: {
          title: "Article to Delete",
          content: "Content to delete",
          category: "GENERAL",
          isPublished: true,
        },
      });
      testArticleId = article.id;
    });

    it("should delete article with admin role", async () => {
      const response = await request(app)
        .delete(`/api/knowledge-base/${testArticleId}`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .expect(200);

      expect(response.body.message).toBe("Knowledge base article deleted successfully");

      // Verify article is deleted
      const deletedArticle = await testPrisma.knowledgeBase.findUnique({
        where: { id: testArticleId },
      });
      expect(deletedArticle).toBeNull();
    });

    it("should reject deletion from support role", async () => {
      await request(app)
        .delete(`/api/knowledge-base/${testArticleId}`)
        .set("Authorization", `Bearer ${tokens.support}`)
        .expect(403);
    });

    it("should reject deletion from partner role", async () => {
      await request(app)
        .delete(`/api/knowledge-base/${testArticleId}`)
        .set("Authorization", `Bearer ${tokens.partner}`)
        .expect(403);
    });

    it("should return error for non-existent article", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      await request(app)
        .delete(`/api/knowledge-base/${nonExistentId}`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .expect(500);
    });

    it("should require authentication", async () => {
      await request(app).delete(`/api/knowledge-base/${testArticleId}`).expect(401);
    });
  });

  describe("GET /api/knowledge-base/category/:category", () => {
    beforeEach(async () => {
      await testPrisma.knowledgeBase.createMany({
        data: [
          {
            title: "Safety Article 1",
            content: "Safety content 1",
            category: "SAFETY",
            viewCount: 20,
            isPublished: true,
          },
          {
            title: "Safety Article 2",
            content: "Safety content 2",
            category: "SAFETY",
            viewCount: 30,
            isPublished: true,
          },
          {
            title: "Maintenance Article",
            content: "Maintenance content",
            category: "MAINTENANCE",
            viewCount: 40,
            isPublished: true,
          },
          {
            title: "Draft Safety Article",
            content: "Draft safety content",
            category: "SAFETY",
            viewCount: 10,
            isPublished: false,
          },
        ],
      });
    });

    it("should return published articles by category", async () => {
      const response = await request(app)
        .get("/api/knowledge-base/category/SAFETY")
        .set("Authorization", `Bearer ${tokens.partner}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].category).toBe("SAFETY");
      expect(response.body[1].category).toBe("SAFETY");
      expect(response.body[0].title).toBe("Safety Article 2"); // Ordered by viewCount desc
    });

    it("should include unpublished articles when published=false", async () => {
      const response = await request(app)
        .get("/api/knowledge-base/category/SAFETY?published=false")
        .set("Authorization", `Bearer ${tokens.support}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe("Draft Safety Article");
      expect(response.body[0].isPublished).toBe(false);
    });

    it("should return empty array for non-existent category", async () => {
      const response = await request(app)
        .get("/api/knowledge-base/category/NONEXISTENT")
        .set("Authorization", `Bearer ${tokens.partner}`)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });

    it("should require authentication", async () => {
      await request(app).get("/api/knowledge-base/category/SAFETY").expect(401);
    });
  });

  describe("GET /api/knowledge-base/search/:query", () => {
    beforeEach(async () => {
      await testPrisma.knowledgeBase.createMany({
        data: [
          {
            title: "Pool Cleaning Guide",
            content: "How to clean your pool effectively",
            category: "MAINTENANCE",
            searchKeywords: "pool cleaning maintenance guide",
            viewCount: 50,
            isPublished: true,
          },
          {
            title: "Water Testing Procedures",
            content: "Testing pool water chemistry",
            category: "MAINTENANCE",
            searchKeywords: "water testing chemistry pool",
            viewCount: 30,
            isPublished: true,
          },
          {
            title: "Safety Guidelines",
            content: "Pool safety for families",
            category: "SAFETY",
            searchKeywords: "safety guidelines families",
            viewCount: 40,
            isPublished: true,
          },
        ],
      });
    });

    it("should search articles by title", async () => {
      const response = await request(app)
        .get("/api/knowledge-base/search/cleaning")
        .set("Authorization", `Bearer ${tokens.partner}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe("Pool Cleaning Guide");
    });

    it("should search articles by content", async () => {
      const response = await request(app)
        .get("/api/knowledge-base/search/chemistry")
        .set("Authorization", `Bearer ${tokens.partner}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe("Water Testing Procedures");
    });

    it("should search articles by keywords", async () => {
      const response = await request(app)
        .get("/api/knowledge-base/search/pool")
        .set("Authorization", `Bearer ${tokens.partner}`)
        .expect(200);

      expect(response.body).toHaveLength(2); // Pool Cleaning Guide and Water Testing Procedures
      expect(response.body[0].viewCount).toBeGreaterThan(response.body[1].viewCount); // Ordered by viewCount
    });

    it("should filter search results by category", async () => {
      const response = await request(app)
        .get("/api/knowledge-base/search/pool?category=MAINTENANCE")
        .set("Authorization", `Bearer ${tokens.partner}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      response.body.forEach((article: any) => {
        expect(article.category).toBe("MAINTENANCE");
      });
    });

    it("should return empty array for no matches", async () => {
      const response = await request(app)
        .get("/api/knowledge-base/search/nonexistentterm")
        .set("Authorization", `Bearer ${tokens.partner}`)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });

    it("should require authentication", async () => {
      await request(app).get("/api/knowledge-base/search/pool").expect(401);
    });
  });

  describe("POST /api/knowledge-base/:id/rate", () => {
    let testArticleId: string;

    beforeEach(async () => {
      const article = await testPrisma.knowledgeBase.create({
        data: {
          title: "Article to Rate",
          content: "Content to rate",
          category: "GENERAL",
          rating: null,
          isPublished: true,
        },
      });
      testArticleId = article.id;
    });

    it("should rate article successfully", async () => {
      const response = await request(app)
        .post(`/api/knowledge-base/${testArticleId}/rate`)
        .set("Authorization", `Bearer ${tokens.partner}`)
        .send({ rating: 5 })
        .expect(200);

      expect(response.body.message).toBe("Rating submitted successfully");
      expect(response.body.newRating).toBe(5);
    });

    it("should validate rating range", async () => {
      const response = await request(app)
        .post(`/api/knowledge-base/${testArticleId}/rate`)
        .set("Authorization", `Bearer ${tokens.partner}`)
        .send({ rating: 6 })
        .expect(400);

      expect(response.body.error).toBe("Rating must be between 1 and 5");
    });

    it("should handle invalid rating values", async () => {
      const response = await request(app)
        .post(`/api/knowledge-base/${testArticleId}/rate`)
        .set("Authorization", `Bearer ${tokens.partner}`)
        .send({ rating: 0 })
        .expect(400);

      expect(response.body.error).toBe("Rating must be between 1 and 5");
    });

    it("should return 404 for non-existent article", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      await request(app)
        .post(`/api/knowledge-base/${nonExistentId}/rate`)
        .set("Authorization", `Bearer ${tokens.partner}`)
        .send({ rating: 4 })
        .expect(404);
    });

    it("should calculate average rating with existing rating", async () => {
      // Set initial rating
      await testPrisma.knowledgeBase.update({
        where: { id: testArticleId },
        data: { rating: 4.0 },
      });

      const response = await request(app)
        .post(`/api/knowledge-base/${testArticleId}/rate`)
        .set("Authorization", `Bearer ${tokens.partner}`)
        .send({ rating: 2 })
        .expect(200);

      expect(response.body.newRating).toBe(3); // Average of 4 and 2
    });

    it("should require authentication", async () => {
      await request(app)
        .post(`/api/knowledge-base/${testArticleId}/rate`)
        .send({ rating: 4 })
        .expect(401);
    });
  });

  describe("GET /api/knowledge-base/stats/summary", () => {
    beforeEach(async () => {
      await testPrisma.knowledgeBase.createMany({
        data: [
          {
            title: "Published Article 1",
            content: "Content 1",
            category: "MAINTENANCE",
            viewCount: 100,
            rating: 4.5,
            isPublished: true,
          },
          {
            title: "Published Article 2",
            content: "Content 2",
            category: "SAFETY",
            viewCount: 75,
            rating: 4.8,
            isPublished: true,
          },
          {
            title: "Published Article 3",
            content: "Content 3",
            category: "MAINTENANCE",
            viewCount: 50,
            rating: 4.2,
            isPublished: true,
          },
          {
            title: "Draft Article",
            content: "Draft content",
            category: "GENERAL",
            viewCount: 10,
            isPublished: false,
          },
        ],
      });
    });

    it("should return comprehensive statistics for support users", async () => {
      const response = await request(app)
        .get("/api/knowledge-base/stats/summary")
        .set("Authorization", `Bearer ${tokens.support}`)
        .expect(200);

      expect(response.body).toHaveProperty("totalArticles", 4);
      expect(response.body).toHaveProperty("publishedArticles", 3);
      expect(response.body).toHaveProperty("byCategory");
      expect(response.body).toHaveProperty("topArticles");
      expect(response.body).toHaveProperty("averageRating");

      // Category stats
      expect(response.body.byCategory).toHaveLength(3); // MAINTENANCE, SAFETY, GENERAL
      const maintenanceStats = response.body.byCategory.find(
        (cat: any) => cat.category === "MAINTENANCE",
      );
      expect(maintenanceStats._count.category).toBe(2);

      // Top articles
      expect(response.body.topArticles).toHaveLength(3); // Only published articles
      expect(response.body.topArticles[0].title).toBe("Published Article 1"); // Highest view count

      // Average rating
      expect(response.body.averageRating).toBeCloseTo(4.5, 1); // Average of 4.5, 4.8, 4.2
    });

    it("should return statistics for admin users", async () => {
      const response = await request(app)
        .get("/api/knowledge-base/stats/summary")
        .set("Authorization", `Bearer ${tokens.admin}`)
        .expect(200);

      expect(response.body.totalArticles).toBe(4);
      expect(response.body.publishedArticles).toBe(3);
    });

    it("should reject access from partner users", async () => {
      await request(app)
        .get("/api/knowledge-base/stats/summary")
        .set("Authorization", `Bearer ${tokens.partner}`)
        .expect(403);
    });

    it("should handle empty database", async () => {
      await testPrisma.knowledgeBase.deleteMany();

      const response = await request(app)
        .get("/api/knowledge-base/stats/summary")
        .set("Authorization", `Bearer ${tokens.support}`)
        .expect(200);

      expect(response.body.totalArticles).toBe(0);
      expect(response.body.publishedArticles).toBe(0);
      expect(response.body.byCategory).toHaveLength(0);
      expect(response.body.topArticles).toHaveLength(0);
      expect(response.body.averageRating).toBeNull();
    });

    it("should require authentication", async () => {
      await request(app).get("/api/knowledge-base/stats/summary").expect(401);
    });
  });
});
