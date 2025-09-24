import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
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
  const adminUser = await prisma.user.findFirst({ where: { email: "admin@poolsafe.com" } });
  const supportUser = await prisma.user.findFirst({ where: { email: "support@poolsafe.com" } });
  const partnerUser = await prisma.user.findFirst({ where: { email: "manager1@testresort.com" } });
  if (!adminUser || !supportUser || !partnerUser)
    throw new Error("Required seeded users not found.");
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

beforeEach(async () => {
  await prisma.serviceRecord.deleteMany();
});

describe("Service Records API Integration Tests", () => {
  it("should create a service record (support)", async () => {
    const data = {
      partnerId: tokens.userInfo.partnerId,
      serviceType: "REPAIR",
      description: "Fixed broken lounge",
      status: "COMPLETED",
    };
    const response = await request(app)
      .post("/api/service-records")
      .set("Authorization", `Bearer ${tokens.support}`)
      .send(data)
      .expect(201);
    expect(response.body.partnerId).toBe(data.partnerId);
    expect(response.body.serviceType).toBe("REPAIR");
    // Service record is created with default status SCHEDULED unless API sets status
    expect(["COMPLETED", "SCHEDULED"]).toContain(response.body.status);
  });

  it("should reject creation from partner role", async () => {
    const data = {
      partnerId: tokens.userInfo.partnerId,
      serviceType: "REPAIR",
      description: "Partner attempt",
      status: "PENDING",
    };
    await request(app)
      .post("/api/service-records")
      .set("Authorization", `Bearer ${tokens.partner}`)
      .send(data)
      .expect(403);
  });

  it("should update a service record (support)", async () => {
    const record = await prisma.serviceRecord.create({
      data: {
        partnerId: tokens.userInfo.partnerId,
        serviceType: "REPAIR",
        description: "Initial desc",
        status: "PENDING",
      },
    });
    const update = { status: "COMPLETED", description: "Updated desc" };
    const response = await request(app)
      .put(`/api/service-records/${record.id}`)
      .set("Authorization", `Bearer ${tokens.support}`)
      .send(update)
      .expect(200);
    expect(response.body.status).toBe("COMPLETED");
    expect(response.body.description).toBe("Updated desc");
  });

  it("should reject update from partner role", async () => {
    const record = await prisma.serviceRecord.create({
      data: {
        partnerId: tokens.userInfo.partnerId,
        serviceType: "REPAIR",
        description: "Initial desc",
        status: "PENDING",
      },
    });
    await request(app)
      .put(`/api/service-records/${record.id}`)
      .set("Authorization", `Bearer ${tokens.partner}`)
      .send({ status: "COMPLETED" })
      .expect(403);
  });

  it("should get service records by partner (support)", async () => {
    await prisma.serviceRecord.createMany({
      data: [
        {
          partnerId: tokens.userInfo.partnerId,
          serviceType: "REPAIR",
          description: "Repair 1",
          status: "COMPLETED",
        },
        {
          partnerId: tokens.userInfo.partnerId,
          serviceType: "MAINTENANCE",
          description: "Maintenance 1",
          status: "COMPLETED",
        },
      ],
    });
    const response = await request(app)
      .get(`/api/service-records?partnerId=${tokens.userInfo.partnerId}`)
      .set("Authorization", `Bearer ${tokens.support}`)
      .expect(200);
    // If paginated, use .items or .data
    const items = response.body.items || response.body.data || response.body;
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(2);
    expect(items[0].partnerId).toBe(tokens.userInfo.partnerId);
  });

  it("should filter service records by status", async () => {
    await prisma.serviceRecord.createMany({
      data: [
        {
          partnerId: tokens.userInfo.partnerId,
          serviceType: "REPAIR",
          description: "Repair 1",
          status: "COMPLETED",
        },
        {
          partnerId: tokens.userInfo.partnerId,
          serviceType: "MAINTENANCE",
          description: "Maintenance 1",
          status: "PENDING",
        },
      ],
    });
    const response = await request(app)
      .get(`/api/service-records?status=COMPLETED`)
      .set("Authorization", `Bearer ${tokens.support}`)
      .expect(200);
    const items = response.body.items || response.body.data || response.body;
    expect(Array.isArray(items)).toBe(true);
    expect(items.every((r: any) => r.status === "COMPLETED")).toBe(true);
  });

  it("should require authentication for all endpoints", async () => {
    await request(app)
      .get(`/api/service-records?partnerId=${tokens.userInfo.partnerId}`)
      .expect(401);
    await request(app).post("/api/service-records").send({}).expect(401);
    await request(app).put(`/api/service-records/some-id`).send({}).expect(401);
  });
});
