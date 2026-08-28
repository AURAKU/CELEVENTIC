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

async function waitForArmedSilk(page: import("@playwright/test").Page) {
  const opening = page.getByTestId("luxury-fashion-opening");
  await expect(opening).toBeVisible({ timeout: 15_000 });
  const silk = page.getByTestId("fashion-silk-stage");
  await expect(silk).toBeVisible({ timeout: 15_000 });
  await expect(opening).toHaveAttribute("data-fashion-phase", "silk", { timeout: 8_000 });
  await expect(silk).toBeEnabled({ timeout: 5_000 });
  return { opening, silk };
}

async function completeOpening(page: import("@playwright/test").Page) {
  await dismissCookieBanner(page);
  const unveil = page.getByRole("button", { name: /tap to unveil|enter the unveiling/i });
  await expect(unveil).toBeVisible({ timeout: 45_000 });
  await unveil.click();

  const { silk } = await waitForArmedSilk(page);
  await silk.click();

  const doors = page.getByTestId("fashion-boutique-portal");
  await expect(doors).toBeVisible({ timeout: 8_000 });
  await page.waitForTimeout(650);
  await expect(doors).toBeEnabled({ timeout: 5_000 });
  await doors.click();

  await expect(page.getByTestId("luxury-fashion-opening")).toBeHidden({ timeout: 15_000 });
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

  const freeze = await page.evaluate(() => {
    const html = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    return {
      htmlOverflow: html.overflow,
      bodyOverflow: body.overflow,
      bodyTouch: body.touchAction,
      bodyPointer: body.pointerEvents,
    };
  });
  expect(freeze.bodyOverflow).not.toBe("hidden");
  expect(freeze.bodyTouch).not.toBe("none");
  expect(freeze.bodyPointer).not.toBe("none");
}

async function shot(page: import("@playwright/test").Page, name: string, fullPage = false) {
  fs.mkdirSync(shotDir, { recursive: true });
  await page.screenshot({ path: path.join(shotDir, `${name}.png`), fullPage });
}

async function shotOpening(page: import("@playwright/test").Page, name: string) {
  fs.mkdirSync(shotDir, { recursive: true });
  await page.getByTestId("luxury-fashion-opening").screenshot({ path: path.join(shotDir, `${name}.png`) });
}

