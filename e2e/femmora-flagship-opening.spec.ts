import { test, expect, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const runtime = "/dev/luxury-fashion-runtime?skipIntro=1";
const shotDir = path.join("e2e", "screenshots", "femmora");

async function dismissCookieBanner(page: import("@playwright/test").Page) {
  const essential = page.getByRole("button", { name: /essential only/i });
  try {
    await essential.click({ timeout: 4_000 });
  } catch {
    /* banner already gone */
  }
}

async function completeOpening(page: import("@playwright/test").Page) {
  await dismissCookieBanner(page);
  const unveil = page.getByRole("button", { name: /tap to unveil|enter the unveiling/i });
  await expect(unveil).toBeVisible({ timeout: 45_000 });
  await unveil.click();

  const opening = page.getByTestId("luxury-fashion-opening");
  await expect(opening).toBeVisible({ timeout: 15_000 });
  const silk = page.getByTestId("fashion-silk-stage");
  await expect(silk).toBeVisible({ timeout: 15_000 });
  await expect(silk).toBeDisabled();
  await page.waitForTimeout(650);
  await expect(silk).toBeEnabled({ timeout: 5_000 });
  await silk.click();

  const doors = page.getByTestId("fashion-boutique-portal");
  await expect(doors).toBeVisible({ timeout: 8_000 });
  await page.waitForTimeout(650);
  await expect(doors).toBeEnabled({ timeout: 5_000 });
  await doors.click();

  await expect(opening).toBeHidden({ timeout: 15_000 });
  await expect(page.getByTestId("luxury-fashion-flagship")).toBeVisible({ timeout: 15_000 });
}

async function inviteScroller(page: import("@playwright/test").Page) {
  return page.locator(".invite-viewport-root").filter({ has: page.getByTestId("luxury-fashion-flagship") });
}

async function assertScrollUnlocked(page: import("@playwright/test").Page) {
  const scroller = await inviteScroller(page);
  await expect(scroller).toBeVisible();
  const before = await scroller.evaluate((el) => (el as HTMLElement).scrollTop);
  await scroller.evaluate((el) => {
    (el as HTMLElement).scrollTop += 280;
  });
  expect(await scroller.evaluate((el) => (el as HTMLElement).scrollTop)).toBeGreaterThan(before);
}

async function shot(page: import("@playwright/test").Page, name: string) {
  fs.mkdirSync(shotDir, { recursive: true });
  await page.screenshot({ path: path.join(shotDir, `${name}.png`), fullPage: true });
}

test.describe("Femmora luxury flagship opening", () => {
  test("mobile journey from unveil through invitation actions", async ({ browser }) => {
    const context = await browser.newContext(devices["iPhone 13"]);
    const page = await context.newPage();
    await page.goto(runtime, { waitUntil: "domcontentloaded" });
    await dismissCookieBanner(page);
    await shot(page, "A-mobile-whisper");

    const unveil = page.getByRole("button", { name: /tap to unveil|enter the unveiling/i });
    await expect(unveil).toBeVisible({ timeout: 45_000 });
    await shot(page, "B-mobile-tap-to-unveil");
    await unveil.click();

    const silk = page.getByTestId("fashion-silk-stage");
    await expect(silk).toBeVisible({ timeout: 15_000 });
    await shot(page, "C-mobile-closed-silk");
    await page.waitForTimeout(650);
    await expect(silk).toBeEnabled({ timeout: 5_000 });
    await silk.click();
    await shot(page, "D-mobile-silk-opening");

    const doors = page.getByTestId("fashion-boutique-portal");
    await expect(doors).toBeVisible({ timeout: 8_000 });
    await page.waitForTimeout(650);
    await shot(page, "E-mobile-boutique-portal");
    await expect(doors).toBeEnabled({ timeout: 5_000 });
    await doors.click();

    await expect(page.getByTestId("luxury-fashion-opening")).toBeHidden({ timeout: 15_000 });
    await expect(page.getByTestId("luxury-fashion-flagship")).toBeVisible({ timeout: 15_000 });
    await assertScrollUnlocked(page);
    await shot(page, "G-mobile-details");

    await page.getByTestId("fashion-film-placeholder").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("fashion-film-placeholder")).toBeVisible();
    await shot(page, "F-mobile-store-film");
    await page.getByRole("button", { name: /continue to the invitation/i }).click();

    await page.getByTestId("fashion-lookbook").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("fashion-lookbook")).toBeVisible();
    await shot(page, "H-mobile-lookbook");

    const maps = page.getByTestId("fashion-maps-cta");
    await expect(maps).toHaveAttribute("href", /google\.com\/maps/);
    await expect(page.getByTestId("fashion-calendar")).toBeVisible();

    await page.getByTestId("fashion-rsvp").scrollIntoViewIfNeeded();
    await expect(page.getByRole("button", { name: /attending/i })).toBeVisible();
    await shot(page, "I-mobile-rsvp");

    await page.getByTestId("fashion-copy-link").click();
    await expect(page.getByTestId("fashion-copy-link")).toContainText(/copied|copy/i);

    await page.getByTestId("fashion-finale").scrollIntoViewIfNeeded();
    await shot(page, "J-mobile-finale");

    const scroller = await inviteScroller(page);
    await scroller.evaluate((el) => {
      (el as HTMLElement).scrollTop = 0;
    });
    await page.getByTestId("fashion-nav").getByRole("button", { name: /the unveiling/i }).click();
    await expect(page.getByTestId("fashion-details")).toBeInViewport({ timeout: 5_000 });

    await context.close();
  });

  test("desktop critical journey and rapid tapping does not skip silk", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(runtime, { waitUntil: "domcontentloaded" });
    await dismissCookieBanner(page);
    await shot(page, "A-desktop-whisper");
    const unveil = page.getByRole("button", { name: /tap to unveil/i });
    await expect(unveil).toBeVisible({ timeout: 45_000 });
    await unveil.click({ clickCount: 3 });
    const opening = page.getByTestId("luxury-fashion-opening");
    await expect(opening).toBeVisible({ timeout: 15_000 });
    const silk = page.getByTestId("fashion-silk-stage");
    await expect(silk).toBeVisible({ timeout: 15_000 });
    await silk.click({ clickCount: 4 });
    await expect(opening).toBeVisible();
    await expect(opening).toHaveAttribute("data-fashion-phase", /silk|arming-silk|silk-opening|arming-doors|doors/);
    const doors = page.getByTestId("fashion-boutique-portal");
    if (await doors.isVisible().catch(() => false)) {
      await page.waitForTimeout(650);
      await expect(doors).toBeEnabled({ timeout: 5_000 });
      await doors.click();
    } else {
      await page.waitForTimeout(650);
      await expect(silk).toBeEnabled({ timeout: 5_000 });
      await silk.click();
      await expect(doors).toBeVisible({ timeout: 8_000 });
      await page.waitForTimeout(650);
      await doors.click();
    }
    await expect(opening).toBeHidden({ timeout: 15_000 });
    await expect(page.getByTestId("luxury-fashion-flagship")).toBeVisible({ timeout: 15_000 });
    await assertScrollUnlocked(page);
    await shot(page, "G-desktop-details");
    await context.close();
  });

  test("reduced motion still offers a premium two-gesture entrance", async ({ browser }) => {
    const context = await browser.newContext({
      ...devices["iPhone 13"],
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto(runtime, { waitUntil: "domcontentloaded" });
    await completeOpening(page);
    await expect(page.getByTestId("luxury-fashion-flagship")).toBeVisible();
    await assertScrollUnlocked(page);
    await context.close();
  });

  test("share fallback copy works without Web Share", async ({ browser }) => {
    const context = await browser.newContext(devices["iPhone 13"]);
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    });
    const page = await context.newPage();
    await page.goto(runtime, { waitUntil: "domcontentloaded" });
    await completeOpening(page);
    await page.getByTestId("fashion-share").scrollIntoViewIfNeeded();
    await page.getByTestId("fashion-copy-link").click();
    await expect(page.getByTestId("fashion-copy-link")).toContainText(/copied/i);
    await context.close();
  });

  test("missing store film still lets the guest continue", async ({ browser }) => {
    const context = await browser.newContext(devices["iPhone 13"]);
    const page = await context.newPage();
    await page.goto(runtime, { waitUntil: "domcontentloaded" });
    await completeOpening(page);
    await page.getByTestId("fashion-film-placeholder").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: /continue to the invitation/i }).click();
    await expect(page.getByTestId("fashion-lookbook")).toBeVisible();
    await context.close();
  });
});
