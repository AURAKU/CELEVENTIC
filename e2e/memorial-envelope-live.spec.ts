import { test, expect, devices } from "@playwright/test";

const inviteLink = process.env.MEMORIAL_INVITE_LINK?.replace(/^\//, "");

test.describe("memorial envelope live ceremony", () => {
  test.skip(!inviteLink, "Set MEMORIAL_INVITE_LINK to a published /invite/[link] slug");

  const viewports = [
    { name: "mobile-safari", context: devices["iPhone 13"] },
    { name: "android-chrome", context: devices["Pixel 7"] },
    { name: "desktop", context: { viewport: { width: 1280, height: 800 } } },
  ];

  for (const vp of viewports) {
    test(`full ceremony on ${vp.name}`, async ({ browser }, testInfo) => {
      const context = await browser.newContext(vp.context);
      const page = await context.newPage();

      await page.goto(`/invite/${inviteLink}`, { waitUntil: "domcontentloaded" });

      // A. Celeventic intro / tap gate
      const tapBegin = page.getByRole("button", { name: /tap to begin|open invitation/i });
      await expect(tapBegin).toBeVisible({ timeout: 120_000 });
      await testInfo.attach(`A-tap-to-begin-${vp.name}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      });

      await tapBegin.click();

      // B. Sealed envelope must appear
      const envelope = page.locator(
        '[data-reveal-mechanic="wax-seal"], .envelope-collection-reveal, [data-envelope-phase="idle"]'
      );
      await expect(envelope.first()).toBeVisible({ timeout: 30_000 });
      await testInfo.attach(`B-sealed-envelope-${vp.name}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      });

      // Wait 15s — portal must NOT replace envelope
      await page.waitForTimeout(15_000);
      await expect(envelope.first()).toBeVisible();
      const portalScroll = page.locator(".inv-portal-open-from-top, .guest-invitation-portal");
      await expect(portalScroll.first()).not.toBeVisible();

      // C. Tap wax seal
      const seal = page.locator(
        '[data-envelope-seal], .wax-seal, button:has-text("seal"), [aria-label*="seal" i]'
      );
      await seal.first().click({ timeout: 15_000 });
      await testInfo.attach(`C-opening-${vp.name}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      });

      // D. Invitation cover appears after ceremony
      await expect(portalScroll.first()).toBeVisible({ timeout: 90_000 });
      await testInfo.attach(`D-final-cover-${vp.name}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      });

      await page.evaluate(() => window.scrollBy(0, 400));
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

      await context.close();
    });
  }
});
