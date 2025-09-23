import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import fs from "fs";
import path from "path";
import { buildApp } from "../src/app";
import { resetDb } from "./utils";
import { createPrismaTestClient } from "./prismaTestFactory";
import { hashPassword, generateToken } from "../src/utils/auth";

const app = buildApp();
const prisma = createPrismaTestClient("test-tickets.db");
let token: string;
let ticketId: string;

beforeAll(async () => {
  await prisma.$connect();
  await resetDb(prisma);
  const partner = await prisma.partner.create({ data: { companyName: "Attach Partner" } });
  const user = await prisma.user.create({
    data: {
      email: "attach_partner@example.com",
      password: await hashPassword("Password123!"),
      role: "PARTNER",
      partnerId: partner.id,
    },
  });
  token = generateToken(user.id, user.email, user.role, partner.id);
  const ticket = await prisma.ticket.create({
    data: {
      subject: "Upload test",
      description: "Testing upload",
      createdByName: user.email,
      partnerId: partner.id,
    },
  });
  ticketId = ticket.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Attachments upload", () => {
  it("uploads a file and creates attachment metadata", async () => {
    const tmpFile = path.join(process.cwd(), "temp-upload.txt");
    fs.writeFileSync(tmpFile, "hello world");
    const res = await request(app)
      .post("/api/attachments/upload")
      .set("Authorization", `Bearer ${token}`)
      .field("ticketId", ticketId)
      .attach("file", tmpFile);
    expect(res.status).toBe(201);
    expect(res.body.ticketId).toBe(ticketId);
    expect(res.body.filename).toBe("temp-upload.txt");
    fs.unlinkSync(tmpFile);
  });

  it("lists attachments for ticket", async () => {
    const res = await request(app)
      .get(`/api/attachments/ticket/${ticketId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});
