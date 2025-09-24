import { execSync } from "child_process";

// Optional: auto-fix lint and formatting before seeding
try {
  execSync("npx eslint . --fix", { stdio: "inherit" });
  execSync("npx prettier --write .", { stdio: "inherit" });
} catch (_) {
  // Ignore errors; continue to seed
}
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/auth";

// Get DB file from command line or env
let dbFile = "dev.db";
let resetFlag = false;
for (const arg of process.argv) {
  if (arg.startsWith("--dbFile=")) {
    dbFile = arg.split("=")[1];
  }
  if (arg === "--reset") {
    resetFlag = true;
  }
}

// List of DB files to seed
const dbFiles = ["dev.db", "test-auth.db", "test-tickets.db"];

async function clearDatabase(prisma: PrismaClient) {
  console.log("🧹 Clearing existing data...");

  try {
    // Delete in reverse dependency order to avoid foreign key conflicts
    await prisma.ticketAttachment.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.serviceRecord.deleteMany();
    await prisma.calendarEvent.deleteMany();
    await prisma.knowledgeBase.deleteMany();
    await prisma.user.deleteMany();
    await prisma.partner.deleteMany();

    console.log("✅ Database cleared successfully");
  } catch (error) {
    console.error("❌ Error clearing database:", error);
    throw error;
  }
}

async function seedDb(dbFile: string, shouldReset: boolean = false) {
  const databaseUrl = `file:./${dbFile}`;
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  try {
    // Clear database if reset flag is provided
    if (shouldReset) {
      await clearDatabase(prisma);
    }

    // Check if data already exists to avoid duplicates
    const existingPartners = await prisma.partner.count();
    if (existingPartners > 0 && !shouldReset) {
      console.log(
        `ℹ️  Database ${dbFile} already has ${existingPartners} partners. Use --reset flag to clear and reseed.`,
      );
      return;
    }
    // Seed Test Resort 1 and 2 and verify creation
    const testResorts = [
      {
        companyName: "Test Resort 1",
        email: "manager1@testresort.com",
        displayName: "Resort Manager 1",
      },
      {
        companyName: "Test Resort 2",
        email: "manager2@testresort.com",
        displayName: "Resort Manager 2",
      },
    ];
    const hashedPartnerPassword = await hashPassword("partner123");
    let validPartnerIds: string[] = [];
    let testResortPartners: { [email: string]: string } = {};
    for (const resort of testResorts) {
      let partner = await prisma.partner.findFirst({ where: { companyName: resort.companyName } });
      if (!partner) {
        partner = await prisma.partner.create({
          data: {
            companyName: resort.companyName,
            managementCompany: "Management Group 1",
            streetAddress: "100 Beach Blvd",
            city: "Miami",
            state: "FL",
            zip: "33100",
            country: "USA",
            numberOfLoungeUnits: 10,
            topColour: "Classic Blue",
            userEmail: resort.email,
            userPass: "partner123",
            latitude: 25.7617,
            longitude: -80.1918,
          },
        });
      }
      if (!partner || !partner.id) {
        throw new Error(`❌ Could not create/find partner for ${resort.companyName}`);
      }
      validPartnerIds.push(partner.id);
      testResortPartners[resort.email] = partner.id;
      // Upsert user for this partner
      let user = await prisma.user.upsert({
        where: { email: resort.email },
        update: {},
        create: {
          email: resort.email,
          password: hashedPartnerPassword,
          displayName: resort.displayName,
          role: "PARTNER",
          partnerId: partner.id,
        },
      });
      if (!user || !user.id) {
        throw new Error(`❌ Could not upsert user for ${resort.email}`);
      }
      console.log(
        `✅ Upserted partner and user: ${resort.companyName} (${resort.email}) in ${dbFile}`,
      );
    }
    // Verify existence after upsert
    for (const resort of testResorts) {
      const partner = await prisma.partner.findFirst({
        where: { companyName: resort.companyName },
      });
      const user = await prisma.user.findFirst({ where: { email: resort.email } });
      if (!partner || !user) {
        throw new Error(
          `❌ Verification failed: ${resort.companyName} or user ${resort.email} missing after upsert in ${dbFile}.`,
        );
      }
      console.log(
        `✅ Verified: ${resort.companyName} and user ${resort.email} exist in DB ${dbFile}.`,
      );
    }
    // Upsert support and admin users
    const hashedSupportPassword = await hashPassword("support123");
    const hashedAdminPassword = await hashPassword("admin123");
    await prisma.user.upsert({
      where: { email: "support@poolsafe.com" },
      update: {},
      create: {
        email: "support@poolsafe.com",
        password: hashedSupportPassword,
        displayName: "Support Staff",
        role: "SUPPORT",
      },
    });
    await prisma.user.upsert({
      where: { email: "admin@poolsafe.com" },
      update: {},
      create: {
        email: "admin@poolsafe.com",
        password: hashedAdminPassword,
        displayName: "Admin User",
        role: "ADMIN",
      },
    });
    // Print counts for debugging
    const partnerCount = await prisma.partner.count();
    const userCount = await prisma.user.count();
    console.log(`DB ${dbFile}: Partner count = ${partnerCount}, User count = ${userCount}`);
  } catch (error) {
    console.error(`❌ Error seeding database ${dbFile}:`, error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  // Check if specific DB file was provided via command line
  let targetDbFiles = dbFiles;
  for (const arg of process.argv) {
    if (arg.startsWith("--dbFile=")) {
      const specifiedFile = arg.split("=")[1];
      targetDbFiles = [specifiedFile];
      break;
    }
  }

  for (const dbFile of targetDbFiles) {
    console.log(`\nSeeding ${dbFile}...`);
    await seedDb(dbFile, resetFlag);
  }

  console.log("\n🎉 Large dataset seeding completed successfully!");
  if (resetFlag) {
    console.log("🧹 Database was reset and reseeded with fresh data.");
  }
  console.log("\nTest Credentials:");
  console.log("📧 Admin: admin@poolsafe.com / admin123");
  console.log("📧 Support: support@poolsafe.com / support123");
  console.log("📧 Partner: manager1@testresort.com / partner123");
  console.log("🏨 Partner Company: Test Resort 1");
  console.log("ℹ️  Use --reset flag to clear and reseed database with fresh data.");
  console.log("ℹ️  Use --dbFile=filename.db to seed a specific database file.");
}

main().catch((e) => {
  console.error("❌ Error seeding database:", e);
  process.exit(1);
});
