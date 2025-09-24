import { PrismaClient } from "@prisma/client";

export async function resetDb(client: PrismaClient) {
  // Disable foreign key checks for SQLite
  await client.$executeRawUnsafe("PRAGMA foreign_keys = OFF;");
  await client.notification.deleteMany();
  await client.ticketAttachment.deleteMany();
  await client.ticket.deleteMany();
  await client.serviceRecord.deleteMany();
  await client.calendarEvent.deleteMany();
  await client.knowledgeBase.deleteMany();
  await client.user.deleteMany();
  await client.partner.deleteMany();
  // Re-enable foreign key checks
  await client.$executeRawUnsafe("PRAGMA foreign_keys = ON;");
}
