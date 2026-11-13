import { defineConfig } from "@playwright/test";
import path from "node:path";

const isolatedDb = path.resolve("prisma/e2e-tap.db");
const port = process.env.PLAYWRIGHT_TAP_PORT || "3102";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: /celeyou-tap-mode\.spec\.ts/,
  timeout: 90_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: `npx tsx scripts/e2e-tap-mode-prepare.ts && ALLOW_DEV_RUNTIME=1 npm run dev -- --port ${port}`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 180_000,
        env: {
          ...process.env,
          DATABASE_URL: `file:${isolatedDb}`,
          ALLOW_DEV_RUNTIME: "1",
          REDIS_URL: "",
          PAYSTACK_SECRET_KEY: "",
          PAYSTACK_PUBLIC_KEY: "",
          NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "e2e-tap-nextauth-secret",
          NEXTAUTH_URL: baseURL,
          NEXT_PUBLIC_APP_URL: baseURL,
        },
      },
});
