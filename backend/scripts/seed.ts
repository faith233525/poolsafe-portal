import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/auth";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create test partner
  const testPartner = await prisma.partner.create({
    data: {
      companyName: "Test Resort & Spa",
      managementCompany: "Resort Management Group",
      streetAddress: "123 Beach Boulevard",
      city: "Miami",
      state: "FL",
      zip: "33101",
      country: "USA",
      numberOfLoungeUnits: 25,
      topColour: "Classic Blue",
      userEmail: "partner@testresort.com",
      userPass: "partner123",
      latitude: 25.7617,
      longitude: -80.1918,
    },
  });

  console.log("✅ Created test partner:", testPartner.companyName);

  // Create admin user
  const hashedAdminPassword = await hashPassword("admin123");
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@poolsafe.com",
      password: hashedAdminPassword,
      displayName: "Pool Safe Admin",
      role: "ADMIN",
    },
  });

  console.log("✅ Created admin user:", adminUser.email);

  // Create support user
  const hashedSupportPassword = await hashPassword("support123");
  const supportUser = await prisma.user.create({
    data: {
      email: "support@poolsafe.com",
      password: hashedSupportPassword,
      displayName: "Pool Safe Support",
      role: "SUPPORT",
    },
  });

  console.log("✅ Created support user:", supportUser.email);

  // Create partner user linked to the partner
  const hashedPartnerPassword = await hashPassword("partner123");
  const partnerUser = await prisma.user.create({
    data: {
      email: "manager@testresort.com",
      password: hashedPartnerPassword,
      displayName: "Resort Manager",
      role: "PARTNER",
      partnerId: testPartner.id,
    },
  });

  console.log("✅ Created partner user:", partnerUser.email);

  // Create sample ticket
  const sampleTicket = await prisma.ticket.create({
    data: {
      partnerId: testPartner.id,
      firstName: "John",
      lastName: "Smith",
      title: "Facility Manager",
      createdByName: "John Smith",
      subject: "LounGenie unit not responding",
      category: "Connectivity",
      description:
        "Unit #15 has not been responding to commands for the past hour. Guests are unable to access lounge services.",
      unitsAffected: 1,
      priority: "HIGH",
      contactPreference: "Email",
      recurringIssue: false,
      severity: 7,
      status: "OPEN",
    },
  });

  console.log("✅ Created sample ticket:", sampleTicket.subject);

  // Create sample service record
  const serviceRecord = await prisma.serviceRecord.create({
    data: {
      partnerId: testPartner.id,
      assignedToId: supportUser.id,
      serviceType: "Maintenance",
      description: "Quarterly maintenance check for all LounGenie units",
      notes: "Scheduled maintenance to ensure optimal performance",
      status: "SCHEDULED",
    },
  });

  console.log("✅ Created service record:", serviceRecord.serviceType);

  // Create sample calendar event
  const calendarEvent = await prisma.calendarEvent.create({
    data: {
      partnerId: testPartner.id,
      createdById: supportUser.id,
      title: "Quarterly Maintenance Visit",
      description:
        "Scheduled maintenance for all LounGenie units at Test Resort",
      eventType: "MAINTENANCE",
      startDate: new Date("2025-10-15T10:00:00Z"),
      endDate: new Date("2025-10-15T16:00:00Z"),
    },
  });

  console.log("✅ Created calendar event:", calendarEvent.title);

  // Create sample knowledge base article
  const kbArticle = await prisma.knowledgeBase.create({
    data: {
      title: "LounGenie Connectivity Troubleshooting",
      content: `
# LounGenie Connectivity Issues

## Common Causes
1. WiFi network connectivity
2. LoRa signal interference
3. Device power issues
4. Gateway configuration

## Troubleshooting Steps
1. Check device power indicator
2. Verify WiFi connection
3. Test LoRa connectivity
4. Reset device if necessary

## When to Escalate
- Multiple units affected
- Hardware replacement needed
- Network infrastructure issues
      `,
      category: "Troubleshooting",
      tags: JSON.stringify(["connectivity", "troubleshooting", "loungenie"]),
      isPublished: true,
    },
  });

  console.log("✅ Created knowledge base article:", kbArticle.title);

  console.log("\n🎉 Database seeding completed successfully!");
  console.log("\nTest Credentials:");
  console.log("📧 Admin: admin@poolsafe.com / admin123");
  console.log("📧 Support: support@poolsafe.com / support123");
  console.log("📧 Partner: manager@testresort.com / partner123");
  console.log("🏨 Partner Company: Test Resort & Spa");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