test.describe("Femmora luxury flagship opening", () => {
  test("mobile journey from whisper through invitation actions", async ({ browser }) => {
    test.setTimeout(90_000);
    const context = await browser.newContext(devices["iPhone 13"]);
    const page = await context.newPage();
    await page.goto(runtime, { waitUntil: "domcontentloaded" });
    await dismissCookieBanner(page);
    await shot(page, "A-mobile-whisper");

    const unveil = page.getByRole("button", { name: /tap to unveil|enter the unveiling/i });
    await expect(unveil).toBeVisible({ timeout: 45_000 });
    await shot(page, "B-mobile-tap-to-unveil");
    await unveil.click();

    const opening = page.getByTestId("luxury-fashion-opening");
    await expect(opening).toHaveAttribute("data-fashion-phase", "whisper", { timeout: 15_000 });
    const silk = page.getByTestId("fashion-silk-stage");
    await expect(silk).toBeDisabled();
    await shotOpening(page, "C-mobile-closed-silk");
    await silk.click({ force: true }).catch(() => undefined);
    await expect(opening).toHaveAttribute("data-fashion-phase", /whisper|arming-silk|silk/);
    await expect(opening).not.toHaveAttribute("data-fashion-phase", /doors|complete/);

    await expect(opening).toHaveAttribute("data-fashion-phase", "silk", { timeout: 8_000 });
    await expect(silk).toBeEnabled({ timeout: 5_000 });
    await silk.click();
    await expect(opening).toHaveAttribute("data-fashion-phase", /silk-opening|arming-doors|doors/, { timeout: 3_000 });
    await shotOpening(page, "D-mobile-silk-opening");

    const doors = page.getByTestId("fashion-boutique-portal");
    await expect(doors).toBeVisible({ timeout: 8_000 });
    await page.waitForTimeout(650);
    await shotOpening(page, "E-mobile-boutique-portal");
    await expect(doors).toBeEnabled({ timeout: 5_000 });
    await doors.click();

    await expect(page.getByTestId("luxury-fashion-opening")).toBeHidden({ timeout: 15_000 });
    await expect(page.getByTestId("luxury-fashion-flagship")).toBeVisible({ timeout: 15_000 });
    await dismissCookieBanner(page);
    await assertScrollUnlocked(page);
    await shot(page, "G-mobile-details");

    await page.getByTestId("fashion-film-placeholder").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("fashion-film-placeholder")).toBeVisible();
    await shot(page, "F-mobile-store-film");
    await page.getByRole("button", { name: /continue to the invitation/i }).click();

    const lookbook = page.getByTestId("fashion-lookbook").or(page.getByTestId("fashion-lookbook-empty"));
    await lookbook.scrollIntoViewIfNeeded();
    await expect(lookbook).toBeVisible();
    const firstLook = page.locator("[data-testid='fashion-lookbook'] button").first();
    if (await firstLook.isVisible().catch(() => false)) {
      await firstLook.evaluate((el) => el.scrollIntoView({ inline: "center", block: "nearest" }));
    }
    await shot(page, "H-mobile-lookbook");

    const maps = page.getByTestId("fashion-maps-cta");
    await expect(maps).toHaveAttribute("href", /google\.com\/maps/);
    await expect(page.getByTestId("fashion-calendar")).toBeVisible();
    await expect(page.getByTestId("fashion-countdown")).toBeVisible();

    await page.getByTestId("fashion-rsvp").scrollIntoViewIfNeeded();
    await expect(page.getByRole("button", { name: /yes — i.ll be there|i'll be there/i })).toBeVisible();
    await shot(page, "I-mobile-rsvp");

    await page.getByTestId("fashion-copy-link").click();
    await expect(page.getByTestId("fashion-copy-link")).toContainText(/copied|copy/i);

    await page.getByTestId("fashion-finale").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("fashion-finale")).toContainText(/see you inside|new chapter/i);
    await shot(page, "J-mobile-finale");

    const scroller = await inviteScroller(page);
    await scroller.evaluate((el) => {
      (el as HTMLElement).scrollTop = 0;
    });
    await page.getByTestId("fashion-nav").getByRole("button", { name: /enter experience/i }).click();
    await expect(page.getByTestId("fashion-boutique-experience")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId("fashion-boutique-close")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("fashion-boutique-experience")).toHaveCount(0);
    await assertScrollUnlocked(page);

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
    await expect(opening).toHaveAttribute("data-fashion-phase", /whisper|silk|arming-silk|silk-opening|arming-doors|doors/);
    const doors = page.getByTestId("fashion-boutique-portal");
    if (await doors.isVisible().catch(() => false)) {
      await page.waitForTimeout(650);
      await expect(doors).toBeEnabled({ timeout: 5_000 });
      await doors.click();
    } else {
      await expect(opening).toHaveAttribute("data-fashion-phase", "silk", { timeout: 8_000 });
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

  test("390 and tablet frames keep the invitation hub usable", async ({ browser }) => {
    test.setTimeout(120_000);
    for (const [name, viewport] of [
      ["390", { width: 390, height: 844 }],
      ["tablet", { width: 768, height: 1024 }],
    ] as const) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      await page.goto(runtime, { waitUntil: "domcontentloaded" });
      await completeOpening(page);
      await shot(page, `K-${name}-hub`);
      await expect(page.getByTestId("fashion-nav").getByRole("button", { name: /view collection/i })).toBeVisible();
      await context.close();
    }
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
    await expect(page.getByTestId("fashion-lookbook").or(page.getByTestId("fashion-lookbook-empty"))).toBeVisible();
    await context.close();
  });
});
