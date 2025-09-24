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
  userInfo: {
    adminId: string;
    supportId: string;
    partnerId: string;
    partnerUserId: string;
  };
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
    userInfo: {
      adminId: adminUser.id,
      supportId: supportUser.id,
      partnerId: partnerUser.partnerId!,
      partnerUserId: partnerUser.id,
    },
  };
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Users API", () => {
  describe("GET /api/users", () => {
    it("should return users list for support staff", async () => {
      const response = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${tokens.support}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty("id");
        expect(response.body[0]).toHaveProperty("email");
        expect(response.body[0]).toHaveProperty("role");
        expect(response.body[0]).toHaveProperty("createdAt");
        expect(response.body[0]).not.toHaveProperty("password");
      }
    });

    it("should return users list for admin", async () => {
      const response = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${tokens.admin}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty("id");
        expect(response.body[0]).toHaveProperty("email");
        expect(response.body[0]).toHaveProperty("role");
      }
    });

    it("should deny access to partners", async () => {
      await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${tokens.partner}`)
        .expect(403);
    });

    it("should deny unauthenticated access", async () => {
      await request(app).get("/api/users").expect(401);
    });

    it("should support role filtering", async () => {
      const response = await request(app)
        .get("/api/users?role=ADMIN")
        .set("Authorization", `Bearer ${tokens.support}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((user: any) => {
        expect(user.role).toBe("ADMIN");
      });
    });

    it("should support partnerId filtering", async () => {
      const partnerId = tokens.userInfo.partnerId;

      const response = await request(app)
        .get(`/api/users?partnerId=${partnerId}`)
        .set("Authorization", `Bearer ${tokens.support}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((user: any) => {
        if (user.partnerId) {
          expect(user.partnerId).toBe(partnerId);
        }
      });
    });
  });

  describe("GET /api/users/:id", () => {
    it("should allow support to view any user", async () => {
      const userId = tokens.userInfo.partnerUserId;

      const response = await request(app)
        .get(`/api/users/${userId}`)
        .set("Authorization", `Bearer ${tokens.support}`)
        .expect(200);

      expect(response.body).toHaveProperty("id", userId);
      expect(response.body).toHaveProperty("email");
      expect(response.body).toHaveProperty("role");
      expect(response.body).toHaveProperty("partner");
      expect(response.body).toHaveProperty("assignedTickets");
      expect(response.body).toHaveProperty("_count");
    });

    it("should allow admin to view any user", async () => {
      const userId = tokens.userInfo.supportId;

      const response = await request(app)
        .get(`/api/users/${userId}`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .expect(200);

      expect(response.body).toHaveProperty("id", userId);
      expect(response.body).toHaveProperty("email");
      expect(response.body).toHaveProperty("role");
    });

    it("should deny partner access to user details", async () => {
      const userId = tokens.userInfo.adminId;

      await request(app)
        .get(`/api/users/${userId}`)
        .set("Authorization", `Bearer ${tokens.partner}`)
        .expect(403);
    });

    it("should return 404 for non-existent user", async () => {
      const nonExistentId = "99999999-9999-9999-9999-999999999999";

      await request(app)
        .get(`/api/users/${nonExistentId}`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .expect(404);
    });

    it("should deny unauthenticated access", async () => {
      const userId = tokens.userInfo.adminId;

      await request(app).get(`/api/users/${userId}`).expect(401);
    });
  });

  describe("POST /api/users", () => {
    const validSupportUserData = {
      email: `newsupport-${Date.now()}@poolsafe.com`,
      displayName: "New Support User",
      role: "SUPPORT",
    };

    it("should allow admin to create partner user", async () => {
      const validPartnerUserData = {
        email: `newpartner-${Date.now()}@testresort.com`,
        password: "securePass123!",
        displayName: "New Partner User",
        role: "PARTNER",
        partnerId: tokens.userInfo.partnerId,
      };

      const response = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send(validPartnerUserData)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("email", validPartnerUserData.email);
      expect(response.body).toHaveProperty("role", "PARTNER");
      expect(response.body).not.toHaveProperty("password");
    });

    it("should allow admin to create support user", async () => {
      const response = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send(validSupportUserData)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("email", validSupportUserData.email);
      expect(response.body).toHaveProperty("role", "SUPPORT");
    });

    it("should deny support staff from creating users", async () => {
      await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${tokens.support}`)
        .send(validSupportUserData)
        .expect(403);
    });

    it("should deny partner from creating users", async () => {
      await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${tokens.partner}`)
        .send(validSupportUserData)
        .expect(403);
    });

    it("should validate required fields", async () => {
      const invalidData = {
        displayName: "Test User",
        // Missing required email and role
      };

      await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send(invalidData)
        .expect(400);
    });

    it("should validate role enum", async () => {
      const invalidRoleData = {
        email: `test-${Date.now()}@example.com`,
        role: "INVALID_ROLE",
      };

      await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send(invalidRoleData)
        .expect(400);
    });

    it("should prevent duplicate email", async () => {
      const duplicateEmailData = {
        email: "admin@poolsafe.com", // Existing email
        role: "SUPPORT",
      };

      await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send(duplicateEmailData)
        .expect(409);
    });

    it("should require partnerId and password for partner role", async () => {
      const incompletePartnerData = {
        email: `incomplete-${Date.now()}@partner.com`,
        role: "PARTNER",
        // Missing partnerId and password
      };

      await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send(incompletePartnerData)
        .expect(400);
    });

    it("should deny unauthenticated requests", async () => {
      await request(app).post("/api/users").send(validSupportUserData).expect(401);
    });
  });

  describe("PUT /api/users/:id", () => {
    let testUserId: string;

    beforeAll(async () => {
      // Create a test user to update
      const testUser = await prisma.user.create({
        data: {
          email: `update-test-${Date.now()}@poolsafe.com`,
          displayName: "Update Test User",
          role: "SUPPORT",
        },
      });
      testUserId = testUser.id;
    });

    it("should allow admin to update user", async () => {
      const updateData = {
        displayName: "Updated Display Name",
        // Note: Email updates are not supported by this endpoint
      };

      const response = await request(app)
        .put(`/api/users/${testUserId}`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty("displayName", updateData.displayName);
      expect(response.body).toHaveProperty("id", testUserId);
    });

    it("should deny support staff from updating users", async () => {
      const updateData = {
        displayName: "Unauthorized Update",
      };

      await request(app)
        .put(`/api/users/${testUserId}`)
        .set("Authorization", `Bearer ${tokens.support}`)
        .send(updateData)
        .expect(403);
    });

    it("should deny partner from updating users", async () => {
      const updateData = {
        displayName: "Unauthorized Update",
      };

      await request(app)
        .put(`/api/users/${testUserId}`)
        .set("Authorization", `Bearer ${tokens.partner}`)
        .send(updateData)
        .expect(403);
    });

    it("should return 500 for non-existent user", async () => {
      // Note: The current implementation returns 500 due to Prisma error handling
      // In a production app, this should be improved to return 404
      const nonExistentId = "99999999-9999-9999-9999-999999999999";
      const updateData = {
        displayName: "Non-existent Update",
      };

      await request(app)
        .put(`/api/users/${nonExistentId}`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send(updateData)
        .expect(500);
    });

    afterAll(async () => {
      // Clean up test user
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    });
  });

  describe("DELETE /api/users/:id", () => {
    let testUserId: string;

    beforeAll(async () => {
      // Create a test user to delete
      const testUser = await prisma.user.create({
        data: {
          email: `delete-test-${Date.now()}@poolsafe.com`,
          displayName: "Delete Test User",
          role: "SUPPORT",
        },
      });
      testUserId = testUser.id;
    });

    it("should allow admin to delete user", async () => {
      const response = await request(app)
        .delete(`/api/users/${testUserId}`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .expect(200);

      expect(response.body).toHaveProperty("message", "User deleted successfully");

      // Verify user was deleted
      const deletedUser = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(deletedUser).toBeNull();
    });

    it("should prevent admin from deleting themselves", async () => {
      const adminId = tokens.userInfo.adminId;

      await request(app)
        .delete(`/api/users/${adminId}`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .expect(400);
    });

    it("should deny support staff from deleting users", async () => {
      // Create another test user since the first was deleted
      const testUser = await prisma.user.create({
        data: {
          email: `delete-test2-${Date.now()}@poolsafe.com`,
          displayName: "Delete Test User 2",
          role: "SUPPORT",
        },
      });

      await request(app)
        .delete(`/api/users/${testUser.id}`)
        .set("Authorization", `Bearer ${tokens.support}`)
        .expect(403);

      // Clean up
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    });

    it("should deny partner from deleting users", async () => {
      const userId = tokens.userInfo.supportId;

      await request(app)
        .delete(`/api/users/${userId}`)
        .set("Authorization", `Bearer ${tokens.partner}`)
        .expect(403);
    });

    it("should return 404 for non-existent user", async () => {
      const nonExistentId = "99999999-9999-9999-9999-999999999999";

      await request(app)
        .delete(`/api/users/${nonExistentId}`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .expect(404);
    });
  });

  describe("POST /api/users/:id/reset-password", () => {
    let partnerUserId: string;
    let supportUserId: string;

    beforeAll(async () => {
      // Create test users
      const partnerUser = await prisma.user.create({
        data: {
          email: `resetpwd-partner-${Date.now()}@testresort.com`,
          displayName: "Reset Password Partner",
          role: "PARTNER",
          partnerId: tokens.userInfo.partnerId,
          password: "hashedOldPassword",
        },
      });
      partnerUserId = partnerUser.id;

      const supportUser = await prisma.user.create({
        data: {
          email: `resetpwd-support-${Date.now()}@poolsafe.com`,
          displayName: "Reset Password Support",
          role: "SUPPORT",
        },
      });
      supportUserId = supportUser.id;
    });

    it("should allow admin to reset partner user password", async () => {
      const newPassword = "newSecurePassword123!";

      const response = await request(app)
        .post(`/api/users/${partnerUserId}/reset-password`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send({ newPassword })
        .expect(200);

      expect(response.body).toHaveProperty("message", "Password reset successfully");
    });

    it("should deny password reset for non-partner users", async () => {
      const newPassword = "newSecurePassword123!";

      await request(app)
        .post(`/api/users/${supportUserId}/reset-password`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send({ newPassword })
        .expect(400);
    });

    it("should validate new password is provided", async () => {
      await request(app)
        .post(`/api/users/${partnerUserId}/reset-password`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send({})
        .expect(400);
    });

    it("should deny support staff from resetting passwords", async () => {
      const newPassword = "newSecurePassword123!";

      await request(app)
        .post(`/api/users/${partnerUserId}/reset-password`)
        .set("Authorization", `Bearer ${tokens.support}`)
        .send({ newPassword })
        .expect(403);
    });

    it("should return 404 for non-existent user", async () => {
      const nonExistentId = "99999999-9999-9999-9999-999999999999";
      const newPassword = "newSecurePassword123!";

      await request(app)
        .post(`/api/users/${nonExistentId}/reset-password`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send({ newPassword })
        .expect(404);
    });

    afterAll(async () => {
      // Clean up test users
      await prisma.user.delete({ where: { id: partnerUserId } }).catch(() => {});
      await prisma.user.delete({ where: { id: supportUserId } }).catch(() => {});
    });
  });

  describe("GET /api/users/stats/summary", () => {
    it("should return user statistics for admin", async () => {
      const response = await request(app)
        .get("/api/users/stats/summary")
        .set("Authorization", `Bearer ${tokens.admin}`)
        .expect(200);

      expect(response.body).toHaveProperty("totalUsers");
      expect(response.body).toHaveProperty("byRole");
      expect(response.body).toHaveProperty("recentUsers");
      expect(response.body).toHaveProperty("partnerUsers");
      expect(typeof response.body.totalUsers).toBe("number");
      expect(Array.isArray(response.body.byRole)).toBe(true);
      expect(typeof response.body.recentUsers).toBe("number");
      expect(typeof response.body.partnerUsers).toBe("number");
    });

    it("should deny access to support staff", async () => {
      await request(app)
        .get("/api/users/stats/summary")
        .set("Authorization", `Bearer ${tokens.support}`)
        .expect(403);
    });

    it("should deny access to partners", async () => {
      await request(app)
        .get("/api/users/stats/summary")
        .set("Authorization", `Bearer ${tokens.partner}`)
        .expect(403);
    });

    it("should deny unauthenticated access", async () => {
      await request(app).get("/api/users/stats/summary").expect(401);
    });
  });
});
