import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app";
import { resetDb as _resetDb } from "./utils";
import { createPrismaTestClient } from "./prismaTestFactory";
import { hashPassword as _hashPassword, generateToken } from "../src/utils/auth";

const app: any = buildApp();
const prisma: any = createPrismaTestClient("test-auth.db");
let supportToken: string;
let partnerToken: string;
let partnerUserId: string;

describe("Notifications", () => {
  let createdId: string;

  beforeAll(async () => {
    await prisma.$connect();
    // Use seeded partner and user (do NOT reset the DB - it was seeded in setup.ts)
    const seededPartner = await prisma.partner.findFirst({
      where: { companyName: "Test Resort 1" },
    });
    const seededUser = await prisma.user.findFirst({ where: { email: "manager1@testresort.com" } });
    const supportUser = await prisma.user.findFirst({ where: { email: "support@poolsafe.com" } });
    if (!seededPartner || !seededUser || !supportUser) {
      throw new Error("Seeded partner or user not found. Check seed script and DB state.");
    }
    partnerToken = generateToken(
      seededUser.id,
      seededUser.email,
      seededUser.role,
      seededPartner.id,
    );
    supportToken = generateToken(supportUser.id, supportUser.email, supportUser.role);
    partnerUserId = seededUser.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("support creates a notification for partner user", async () => {
    const res = await request(app)
      .post("/api/notifications")
      .set("Authorization", `Bearer ${supportToken}`)
      .send({
        userId: partnerUserId,
        type: "INFO",
        title: "Test Notification",
        message: "Test notification",
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    createdId = res.body.id;
  });

  it("partner lists their notifications", async () => {
    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${partnerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("partner marks single notification read", async () => {
    const res = await request(app)
      .post(`/api/notifications/${createdId}/read`)
      .set("Authorization", `Bearer ${partnerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.isRead).toBe(true);
  });

  it("partner marks all notifications read (idempotent)", async () => {
    const res = await request(app)
      .post("/api/notifications/read-all")
      .set("Authorization", `Bearer ${partnerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/All notifications/);
  });
});
