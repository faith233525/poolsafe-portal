import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/auth";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Clearing tables and seeding database...");

  // Clear all tables (order matters for foreign keys)
  await prisma.notification.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.serviceRecord.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.knowledgeBase.deleteMany();
  await prisma.user.deleteMany();
  await prisma.partner.deleteMany();

  // Create admin and support users
  const hashedAdminPassword = await hashPassword("admin123");
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@poolsafe.com",
      password: hashedAdminPassword,
      displayName: "Pool Safe Admin",
      role: "ADMIN",
    },
  });
  const hashedSupportPassword = await hashPassword("support123");
  const supportUser = await prisma.user.create({
    data: {
      email: "support@poolsafe.com",
      password: hashedSupportPassword,
      displayName: "Pool Safe Support",
      role: "SUPPORT",
    },
  });

  // Create partners one by one and collect IDs
  const partnerCount = 50;
  const partnerIds: string[] = [];
  for (let i = 0; i < partnerCount; i++) {
    const partner = await prisma.partner.create({
      data: {
        companyName: `Test Resort ${i + 1}`,
        managementCompany: `Management Group ${i % 10}`,
        streetAddress: `${100 + i} Beach Blvd`,
        city: "Miami",
        state: "FL",
        zip: `33${100 + i}`,
        country: "USA",
        numberOfLoungeUnits: Math.floor(Math.random() * 50) + 1,
        topColour: ["Classic Blue", "Ice Blue", "Ducati Red", "Yellow"][i % 4],
        userEmail: `partner${i + 1}@testresort.com`,
        userPass: "partner123",
        latitude: 25.7617 + Math.random() * 0.1,
        longitude: -80.1918 + Math.random() * 0.1,
      },
    });
    partnerIds.push(partner.id);
  }
  console.log(`✅ Created ${partnerCount} partners`);

  // Create partner users one by one
  const hashedPartnerPassword = await hashPassword("partner123");
  for (let i = 0; i < partnerCount; i++) {
    await prisma.user.create({
      data: {
        email: `manager${i + 1}@testresort.com`,
        password: hashedPartnerPassword,
        displayName: `Resort Manager ${i + 1}`,
        role: "PARTNER",
        partnerId: partnerIds[i],
      },
    });
  }
  console.log(`✅ Created ${partnerCount} partner users`);

  // Create tickets one by one
  const ticketCount = 200;
  for (let i = 0; i < ticketCount; i++) {
    await prisma.ticket.create({
      data: {
        partnerId: partnerIds[i % partnerCount],
        firstName: `User${i}`,
        lastName: `Last${i}`,
        title: "Facility Manager",
        createdByName: `User${i} Last${i}`,
        subject: `Ticket subject ${i}`,
        category: ["Connectivity", "Charging", "General"][i % 3],
        description: `Description for ticket ${i}`,
        unitsAffected: Math.floor(Math.random() * 5) + 1,
        priority: ["HIGH", "MEDIUM", "LOW"][i % 3],
        contactPreference: "Email",
        recurringIssue: i % 2 === 0,
        severity: Math.floor(Math.random() * 10) + 1,
        status: ["OPEN", "RESOLVED", "CLOSED"][i % 3],
      },
    });
  }
  console.log(`✅ Created ${ticketCount} tickets`);

  // Create service records one by one
  const serviceCount = 100;
  for (let i = 0; i < serviceCount; i++) {
    await prisma.serviceRecord.create({
      data: {
        partnerId: partnerIds[i % partnerCount],
        assignedToId: supportUser.id,
        serviceType: ["Maintenance", "Repair", "Inspection"][i % 3],
        description: `Service record ${i}`,
        notes: `Notes for service record ${i}`,
        status: ["SCHEDULED", "COMPLETED", "CANCELLED"][i % 3],
      },
    });
  }
  console.log(`✅ Created ${serviceCount} service records`);

  // Create calendar events one by one
  const eventCount = 50;
  for (let i = 0; i < eventCount; i++) {
    await prisma.calendarEvent.create({
      data: {
        partnerId: partnerIds[i % partnerCount],
        createdById: supportUser.id,
        title: `Event ${i}`,
        description: `Description for event ${i}`,
        eventType: ["MAINTENANCE", "MEETING", "INSTALLATION"][i % 3],
        startDate: new Date(Date.now() + i * 3600000),
        endDate: new Date(Date.now() + (i + 1) * 3600000),
      },
    });
  }
  console.log(`✅ Created ${eventCount} calendar events`);

  // Bulk create knowledge base articles
  const kbCount = 20;
  const kbArticles: any[] = [];
  for (let i = 0; i < kbCount; i++) {
    kbArticles.push({
      title: `KB Article ${i}`,
      content: `Content for KB article ${i}`,
      category: ["Troubleshooting", "How-To", "General"][i % 3],
      tags: JSON.stringify(["tag1", "tag2", `kb${i}`]),
      isPublished: true,
    });
  }
  await prisma.knowledgeBase.createMany({ data: kbArticles });
  console.log(`✅ Created ${kbCount} knowledge base articles`);

  console.log("\n🎉 Large dataset seeding completed successfully!");
  console.log("\nTest Credentials:");
  console.log("📧 Admin: admin@poolsafe.com / admin123");
  console.log("📧 Support: support@poolsafe.com / support123");
  console.log("📧 Partner: manager1@testresort.com / partner123");
  console.log("🏨 Partner Company: Test Resort 1");
  console.log("ℹ️  Rerunning will duplicate data; truncate or reset DB for clean reseed.");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
