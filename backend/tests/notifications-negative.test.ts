import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app";
import { resetDb } from "./utils";
import { createPrismaTestClient } from "./prismaTestFactory";
import { hashPassword, generateToken } from "../src/utils/auth";

const app = buildApp();
const prisma = createPrismaTestClient("test-auth.db");
let partnerToken: string;
let supportToken: string;
let otherPartnerToken: string;
let targetUserId: string;

beforeAll(async () => {
  await prisma.$connect();
  await resetDb(prisma);
  const partner1 = await prisma.partner.create({ data: { companyName: "NotifP1" } });
  const partner2 = await prisma.partner.create({ data: { companyName: "NotifP2" } });
  const user1 = await prisma.user.create({
    data: {
      email: "p1@example.com",
      password: await hashPassword("Password123!"),
      role: "PARTNER",
      partnerId: partner1.id,
    },
  });
  targetUserId = user1.id;
  const user2 = await prisma.user.create({
    data: {
      email: "p2@example.com",
      password: await hashPassword("Password123!"),
      role: "PARTNER",
      partnerId: partner2.id,
    },
  });
  const supportUser = await prisma.user.create({
    data: {
      email: "sup@example.com",
      password: await hashPassword("Password123!"),
      role: "SUPPORT",
    },
  });
  partnerToken = generateToken(user1.id, user1.email, user1.role, partner1.id);
  otherPartnerToken = generateToken(user2.id, user2.email, user2.role, partner2.id);
  supportToken = generateToken(supportUser.id, supportUser.email, supportUser.role);

  // Create a notification for user1
  await prisma.notification.create({
    data: { userId: targetUserId, type: "INFO", title: "t", message: "m" },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Notifications negative cases", () => {
  it("prevents partner from querying another partner's notifications via userId override", async () => {
    const res = await request(app)
      .get(`/api/notifications?userId=${targetUserId}`)
      .set("Authorization", `Bearer ${otherPartnerToken}`);
    // Should ignore override and return empty list
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });

  it("prevents partner from creating a notification", async () => {
    const res = await request(app)
      .post("/api/notifications")
      .set("Authorization", `Bearer ${partnerToken}`)
      .send({ userId: targetUserId, type: "INFO", title: "x", message: "y" });
    expect(res.status).toBe(403);
  });

  it("allows support to create notification", async () => {
    const res = await request(app)
      .post("/api/notifications")
      .set("Authorization", `Bearer ${supportToken}`)
      .send({ userId: targetUserId, type: "INFO", title: "x", message: "y" });
    expect(res.status).toBe(201);
  });
});
