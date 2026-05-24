import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Use a separate DB for tests so we don't clobber dev data
    env: {
      DB_PATH: "/tmp/projectS-test.db",
      JWT_SECRET: "test-secret-do-not-use-in-prod",
    },
    // Timeout for integration tests (bcrypt hashing takes a moment)
    testTimeout: 15_000,
    // SQLite doesn't handle parallel writes — run test files one at a time
    fileParallelism: false,
  },
});
