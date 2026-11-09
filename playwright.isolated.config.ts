import { defineConfig } from "@playwright/test";
import path from "node:path";

const isolatedDb = path.resolve("prisma/e2e-isolated.db");
const port = process.env.PLAYWRIGHT_ISOLATED_PORT || "3101";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: /phase1-isolated\.spec\.ts/,
  timeout: 60_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
    command: `npx tsx scripts/e2e-isolated-prepare.ts && ALLOW_DEV_RUNTIME=1 npm run dev -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 180_000,
    env: {
      ...process.env,
      DATABASE_URL: `file:${isolatedDb}`,
      ALLOW_DEV_RUNTIME: "1",
      NEXT_PUBLIC_CELEVENTIC_LIVE_REVEAL_DIAG: "1",
      CELEVENTIC_CEREMONY_HARNESS: "1",
      PAYSTACK_SECRET_KEY: "",
      PAYSTACK_PUBLIC_KEY: "",
      ADMISSION_PASS_SECRET: "test-admission-secret-do-not-use-in-production",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "e2e-isolated-nextauth-secret",
      NEXTAUTH_URL: baseURL,
      NEXT_PUBLIC_APP_URL: baseURL,
    },
  },
});
