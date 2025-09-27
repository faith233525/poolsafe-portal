"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Seed script: populate databases for dev and tests
const client_1 = require("@prisma/client");
const auth_1 = require("../src/utils/auth");
// Get DB file from command line or env
let resetFlag = false;
for (const arg of process.argv) {
    if (arg === "--reset") {
        resetFlag = true;
    }
}
// List of DB files to seed
const dbFiles = ["dev.db", "test-auth.db", "test-tickets.db"];
async function clearDatabase(prisma) {
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
    }
    catch (error) {
        console.error("❌ Error clearing database:", error);
        throw error;
    }
}
async function seedDb(dbFile, shouldReset = false) {
    const databaseUrl = `file:./${dbFile}`;
    const prisma = new client_1.PrismaClient({
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
            console.log(`ℹ️  ${dbFile}: ${existingPartners} partners already exist. Ensuring required users & contacts...`);
        }
        // List of actual partners and users (ignore email)
        const actualPartners = [
            { user_login: "adventureland", user_pass: "AdventurelandIA", number: "8002557826", display_name: "Adventureland", top_colour: "Ice Blue", company_name: "Adventureland", management_company: "Palace Entertainment", number_of_loungenie_units: 15, street_address: "3300 Adventureland Dr", city: "Altoona", state: "IA", zip: "50009", country: "USA" },
            { user_login: "beechbend", user_pass: "BeechBendKY", number: "2707817634", display_name: "Beech Bend Park & Splash Lagoon", top_colour: "Ice Blue", company_name: "Beech Bend Park & Splash Lagoon", management_company: "Beech Bend Park & Splash Lagoon", number_of_loungenie_units: 19, street_address: "798 Beech Bend Rd", city: "Bowling Green", state: "KY", zip: "42101", country: "USA" },
            { user_login: "bigdamwaterpark", user_pass: "BigDamAR", number: "8707744677", display_name: "Big Dam Waterpark", top_colour: "Classic Blue", company_name: "Big Dam Waterpark", management_company: "P23 - Big Dam Waterpark", number_of_loungenie_units: 12, street_address: "5501 Crossroads Pkwy", city: "Texarkana", state: "AR", zip: "71854", country: "USA" },
            { user_login: "breakwaterbeach", user_pass: "BreakwaterBeachNJ", number: "7327936488", display_name: "Breakwater Beach Waterpark", top_colour: "Ice Blue", company_name: "Breakwater Beach Waterpark", management_company: "Breakwater Beach Waterpark", number_of_loungenie_units: 10, street_address: "800 Ocean Terrace", city: "Seaside Heights", state: "NJ", zip: "8751", country: "USA" },
            // ... (add all other partners from the provided list)
        ];
        for (const p of actualPartners) {
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
                        userPass: p.user_pass,
                    },
                });
                created = true;
            }
            if (!partner)
                throw new Error(`❌ Could not create/find partner for ${p.company_name}`);
            console.log(`${created ? "✅ Created" : "ℹ️  Ensured"} partner ${p.company_name}`);
        }
        // Upsert support and admin users
        // Use env-configurable seed values to avoid leaking real emails in code
        const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL_SEED || "support@poolsafe.com";
        const SUPPORT_PASSWORD = process.env.SUPPORT_PASSWORD_SEED || "LounGenie123!!";
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL_SEED || "admin@poolsafe.com";
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD_SEED || "admin123";
        // Hash passwords immediately before user creation
        const hashedSupportPassword = await (0, auth_1.hashPassword)(SUPPORT_PASSWORD);
        const hashedAdminPassword = await (0, auth_1.hashPassword)(ADMIN_PASSWORD);
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
            update: {},
            create: {
                email: SUPPORT_EMAIL,
                displayName: "Support Staff",
                password: hashedSupportPassword,
                role: "SUPPORT",
            },
        });
        await prisma.user.upsert({
            where: { email: ADMIN_EMAIL },
            update: {},
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
            if (testPartners.some(tp => tp.companyName === p.company_name))
                continue;
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
                        userPass: p.user_pass,
                    },
                });
                created = true;
            }
            if (!partner)
                throw new Error(`❌ Could not create/find partner for ${p.company_name}`);
            // Upsert dummy partner user
            const hashedPartnerPassword = await (0, auth_1.hashPassword)(p.user_pass);
            await prisma.user.upsert({
                where: { email: `${p.user_login}@dummy.com` },
                update: { partnerId: partner.id },
                create: {
                    email: `${p.user_login}@dummy.com`,
                    displayName: p.display_name,
                    password: hashedPartnerPassword,
                    role: "PARTNER",
                    partnerId: partner.id,
                },
            });
            console.log(`${created ? "✅ Created" : "ℹ️  Ensured"} partner ${p.company_name}`);
        }
        // Upsert partner scoped user accounts expected by tests (manager1@testresort.com, manager2@testresort.com)
        // These represent individual partner user accounts distinct from company-level login via companyName.
        const partnerUserPassword = await (0, auth_1.hashPassword)(process.env.SEED_PARTNER_USER_PASSWORD || "PartnerUser123!!");
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
        console.log(`DB ${dbFile}: Partner count = ${partnerCount}, User count = ${userCount}`);
    }
    catch (error) {
        console.error(`❌ Error seeding database ${dbFile}:`, error);
        throw error;
    }
    finally {
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
    console.log("\nTest/Seeded Credentials:");
    console.log(`📧 Admin: ${process.env.ADMIN_EMAIL_SEED || "admin@poolsafe.com"} / ${process.env.ADMIN_PASSWORD_SEED || "admin123"}`);
    console.log(`📧 Support: ${process.env.SUPPORT_EMAIL_SEED || "support@poolsafe.com"} / ${process.env.SUPPORT_PASSWORD_SEED || "LounGenie123!!"}`);
    console.log("🏨 Partner Company: Test Resort 1");
    console.log(`Partner test user: manager1@testresort.com / ${process.env.SEED_PARTNER_USER_PASSWORD || "PartnerUser123!!"}`);
    console.log("Company-level password (Test Resort 1): partner123");
    console.log("ℹ️  Use --reset flag to clear and reseed database with fresh data.");
    console.log("ℹ️  Use --dbFile=filename.db to seed a specific database file.");
}
main().catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
});
