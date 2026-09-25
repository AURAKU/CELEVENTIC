import { test, expect, devices } from "@playwright/test";

const runtime = "/dev/aurelia-editorial-wedding?skipIntro=1";

async function prepareContext(context: import("@playwright/test").BrowserContext) {
  await context.addInitScript(() => {
    try {
      localStorage.setItem("celeventic_cookie_consent", "essential");
    } catch {
      /* private mode */
    }
  });
}

async function dismissCookieBanner(page: import("@playwright/test").Page) {
  const essential = page.getByRole("button", { name: /essential only/i });
  try {
    if (await essential.isVisible({ timeout: 2_500 }).catch(() => false)) {
      await essential.click({ force: true, timeout: 3_000 });
    }
  } catch {
    /* banner already gone */
  }
  await page.evaluate(() => {
    document.querySelectorAll('[aria-label="Privacy & Cookies"]').forEach((node) => {
      const el = node as HTMLElement;
      el.style.display = "none";
      el.style.pointerEvents = "none";
    });
  });
}

test.describe("Aurelia editorial wedding", () => {
  test("opens straight into Elorm and Dansowaa invitation", async ({ browser }) => {
    test.setTimeout(90_000);
    const context = await browser.newContext(devices["iPhone 13"]);
    await prepareContext(context);
    const page = await context.newPage();
    await page.goto(runtime, { waitUntil: "domcontentloaded" });
    await dismissCookieBanner(page);

    const body = page.getByTestId("aurelia-editorial-wedding");
    await expect(body).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: /tap to begin/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /tap to open/i })).toHaveCount(0);
    await expect(body.getByText("Elorm").first()).toBeVisible();
    await expect(body.getByText("Dansowaa").first()).toBeVisible();
    await expect(body.getByText("The Covenant")).toHaveCount(0);
    await expect(body.getByText("October 2026").first()).toBeVisible();
    await expect(body.getByText("22 October 2026").first()).toBeVisible();
    await expect(body.getByText("11:00 AM").first()).toBeVisible();
    await expect(body.getByText(/TLPCI/i).first()).toBeVisible();
    await expect(body.getByText("24 October 2026").first()).toBeVisible();
    await expect(body.getByText("1:00 PM").first()).toBeVisible();
    await expect(body.getByText(/Ultimate Christian Ministry Tse-Addo/i).first()).toBeVisible();
    await expect(page.getByText(/kofi/i)).toHaveCount(0);
    await expect(page.getByText(/kamilia/i)).toHaveCount(0);
    await expect(page.getByText(/anagkazo/i)).toHaveCount(0);
    await expect(page.getByText(/lovable/i)).toHaveCount(0);
    await context.close();
  });
});
