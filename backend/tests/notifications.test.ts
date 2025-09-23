import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app";
import { resetDb } from "./utils";
import { createPrismaTestClient } from "./prismaTestFactory";
import { hashPassword, generateToken } from "../src/utils/auth";

const app = buildApp();
const prisma = createPrismaTestClient("test-auth.db");
let supportToken: string;
let partnerToken: string;
let partnerUserId: string;

beforeAll(async () => {
  await prisma.$connect();
  await resetDb(prisma);
  const partner = await prisma.partner.create({ data: { companyName: "Notif Partner" } });
  const partnerUser = await prisma.user.create({
    data: {
      email: "notif_partner@example.com",
      password: await hashPassword("Password123!"),
      role: "PARTNER",
      partnerId: partner.id,
    },
  });
  partnerUserId = partnerUser.id;
  partnerToken = generateToken(partnerUser.id, partnerUser.email, partnerUser.role, partner.id);
  const supportUser = await prisma.user.create({
    data: {
      email: "support@example.com",
      password: await hashPassword("Password123!"),
      role: "SUPPORT",
    },
  });
  supportToken = generateToken(supportUser.id, supportUser.email, supportUser.role);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Notifications", () => {
  let createdId: string;
  it("support creates a notification for partner user", async () => {
    const res = await request(app)
      .post("/api/notifications")
      .set("Authorization", `Bearer ${supportToken}`)
      .send({ userId: partnerUserId, type: "INFO", message: "Test notification" });
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
