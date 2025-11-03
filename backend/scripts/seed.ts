// Seed script: populate databases for dev, tests, or a single DATABASE_URL
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { hashPassword } from "../src/utils/auth";

// Get DB file from command line or env
let resetFlag = false;
let cliDbFile: string | undefined;
let cliDbUrl: string | undefined;
for (const arg of process.argv) {
  if (arg === "--reset") {
    resetFlag = true;
  }
  if (arg.startsWith("--dbFile=")) {
    cliDbFile = arg.split("=")[1];
  }
  if (arg.startsWith("--dbUrl=")) {
    cliDbUrl = arg.split("=")[1];
  }
}

// List of DB files to seed (use correct prisma/ path for local SQLite files)
const dbFiles = process.env.SEED_DB_FILES
  ? process.env.SEED_DB_FILES.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : [
      "prisma/dev.db",
      "prisma/test-auth.db",
      "prisma/test-tickets.db",
      "prisma/test-health.db",
      "prisma/test-knowledgebase.db",
      "prisma/test-middleware.db",
      "prisma/test-email.db",
    ];

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

async function seedDatabase(databaseUrl: string, label: string, shouldReset: boolean = false) {
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  try {
    // Clear database if reset flag is provided
    if (shouldReset) {
      await clearDatabase(prisma);
    }

    // Remove test partners that may cause unique constraint errors in tests
    const testPartnerNames = [
      "New Test Resort",
      "Other Resort",
      "RequiredFieldTest",
      "CascadeTest",
    ];
    for (const name of testPartnerNames) {
      await prisma.partner.deleteMany({ where: { companyName: name } });
    }
    // Observe existing partners (no early return so user upserts always run)
    const existingPartners = await prisma.partner.count();
    if (existingPartners > 0 && !shouldReset) {
      console.log(
        `ℹ️  ${label}: ${existingPartners} partners already exist. Ensuring required users & contacts...`,
      );
    }

    // List of actual partners and users with location coordinates
    const actualPartners = [
      {
        user_login: "adventureland",
        number: "8002557826",
        display_name: "Adventureland",
        top_colour: "Ice Blue",
        company_name: "Adventureland",
        management_company: "Palace Entertainment",
        number_of_loungenie_units: 15,
        street_address: "3300 Adventureland Dr",
        city: "Altoona",
        state: "IA",
        zip: "50009",
        country: "USA",
        latitude: 41.637302,
        longitude: -93.472463,
      },
      {
        user_login: "beechbend",
        number: "2707817634",
        display_name: "Beech Bend Park & Splash Lagoon",
        top_colour: "Ice Blue",
        company_name: "Beech Bend Park & Splash Lagoon",
        management_company: "Beech Bend Park & Splash Lagoon",
        number_of_loungenie_units: 19,
        street_address: "798 Beech Bend Rd",
        city: "Bowling Green",
        state: "KY",
        zip: "42101",
        country: "USA",
        latitude: 36.944736,
        longitude: -86.461282,
      },
      {
        user_login: "bigdamwaterpark",
        number: "8707744677",
        display_name: "Big Dam Waterpark",
        top_colour: "Classic Blue",
        company_name: "Big Dam Waterpark",
        management_company: "P23 - Big Dam Waterpark",
        number_of_loungenie_units: 12,
        street_address: "5501 Crossroads Pkwy",
        city: "Texarkana",
        state: "AR",
        zip: "71854",
        country: "USA",
        latitude: 33.466667,
        longitude: -94.037778,
      },
      {
        user_login: "breakwaterbeach",
        number: "7327936488",
        display_name: "Breakwater Beach Waterpark",
        top_colour: "Ice Blue",
        company_name: "Breakwater Beach Waterpark",
        management_company: "Breakwater Beach Waterpark",
        number_of_loungenie_units: 10,
        street_address: "800 Ocean Terrace",
        city: "Seaside Heights",
        state: "NJ",
        zip: "8751",
        country: "USA",
        latitude: 39.944994,
        longitude: -74.071956,
      },
      {
        user_login: "ritznewyork",
        number: "2123089100",
        display_name: "The Ritz-Carlton, New York Central Park",
        top_colour: "Classic Blue",
        company_name: "The Ritz-Carlton, New York Central Park",
        management_company: "Marriott International",
        number_of_loungenie_units: 25,
        street_address: "50 Central Park S",
        city: "New York",
        state: "NY",
        zip: "10019",
        country: "USA",
        latitude: 40.764046,
        longitude: -73.979681,
      },
      {
        user_login: "fourseasonmiami",
        number: "3053583535",
        display_name: "Four Seasons Hotel Miami",
        top_colour: "Ice Blue",
        company_name: "Four Seasons Hotel Miami",
        management_company: "Four Seasons Hotels and Resorts",
        number_of_loungenie_units: 20,
        street_address: "1435 Brickell Ave",
        city: "Miami",
        state: "FL",
        zip: "33131",
        country: "USA",
        latitude: 25.766228,
        longitude: -80.190262,
      },
      {
        user_login: "peninsulabh",
        number: "3105512888",
        display_name: "The Peninsula Beverly Hills",
        top_colour: "Classic Blue",
        company_name: "The Peninsula Beverly Hills",
        management_company: "The Hongkong and Shanghai Hotels",
        number_of_loungenie_units: 18,
        street_address: "9882 S Santa Monica Blvd",
        city: "Beverly Hills",
        state: "CA",
        zip: "90212",
        country: "USA",
        latitude: 34.067932,
        longitude: -118.399408,
      },
      {
        user_login: "stregischicago",
        number: "3125735600",
        display_name: "The St. Regis Chicago",
        top_colour: "Ice Blue",
        company_name: "The St. Regis Chicago",
        management_company: "Marriott International",
        number_of_loungenie_units: 22,
        street_address: "401 E Wacker Dr",
        city: "Chicago",
        state: "IL",
        zip: "60601",
        country: "USA",
        latitude: 41.89624,
        longitude: -87.623177,
      },
    ];

    // Upsert support and admin users
    // Use env-configurable seed values to avoid leaking real emails in code
    const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL_SEED || "support@poolsafe.com";
    const SUPPORT_PASSWORD = process.env.SUPPORT_PASSWORD_SEED || "LounGenie123!!";
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL_SEED || "admin@poolsafe.com";
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD_SEED || "admin123";
    const DEFAULT_COMPANY_PASSWORD =
      process.env.SEED_COMPANY_DEFAULT_PASSWORD || crypto.randomBytes(16).toString("hex");
    // Hash passwords immediately before user creation
    const hashedSupportPassword = await hashPassword(SUPPORT_PASSWORD);
    const hashedAdminPassword = await hashPassword(ADMIN_PASSWORD);
    // Reuse one hashed password for all seeded partner users (non-test)
    const partnerUserPassword = await hashPassword(
      process.env.SEED_PARTNER_USER_PASSWORD || "PartnerUser123!!",
    );
    // Always create partners required by tests
    const testPartners = [
      {
        companyName: "Test Resort 1",
        managementCompany: "Test Management 1",
        streetAddress: "1 Test St",
        city: "Testville",
        state: "TS",
        zip: "11111",
        country: "USA",
        numberOfLoungeUnits: 10,
        topColour: "Blue",
        userPass: "partner123", // Ensure login test matches
      },
      {
        companyName: "Test Resort 2",
        managementCompany: "Test Management 2",
        streetAddress: "2 Test Ave",
        city: "Testburg",
        state: "TS",
        zip: "22222",
        country: "USA",
        numberOfLoungeUnits: 20,
        topColour: "Red",
        userPass: "Manager2Pass!",
      },
    ];
    for (const p of testPartners) {
      let partner = await prisma.partner.findFirst({ where: { companyName: p.companyName } });
      if (!partner) {
        partner = await prisma.partner.create({
          data: {
            companyName: p.companyName,
            managementCompany: p.managementCompany,
            streetAddress: p.streetAddress,
            city: p.city,
            state: p.state,
            zip: p.zip,
            country: p.country,
            numberOfLoungeUnits: p.numberOfLoungeUnits,
            topColour: p.topColour,
            userPass: p.userPass,
          },
        });
      }
    }

    // Upsert support and admin users with test emails
    await prisma.user.upsert({
      where: { email: SUPPORT_EMAIL },
      update: {
        password: hashedSupportPassword,
        role: "SUPPORT",
        displayName: "Support Staff",
      },
      create: {
        email: SUPPORT_EMAIL,
        displayName: "Support Staff",
        password: hashedSupportPassword,
        role: "SUPPORT",
      },
    });
    await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: {
        password: hashedAdminPassword,
        role: "ADMIN",
        displayName: "Admin User",
      },
      create: {
        email: ADMIN_EMAIL,
        displayName: "Admin User",
        password: hashedAdminPassword,
        role: "ADMIN",
      },
    });

    // Upsert manager1 and manager2 for test partners
    // Already handled above, do not redeclare partner1, partner2, partnerUserPassword

    // Upsert all other actual partners and users (use dummy emails for privacy)
    for (const p of actualPartners) {
      // Skip test partners already handled above
      if (testPartners.some((tp) => tp.companyName === p.company_name)) {
        continue;
      }
      let partner = await prisma.partner.findFirst({ where: { companyName: p.company_name } });
      let created = false;
      if (!partner) {
        partner = await prisma.partner.create({
          data: {
            companyName: p.company_name,
            managementCompany: p.management_company,
            streetAddress: p.street_address,
            city: p.city,
            state: p.state,
            zip: p.zip,
            country: p.country,
            numberOfLoungeUnits: p.number_of_loungenie_units,
            topColour: p.top_colour,
            latitude: p.latitude,
            longitude: p.longitude,
            // Use env-driven default for company-level password to avoid hardcoding
            userPass: DEFAULT_COMPANY_PASSWORD,
          },
        });
        created = true;
      }
      if (!partner) {
        throw new Error(`❌ Could not create/find partner for ${p.company_name}`);
      }
      // Upsert dummy partner user
      await prisma.user.upsert({
        where: { email: `${p.user_login}@dummy.com` },
        update: { partnerId: partner.id },
        create: {
          email: `${p.user_login}@dummy.com`,
          displayName: p.display_name,
          password: partnerUserPassword,
          role: "PARTNER",
          partnerId: partner.id,
        },
      });
      console.log(`${created ? "✅ Created" : "ℹ️  Ensured"} partner ${p.company_name}`);
    }
    // Upsert partner scoped user accounts expected by tests (manager1@testresort.com, manager2@testresort.com)
    // These represent individual partner user accounts distinct from company-level login via companyName.
    const partner1 = await prisma.partner.findFirst({ where: { companyName: "Test Resort 1" } });
    const partner2 = await prisma.partner.findFirst({ where: { companyName: "Test Resort 2" } });
    if (partner1) {
      await prisma.user.upsert({
        where: { email: "manager1@testresort.com" },
        update: { partnerId: partner1.id },
        create: {
          email: "manager1@testresort.com",
          password: partnerUserPassword,
          displayName: "Manager 1",
          role: "PARTNER",
          partnerId: partner1.id,
        },
      });
    }
    if (partner2) {
      await prisma.user.upsert({
        where: { email: "manager2@testresort.com" },
        update: { partnerId: partner2.id },
        create: {
          email: "manager2@testresort.com",
          password: partnerUserPassword,
          displayName: "Manager 2",
          role: "PARTNER",
          partnerId: partner2.id,
        },
      });
    }
    // Print counts for debugging
    const partnerCount = await prisma.partner.count();
    const userCount = await prisma.user.count();
    console.log(`DB ${label}: Partner count = ${partnerCount}, User count = ${userCount}`);
  } catch (error) {
    console.error(`❌ Error seeding database ${label}:`, error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  // Priority: explicit --dbUrl > SEED_DB_URL/DATABASE_URL > explicit --dbFile > default files
  const envDbUrl = process.env.SEED_DB_URL || process.env.DATABASE_URL;
  const forceMulti = process.env.SEED_DB_FILES || process.env.SEED_ALL === "true";

  if (!forceMulti && (cliDbUrl || envDbUrl)) {
    const dbUrl = (cliDbUrl || envDbUrl)!;
    const label = dbUrl.startsWith("file:") ? dbUrl.replace(/^file:\.\//, "") : "custom-url";
    console.log(`\nSeeding single database via URL: ${dbUrl}`);
    await seedDatabase(dbUrl, label, resetFlag);
  } else {
    const targetDbFiles = cliDbFile ? [cliDbFile] : dbFiles;
    for (const dbFile of targetDbFiles) {
      const databaseUrl = `file:./${dbFile}`;
      console.log(`\nSeeding ${dbFile}...`);
      await seedDatabase(databaseUrl, dbFile, resetFlag);
    }
  }

  console.log("\n🎉 Large dataset seeding completed successfully!");
  if (resetFlag) {
    console.log("🧹 Database was reset and reseeded with fresh data.");
  }
  console.log("\nTest/Seeded Credentials:");
  console.log(
    `📧 Admin: ${process.env.ADMIN_EMAIL_SEED || "admin@poolsafe.com"} / ${process.env.ADMIN_PASSWORD_SEED || "admin123"}`,
  );
  console.log(
    `📧 Support: ${process.env.SUPPORT_EMAIL_SEED || "support@poolsafe.com"} / ${process.env.SUPPORT_PASSWORD_SEED || "LounGenie123!!"}`,
  );
  console.log("🏨 Partner Company: Test Resort 1");
  console.log(
    `Partner test user: manager1@testresort.com / ${process.env.SEED_PARTNER_USER_PASSWORD || "PartnerUser123!!"}`,
  );
  if (process.env.SEED_COMPANY_DEFAULT_PASSWORD) {
    console.log(`Company-level password default: ${process.env.SEED_COMPANY_DEFAULT_PASSWORD}`);
  } else {
    console.log("Company-level password default: [auto-generated per run]");
  }
  console.log("ℹ️  Use --reset flag to clear and reseed database with fresh data.");
  console.log("ℹ️  Use --dbFile=filename.db to seed a specific SQLite database file.");
  console.log(
    "ℹ️  Use --dbUrl=connectionString to seed a specific database URL (e.g., Postgres). You must generate Prisma Client for the target provider.",
  );
}

main().catch((e) => {
  console.error("❌ Error seeding database:", e);
  process.exit(1);
});
