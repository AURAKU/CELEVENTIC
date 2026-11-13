import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

/**
 * Viewport overflow and screenshot suite for CeleYou Adaptive UI.
 * Visual review of e2e/screenshots/adaptive-*.png is required.
 * DOM overflow passing does not prove the layout looks premium.
 */

const VIEWPORTS = [
  { name: "small-phone", width: 320, height: 568 },
  { name: "android-compact", width: 360, height: 640 },
  { name: "iphone-se", width: 375, height: 667 },
  { name: "iphone-14", width: 390, height: 844 },
  { name: "iphone-pro-max", width: 430, height: 932 },
  { name: "small-tablet", width: 600, height: 960 },
  { name: "ipad-portrait", width: 768, height: 1024 },
  { name: "ipad-air", width: 820, height: 1180 },
  { name: "ipad-landscape", width: 1024, height: 768 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "large-desktop", width: 1920, height: 1080 },
] as const;

const ROUTES = [
  { id: "public-card", path: "/u/kojo-mensah" },
  { id: "tap-guest", path: "/tap/ABCDEF" },
  { id: "plans", path: "/digital-cards" },
] as const;

async function overflow(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return {
      scrollWidth: Math.max(doc.scrollWidth, body.scrollWidth),
      innerWidth: window.innerWidth,
      minFont: Number.parseFloat(getComputedStyle(body).fontSize),
    };
  });
}

test.describe("CeleYou Adaptive UI viewports", () => {
  for (const viewport of VIEWPORTS) {
    test(`${viewport.name} ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const route of ROUTES) {
        await page.goto(route.path, { waitUntil: "domcontentloaded" });
        await expect(page.locator("body")).toBeVisible();
        const metrics = await overflow(page);
        expect(
          metrics.scrollWidth,
          `${route.id} overflow at ${viewport.name}`
        ).toBeLessThanOrEqual(viewport.width + 2);
        expect(metrics.minFont).toBeGreaterThanOrEqual(14);
        await page.screenshot({
          path: path.join("e2e", "screenshots", `adaptive-${route.id}-${viewport.name}.png`),
          fullPage: true,
        });
      }
    });
  }
});
