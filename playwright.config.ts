import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "npm run dev -- --port 3000",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: true,
        timeout: 180_000,
        env: {
          ...process.env,
          NEXT_PUBLIC_CELEVENTIC_LIVE_REVEAL_DIAG: "1",
          CELEVENTIC_CEREMONY_HARNESS: "1",
        },
      },
});
