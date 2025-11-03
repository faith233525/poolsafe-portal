import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/auth";

// Use dev database for local testing
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "file:./prisma/dev.db",
    },
  },
});

async function main() {
  console.log("Creating default support account...");

  const email = "support@poolsafeinc.com";
  const password = "LounGenie123!!";
  const hashedPassword = await hashPassword(password);

  // Check if account already exists
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log(`✅ Support account already exists: ${email}`);
    console.log(`   Updating password to: LounGenie123!!`);
    
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        role: "ADMIN",
        displayName: "Pool Safe Support",
      },
    });
    
    console.log(`✅ Password updated successfully`);
  } else {
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: "ADMIN",
        displayName: "Pool Safe Support",
      },
    });

    console.log(`✅ Support account created successfully`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: LounGenie123!!`);
  }

  console.log("\n🎉 Default support account is ready!");
  console.log("   You can now login with:");
  console.log(`   Email: ${email}`);
  console.log(`   Password: LounGenie123!!`);
}

main()
  .catch((e) => {
    console.error("Error creating support account:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
