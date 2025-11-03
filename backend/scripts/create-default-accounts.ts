import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function createDefaultAccounts() {
  console.log("🌱 Creating default accounts...");

  try {
    // Create default support/admin account
    const supportEmail = "support@poolsafeinc.com";
    const supportPassword = "LounGenie123!!";
    
    const existingSupport = await prisma.user.findUnique({
      where: { email: supportEmail },
    });

    if (!existingSupport) {
      const hashedPassword = await bcrypt.hash(supportPassword, 10);
      
      await prisma.user.create({
        data: {
          email: supportEmail,
          password: hashedPassword,
          displayName: "Pool Safe Support",
          role: "ADMIN",
        },
      });
      
      console.log(`✅ Created default support account: ${supportEmail}`);
      console.log(`   Password: ${supportPassword}`);
    } else {
      console.log(`ℹ️  Support account already exists: ${supportEmail}`);
    }

    console.log("\n✅ Default accounts setup complete!");
    console.log("\n📝 Login Credentials:");
    console.log(`   Email: ${supportEmail}`);
    console.log(`   Password: ${supportPassword}`);
    console.log("\n");

  } catch (error) {
    console.error("❌ Error creating default accounts:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createDefaultAccounts()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
