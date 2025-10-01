import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";

// Use an isolated DB so this suite doesn't wipe the globally seeded test DB
const ISOLATED_DB = "test-email.db";
let prisma: PrismaClient;
let createTicketFromEmail: (args: { from: string; subject: string; text: string }) => Promise<any>;

describe("createTicketFromEmail", () => {
  beforeAll(async () => {
    // Ensure schema exists for the isolated database
    execSync(`npx prisma db push --accept-data-loss`, {
      stdio: "pipe",
      env: { ...process.env, DATABASE_URL: `file:./${ISOLATED_DB}` },
    });

    prisma = new PrismaClient({
      datasources: { db: { url: `file:./${ISOLATED_DB}` } },
    });

    // Mock the prisma used by the service to point to our isolated client
    vi.doMock("../src/prismaClient", () => ({
      prisma,
      getPrismaClient: () => prisma,
    }));

    // Dynamically import after mocking so the service picks up the mocked prisma
    ({ createTicketFromEmail } = await import("../src/services/emailToTicket"));
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  beforeEach(async () => {
    await prisma.ticket.deleteMany();
    await prisma.user.deleteMany();
    await prisma.partner.deleteMany();
  });

  it("should create ticket for known partner domain", async () => {
    const partner = await prisma.partner.create({ data: { companyName: "TestDomain" } });
    const ticket = await createTicketFromEmail({
      from: "user@testdomain.com",
      subject: "Subject",
      text: "Body",
    });
    expect(ticket.partnerId).toBe(partner.id);
  });

  it("should fallback to user mapping if domain not found", async () => {
    const partner = await prisma.partner.create({ data: { companyName: "FallbackPartner" } });
    await prisma.user.create({ data: { email: "user@fallback.com", partnerId: partner.id } });
    const ticket = await createTicketFromEmail({
      from: "user@fallback.com",
      subject: "Subject",
      text: "Body",
    });
    expect(ticket.partnerId).toBe(partner.id);
  });

  it("should fallback to first partner if no mapping found", async () => {
    const partner = await prisma.partner.create({ data: { companyName: "FirstPartner" } });
    const ticket = await createTicketFromEmail({
      from: "unknown@none.com",
      subject: "Subject",
      text: "Body",
    });
    expect(ticket.partnerId).toBe(partner.id);
  });
});
