import { test, expect, type Page } from "@playwright/test";

/**
 * Universal Connect guest landing and overflow checks.
 * Hardware AirDrop / Quick Share is not proven by this suite.
 */

const VIEWPORTS = [
  { name: "iphone", width: 390, height: 844 },
  { name: "android", width: 360, height: 640 },
  { name: "iphone-landscape", width: 844, height: 390 },
  { name: "android-landscape", width: 640, height: 360 },
] as const;

async function overflow(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return {
      scrollWidth: Math.max(doc.scrollWidth, body.scrollWidth),
      innerWidth: window.innerWidth,
    };
  });
}

test.describe("CeleYou Universal Connect guest landing", () => {
  for (const viewport of VIEWPORTS) {
    test(`${viewport.name} expired session stays on the guest page`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/tap/ABCDEF", { waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).toBeVisible();
      await expect(page.getByRole("heading", { name: /Connect Beyond the Tap/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /Create Your Free CeleYou/i })).toBeVisible();
      await expect(page.locator("body")).not.toContainText("Sign in required");
      const metrics = await overflow(page);
      expect(metrics.scrollWidth).toBeLessThanOrEqual(viewport.width + 2);
    });
  }

  test("expired pairing token does not leak private fields", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/tap/ABCDEF", { waitUntil: "domcontentloaded" });
    const html = await page.content();
    expect(html).not.toMatch(/visitorEmail|visitorPhone|password=/i);
    await expect(page.getByRole("link", { name: /Create Your Free CeleYou/i })).toBeVisible();
  });
});
