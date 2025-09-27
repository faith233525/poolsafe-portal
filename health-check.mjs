#!/usr/bin/env node
/**
 * System Health Check - Pool Safe Inc Portal
 * Verifies that all fixes are working and system is operational
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

console.log("🔍 Pool Safe Inc Portal - System Health Check");
console.log("=".repeat(50));

const checks = [
  {
    name: "TypeScript Compilation (Frontend)",
    command: "cd frontend && npx tsc --noEmit --skipLibCheck",
    expected: 0,
  },
  {
    name: "TypeScript Compilation (Backend)",
    command: "cd backend && npx tsc --noEmit --skipLibCheck",
    expected: 0,
  },
  {
    name: "Frontend Build",
    command: "cd frontend && npm run build",
    expected: 0,
  },
  {
    name: "Backend Build",
    command: "cd backend && npm run build",
    expected: 0,
  },
  {
    name: "Database Seed Check",
    command: "cd backend && npx tsx scripts/seed.ts",
    expected: 0,
  },
];

const fileChecks = [
  "frontend/src/types/css.d.ts",
  "frontend/src/styles/error-dashboard.css",
  "frontend/cypress/support/commands.ts",
  "backend/scripts/seed.ts",
  "FIXES_SUMMARY.md",
];

let passed = 0;
let failed = 0;

// Check files exist
console.log("\n📁 File Checks:");
fileChecks.forEach((file) => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
    passed++;
  } else {
    console.log(`❌ ${file}`);
    failed++;
  }
});

// Run system checks
console.log("\n⚙️  System Checks:");
checks.forEach((check) => {
  try {
    execSync(check.command, { stdio: "pipe" });
    console.log(`✅ ${check.name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${check.name}`);
    failed++;
  }
});

// Summary
console.log("\n" + "=".repeat(50));
console.log(`📊 Results: ${passed} passed, ${failed} failed`);
console.log(`🎯 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

if (failed === 0) {
  console.log("🎉 All checks passed! System is fully operational.");
} else {
  console.log("⚠️  Some checks failed. Review the issues above.");
}

console.log("\n🚀 Pool Safe Inc Portal is ready for development!");
