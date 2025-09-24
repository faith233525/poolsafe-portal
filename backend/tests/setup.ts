import { execSync } from "child_process";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.PORT = process.env.PORT || "0";
// Use a consistent test database for all backend operations during tests
process.env.DATABASE_URL = "file:./test-auth.db";

// Global flag to ensure seeding happens only once per test run
const SEED_KEY = "__TEST_DB_SEEDED__";

if (!(globalThis as any)[SEED_KEY]) {
  // Mark as seeded before attempting to prevent race conditions
  (globalThis as any)[SEED_KEY] = true;

  // Reseed the test database before running tests
  try {
    console.log("🌱 Setting up test database...");
  execSync(`npm run seed:raw -- --dbFile=test-auth.db`, { stdio: "pipe" });
    console.log("✅ Test database setup complete");
  } catch (e) {
    console.error(`Failed to reseed test database test-auth.db:`, e);
    throw e;
  }
}
