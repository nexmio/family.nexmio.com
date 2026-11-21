import { defineConfig } from "@playwright/test";

// The e2e tests run against a running server (make test-e2e starts one).
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  workers: 1,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8099", browserName: "chromium" },
  outputDir: "test-results",
});
