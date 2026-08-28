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

async function continueOpeningFilm(page: import("@playwright/test").Page) {
  const film = page.getByTestId("fashion-opening-film");
  await expect(film).toBeVisible({ timeout: 12_000 });
  await film.getByRole("button", { name: /continue to the invitation/i }).click();
}

async function assertHubCoveredByOpening(page: import("@playwright/test").Page) {
  const opening = page.getByTestId("luxury-fashion-opening");
  await expect(opening).toBeVisible();
  const covered = await page.evaluate(() => {
    const mid = document.elementFromPoint(
      Math.floor(window.innerWidth / 2),
      Math.floor(window.innerHeight / 2)
    );
    return Boolean(mid?.closest('[data-testid="luxury-fashion-opening"]'));
  });
  expect(covered).toBe(true);
  await expect(opening).not.toHaveAttribute("data-fashion-phase", /film|complete/);
}

async function completeOpening(page: import("@playwright/test").Page) {
  await dismissCookieBanner(page);
  const unveil = page.getByRole("button", { name: /enter the unveiling|tap to unveil/i });
  await expect(unveil).toBeVisible({ timeout: 45_000 });
  await unveil.click();

  const { silk } = await waitForArmedSilk(page);
  await assertHubCoveredByOpening(page);
  await silk.click();

  await continueOpeningFilm(page);
  await expect(page.getByTestId("luxury-fashion-opening")).toBeHidden({ timeout: 15_000 });
  await expect(page.getByTestId("luxury-fashion-flagship")).toBeVisible({ timeout: 15_000 });
  await dismissCookieBanner(page);
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
    const mid = document.elementFromPoint(Math.floor(window.innerWidth / 2), Math.floor(window.innerHeight / 2));
    return {
      htmlOverflow: html.overflow,
      bodyOverflow: body.overflow,
      bodyTouch: body.touchAction,
      bodyPointer: body.pointerEvents,
      openingAlive: Boolean(document.querySelector('[data-testid="luxury-fashion-opening"]')),
      midTestId: (mid as HTMLElement | null)?.closest("[data-testid]")?.getAttribute("data-testid") ?? null,
    };
  });
  expect(freeze.bodyOverflow).not.toBe("hidden");
  expect(freeze.bodyTouch).not.toBe("none");
  expect(freeze.bodyPointer).not.toBe("none");
  expect(freeze.openingAlive).toBe(false);
  expect(freeze.midTestId).not.toBe("luxury-fashion-opening");
  expect(freeze.midTestId).not.toBe("fashion-silk-stage");
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
    test.setTimeout(120_000);
    const context = await browser.newContext(devices["iPhone 13"]);
    const page = await context.newPage();
    await page.goto(runtime, { waitUntil: "domcontentloaded" });
    await dismissCookieBanner(page);
    await shot(page, "A-mobile-whisper");

    const unveil = page.getByRole("button", { name: /enter the unveiling/i });
    await expect(unveil).toBeVisible({ timeout: 45_000 });
    await shot(page, "B-mobile-tap-to-unveil");
    await unveil.click();

    const opening = page.getByTestId("luxury-fashion-opening");
    await expect(opening).toBeVisible({ timeout: 15_000 });
    const silk = page.getByTestId("fashion-silk-stage");
    await expect(silk).toBeVisible({ timeout: 15_000 });
    await assertHubCoveredByOpening(page);
    const leakPhase = await opening.getAttribute("data-fashion-phase");
    if (leakPhase !== "silk") {
      await silk.click({ force: true });
      await expect(opening).not.toHaveAttribute("data-fashion-phase", /silk-opening|doors-opening|film|complete/);
    }
    await expect(opening).toHaveAttribute("data-fashion-phase", /arming-silk|silk/);
    await shotOpening(page, "C-mobile-closed-silk");

    await expect(opening).toHaveAttribute("data-fashion-phase", "silk", { timeout: 8_000 });
    await expect(silk).toBeEnabled({ timeout: 5_000 });
    await silk.click();
    await expect(opening).toHaveAttribute("data-fashion-phase", /silk-opening|doors-opening|film/, {
      timeout: 3_000,
    });
    await shotOpening(page, "D-mobile-silk-opening");
    await expect(page.getByTestId("fashion-boutique-portal")).toBeVisible({ timeout: 8_000 });
    await shotOpening(page, "E-mobile-boutique-portal");

    await continueOpeningFilm(page);
    await expect(page.getByTestId("luxury-fashion-opening")).toBeHidden({ timeout: 15_000 });
    await expect(page.getByTestId("luxury-fashion-flagship")).toBeVisible({ timeout: 15_000 });
    await dismissCookieBanner(page);
    await assertScrollUnlocked(page);
    await shot(page, "G-mobile-details");

    await page.getByTestId("fashion-film-scene").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("fashion-film-scene")).toBeVisible();
    await shot(page, "F-mobile-store-film");
    const film = page.getByTestId("fashion-film-scene");
    await film.getByRole("button", { name: /step inside|play/i }).first().click();
    await expect(film.getByRole("button", { name: /mute|unmute/i })).toBeVisible();
    await film.getByRole("button", { name: /mute|unmute/i }).click();
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
    await expect(page.getByRole("radio", { name: /29 august/i })).toBeVisible();
    await page.getByRole("radio", { name: /both/i }).click();
    await expect(page.getByRole("button", { name: /yes — i.ll be there|i'll be there/i })).toBeVisible();
    await shot(page, "I-mobile-rsvp");

    await page.getByTestId("fashion-copy-link").click();
    await expect(page.getByTestId("fashion-copy-link")).toContainText(/copied|copy/i);

    await page.getByTestId("fashion-finale").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("fashion-finale")).toContainText(/see you inside|new chapter/i);
    await expect(page.getByTestId("fashion-finale-actions").getByRole("button", { name: /replay store film/i })).toBeVisible();
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

  test("sealed silk waits 12 seconds after Enter the Unveiling", async ({ browser }) => {
    test.setTimeout(60_000);
    const context = await browser.newContext(devices["iPhone 13"]);
    const page = await context.newPage();
    await page.goto(runtime, { waitUntil: "domcontentloaded" });
    await dismissCookieBanner(page);
    await page.getByRole("button", { name: /enter the unveiling/i }).click();
    const { opening, silk } = await waitForArmedSilk(page);
    await assertHubCoveredByOpening(page);
    await page.waitForTimeout(12_000);
    await expect(opening).toHaveAttribute("data-fashion-phase", "silk");
    await expect(silk).toBeEnabled();
    await assertHubCoveredByOpening(page);
    await silk.click();
    await continueOpeningFilm(page);
    await expect(page.getByTestId("luxury-fashion-flagship")).toBeVisible({ timeout: 15_000 });
    await context.close();
  });

  test("desktop critical journey and rapid tapping does not skip silk", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(runtime, { waitUntil: "domcontentloaded" });
    await dismissCookieBanner(page);
    await shot(page, "A-desktop-whisper");
    const unveil = page.getByRole("button", { name: /enter the unveiling/i });
    await expect(unveil).toBeVisible({ timeout: 45_000 });
    await unveil.click({ clickCount: 3 });
    const { opening, silk } = await waitForArmedSilk(page);
    await assertHubCoveredByOpening(page);
    await silk.click({ clickCount: 4 });
    await expect(opening).toBeVisible();
    await expect(opening).toHaveAttribute("data-fashion-phase", /silk|silk-opening|doors-opening|film/);
    await continueOpeningFilm(page);
    await expect(opening).toBeHidden({ timeout: 15_000 });
    await expect(page.getByTestId("luxury-fashion-flagship")).toBeVisible({ timeout: 15_000 });
    await assertScrollUnlocked(page);
    await shot(page, "G-desktop-details");
    await context.close();
  });

  test("390, 430 and tablet frames keep the invitation hub usable", async ({ browser }) => {
    test.setTimeout(150_000);
    for (const [name, viewport] of [
      ["390", { width: 390, height: 844 }],
      ["430", { width: 430, height: 932 }],
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

  test("store film plays and still lets the guest continue", async ({ browser }) => {
    const context = await browser.newContext(devices["iPhone 13"]);
    const page = await context.newPage();
    await page.goto(runtime, { waitUntil: "domcontentloaded" });
    await completeOpening(page);
    await page.getByTestId("fashion-film-scene").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: /continue to the invitation/i }).click();
    await expect(page.getByTestId("fashion-lookbook").or(page.getByTestId("fashion-lookbook-empty"))).toBeVisible();
    await context.close();
  });

  test("broken store film still lets the guest continue and scroll", async ({ browser }) => {
    const context = await browser.newContext(devices["iPhone 13"]);
    const page = await context.newPage();
    await page.route("**/templates/femmora/store-preview.mp4**", (route) => route.abort());
    await page.goto(runtime, { waitUntil: "domcontentloaded" });
    await completeOpening(page);
    await page.getByTestId("fashion-film-scene").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: /retry film|step inside|play/i }).first().click();
    await expect(page.getByText(/could not load|retry or continue/i)).toBeVisible({ timeout: 8_000 });
    await page.getByRole("button", { name: /continue to the invitation/i }).click();
    await assertScrollUnlocked(page);
    await expect(page.getByTestId("fashion-lookbook").or(page.getByTestId("fashion-lookbook-empty"))).toBeVisible();
    await context.close();
  });
});
