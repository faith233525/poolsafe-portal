import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    reporters: ["default"],
    sequence: {
      concurrent: false,
      shuffle: false,
    },
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      reporter: ["text", "html"],
      exclude: [
        "**/migrations/**",
        "**/node_modules/**",
        "**/scripts/**",
        "**/tests/**",
        "**/index.ts",
        "**/test-server.js",
        "**/prismaClient.ts",
      ],
      thresholds: {
        lines: 35,
        branches: 30,
        functions: 35,
        statements: 35,
      },
    },
  },
});
