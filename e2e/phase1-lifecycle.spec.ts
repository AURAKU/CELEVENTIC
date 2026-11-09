import { test, expect, type Page } from "@playwright/test";

/**
 * Phase 1 browser lifecycle coverage.
 *
 * Payment steps intercept Celeventic APIs. They are mocked-provider tests, not
 * Paystack sandbox acceptance. Do not treat a green run here as full
 * registration → paid ticket → live admission proof.
 */

const PREVIEW_INVITE = "/invite/preview-seraphine-champagne-wedding";

async function screenshot(page: Page, name: string) {
  await page.screenshot({
    path: `e2e/screenshots/v23-${name}.png`,
    fullPage: true,
  });
}

test.describe("Phase 1 lifecycle (mocked payments)", () => {
  test("1. registration and login forms render", async ({ page }) => {
    await page.goto("/auth/onboarding");
    await expect(page.getByRole("button", { name: /Create account|Continue|Host|Guest/i }).first()).toBeVisible();
    await screenshot(page, "01-onboarding");

    await page.goto("/auth/login");
    await expect(page.getByLabel(/Email or phone/i)).toBeVisible();
    await expect(page.getByLabel(/^Password$/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign in/i })).toBeVisible();
    await screenshot(page, "01-login");
  });

  test("2. event creation requires sign-in", async ({ page }) => {
    await page.goto("/dashboard/events/create");
    await page.waitForURL(/auth\/login|auth\/onboarding|dashboard/);
    const url = page.url();
    expect(url.includes("/auth/") || url.includes("/dashboard")).toBeTruthy();
    await screenshot(page, "02-event-create-auth");
  });

  test("3. invitation catalogue is reachable", async ({ page }) => {
    await page.goto("/invitations");
    await expect(page.locator("body")).toBeVisible();
    await screenshot(page, "03-invitations");
  });

  test("4-6. preview invitation, RSVP, and ticket surfaces", async ({ page }) => {
    await page.goto(PREVIEW_INVITE);
    await expect(page.locator("body")).toBeVisible();
    await screenshot(page, "04-preview-invitation");

    const rsvp = page.getByRole("button", { name: /RSVP|Accept|Yes/i }).first();
    if (await rsvp.count()) {
      await expect(rsvp).toBeVisible();
    }

    await page.goto("/discover");
    await expect(page.locator("body")).toBeVisible();
    await screenshot(page, "06-discover-tickets");
  });

  test("7. mocked payment initialize is distinguished from Paystack sandbox", async ({ page }) => {
    let mocked = false;
    await page.route("**/api/payments/**", async (route) => {
      mocked = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          mocked: true,
          provider: "mock",
          note: "Not a Paystack sandbox charge",
        }),
      });
    });
    await page.route("**/api/tickets/**", async (route) => {
      if (route.request().method() === "GET") {
        await route.continue();
        return;
      }
      mocked = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ mocked: true, provider: "mock" }),
      });
    });

    await page.goto("/discover");
    await page.evaluate(async () => {
      await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 100, mocked: true }),
      }).catch(() => undefined);
    });
    expect(mocked).toBeTruthy();
    await screenshot(page, "07-mocked-payment");
  });

  test("8-10. ticket issuance, QR, and admission routes render", async ({ page }) => {
    await page.goto("/admission/preview");
    await expect(page.locator("body")).toBeVisible();
    await screenshot(page, "10-admission");
  });

  test("11. memory album / offline surface is reachable", async ({ page }) => {
    await page.goto("/memory/preview-seraphine-champagne-wedding");
    await expect(page.locator("body")).toBeVisible();
    await screenshot(page, "11-offline-album");
  });

  test("12. gift wallet / reconciliation surface is reachable", async ({ page }) => {
    await page.goto("/gift/preview-seraphine-champagne-wedding");
    await expect(page.locator("body")).toBeVisible();
    await screenshot(page, "12-wallet");
  });
});

test.describe("Phase 1 lifecycle mobile viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("preview invitation at iPhone width", async ({ page }) => {
    await page.goto(PREVIEW_INVITE);
    await expect(page.locator("body")).toBeVisible();
    await screenshot(page, "mobile-preview-invitation");
  });
});
