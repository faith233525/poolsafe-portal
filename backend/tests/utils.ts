import { PrismaClient } from "@prisma/client";

export async function resetDb(client: PrismaClient) {
  await client.notification.deleteMany();
  await client.ticketAttachment.deleteMany();
  await client.ticket.deleteMany();
  await client.serviceRecord.deleteMany();
  await client.calendarEvent.deleteMany();
  await client.knowledgeBase.deleteMany();
  await client.user.deleteMany();
  await client.partner.deleteMany();
}
