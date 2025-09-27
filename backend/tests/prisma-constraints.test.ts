import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createPrismaTestClient } from "./prismaTestFactory";

const prisma = createPrismaTestClient("test-auth.db");

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Prisma schema constraints", () => {
  it("enforces unique email on User", async () => {
    const email = `unique${Date.now()}@test.com`;
    await prisma.user.create({
      data: {
        email,
        password: "pw",
        displayName: "User1",
        role: "PARTNER",
      },
    });
    await expect(
      prisma.user.create({
        data: {
          email,
          password: "pw2",
          displayName: "User2",
          role: "PARTNER",
        },
      }),
    ).rejects.toThrow();
  });

  it("enforces required fields on Ticket", async () => {
    const partner = await prisma.partner.create({ data: { companyName: "RequiredFieldTest" } });
    await expect(
      prisma.ticket.create({
        data: { partnerId: partner.id } as any, // missing subject, triggers runtime error
      }),
    ).rejects.toThrow();
  });

  it("enforces foreign key on TicketAttachment", async () => {
    await expect(
      prisma.ticketAttachment.create({
        data: {
          ticketId: "nonexistent-id",
          filename: "file.txt",
          filepath: "path",
          mimetype: "text/plain",
          size: 1,
        },
      }),
    ).rejects.toThrow();
  });

  it("cascades delete from Ticket to TicketAttachment", async () => {
    // Create partner, ticket, attachment
    const partner = await prisma.partner.create({
      data: {
        companyName: "CascadeTest",
      },
    });
    const ticket = await prisma.ticket.create({
      data: {
        partnerId: partner.id,
        subject: "Cascade",
      },
    });
    const attachment = await prisma.ticketAttachment.create({
      data: {
        ticketId: ticket.id,
        filename: "cascade.txt",
        filepath: "cascade",
        mimetype: "text/plain",
        size: 1,
      },
    });
    await prisma.ticket.delete({ where: { id: ticket.id } });
    const found = await prisma.ticketAttachment.findUnique({ where: { id: attachment.id } });
    expect(found).toBeNull();
  });
});
