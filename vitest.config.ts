import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Project root is src/ so include patterns start from there
    include: ["src/tests/**/*.test.ts"],

    // Use a separate DB for tests so we don't clobber dev data
    env: {
      DB_PATH: "/tmp/shareit-test.db",
      JWT_SECRET: "test-secret-do-not-use-in-prod",
      ADMIN_USERNAME: "admin",
      ADMIN_PASSWORD: "admin123",
      B2_ENABLED: "false",
      B2_ENDPOINT: "",
      B2_KEY_ID: "",
      B2_APP_KEY: "",
      B2_BUCKET: "",
    },
    // Timeout for integration tests (bcrypt hashing takes a moment)
    testTimeout: 15_000,
    // SQLite doesn't handle parallel writes — run test files one at a time
    fileParallelism: false,

    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/tests/**", "src/**/*.d.ts"],
    },
  },
});
