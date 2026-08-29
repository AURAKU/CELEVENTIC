import { test, expect, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const runtime = "/dev/luxury-fashion-runtime?skipIntro=1";
const shotDir = path.join("e2e", "screenshots", "femmora");

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

async function enterTheHouse(page: import("@playwright/test").Page) {
  await dismissCookieBanner(page);
  const enter = page.getByRole("button", { name: /enter the house/i });
  await expect(enter).toBeVisible({ timeout: 45_000 });
  await dismissCookieBanner(page);
  await enter.click();
  const opening = page.getByTestId("luxury-fashion-opening");
  try {
    await expect(opening).toBeVisible({ timeout: 8_000 });
  } catch {
    await enter.focus();
    await page.keyboard.press("Enter");
  }
}

async function waitForArmedFolio(page: import("@playwright/test").Page) {
  const opening = page.getByTestId("luxury-fashion-opening");
  await expect(opening).toBeVisible({ timeout: 20_000 });
  await dismissCookieBanner(page);
  const folio = page.getByTestId("fashion-folio");
  await expect(folio).toBeVisible({ timeout: 15_000 });
  await expect(opening).toHaveAttribute("data-fashion-phase", "folio", { timeout: 8_000 });
  const clasp = page.getByTestId("fashion-folio-clasp");
  await expect(clasp).toBeEnabled({ timeout: 5_000 });
  return { opening, folio, clasp };
}

async function continueOpeningFilm(page: import("@playwright/test").Page) {
  const film = page.getByTestId("fashion-opening-film");
  await expect(film).toBeVisible({ timeout: 20_000 });
  await dismissCookieBanner(page);
  await film.getByRole("button", { name: /continue to the invitation/i }).click({ force: true });
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
  await enterTheHouse(page);

  const { clasp } = await waitForArmedFolio(page);
  await assertHubCoveredByOpening(page);
  await clasp.click({ force: true });

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
    await prepareContext(context);
    const page = await context.newPage();
    await page.goto(runtime, { waitUntil: "domcontentloaded" });
    await dismissCookieBanner(page);
    await expect(page.getByText("Soft Opening", { exact: true })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText(/^unveiled$/i)).toHaveCount(0);
    await expect(page.getByText(/tap to open/i).first()).toBeVisible();
    await shot(page, "A-mobile-whisper");

    const enter = page.getByRole("button", { name: /enter the house/i });
    await expect(enter).toBeVisible({ timeout: 45_000 });
    await shot(page, "B-mobile-tap-to-unveil");
    await enterTheHouse(page);

    const opening = page.getByTestId("luxury-fashion-opening");
    await expect(opening).toBeVisible({ timeout: 20_000 });
    const clasp = page.getByTestId("fashion-folio-clasp");
    await expect(page.getByTestId("fashion-folio")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("fashion-folio-teaser")).toBeVisible();
    await expect(page.getByText(/a private first look/i).first()).toBeVisible();
    await assertHubCoveredByOpening(page);
    const leakPhase = await opening.getAttribute("data-fashion-phase");
    if (leakPhase !== "folio" && leakPhase !== "arming-folio") {
      await clasp.click({ force: true });
      await expect(opening).not.toHaveAttribute("data-fashion-phase", /folio-opening|silk-opening|doors-opening|film|complete/);
    }
    await expect(opening).toHaveAttribute("data-fashion-phase", /arming-folio|folio/);
    await shotOpening(page, "C-mobile-closed-silk");

    await expect(opening).toHaveAttribute("data-fashion-phase", "folio", { timeout: 8_000 });
    await expect(clasp).toBeEnabled({ timeout: 5_000 });
    await clasp.click({ force: true });
    await expect(opening).toHaveAttribute("data-fashion-phase", /folio-opening|silk-opening|doors-opening|film/, {
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
    const hubScroller = await inviteScroller(page);
    await hubScroller.evaluate((el) => {
      (el as HTMLElement).scrollTop = 0;
    });
    await expect(page.getByTestId("fashion-details").getByRole("heading", { level: 1 })).toHaveText(/femmora/i);
    await expect(page.getByTestId("fashion-store-preview")).toHaveAttribute("data-open", "false");
    await expect(page.getByTestId("fashion-film-scene")).toBeHidden();
    await expect(page.getByTestId("fashion-details").getByRole("button", { name: /enter experience/i })).toBeVisible();
    await shot(page, "G-mobile-details");

    await page.getByTestId("fashion-store-preview-cta").click();
    await expect(page.getByTestId("fashion-store-preview")).toHaveAttribute("data-open", "true");
    await expect(page.getByTestId("fashion-film-scene")).toBeVisible();
    await page.getByTestId("fashion-film-scene").scrollIntoViewIfNeeded();
    await shot(page, "F-mobile-store-film");
    const film = page.getByTestId("fashion-film-scene");
    await expect(film.getByTestId("fashion-film-play")).toHaveCount(0);
    await expect(film.getByTestId("fashion-film-chrome")).toHaveCount(0);
    await expect(film.getByTestId("fashion-film-mute")).toHaveCount(0);
    await expect(film.getByTestId("fashion-film-replay")).toHaveCount(0);
    await expect(film.getByTestId("fashion-film-fullscreen")).toHaveCount(0);
    await expect(film.getByRole("button", { name: /step inside/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /continue to the invitation/i })).toHaveCount(0);
    await expect(film.getByTestId("fashion-film-toggle")).toBeVisible();
    await film.getByTestId("fashion-film-toggle").click();
    await page.getByTestId("fashion-nav").getByRole("button", { name: /view collection/i }).click();
    await expect(page.getByTestId("fashion-store-preview")).toHaveAttribute("data-open", "false");

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
    await expect(maps).toBeVisible();
    await page.getByTestId("fashion-copy-location").click();
    await expect(page.getByTestId("fashion-copy-location")).toContainText(/copied|copy/i);
    await expect(page.getByTestId("fashion-share-location")).toBeVisible();
    await expect(page.getByTestId("fashion-calendar")).toBeVisible();
    await expect(page.getByTestId("fashion-countdown")).toBeVisible();

    await page.getByTestId("fashion-rsvp").scrollIntoViewIfNeeded();
    await expect(page.getByRole("radio", { name: /29 august/i })).toBeVisible();
    await page.getByRole("radio", { name: /both/i }).click();
    await expect(page.getByRole("button", { name: /yes — i.ll be there|i'll be there/i })).toBeVisible();
    await shot(page, "I-mobile-rsvp");

    const social = page.getByTestId("fashion-social");
    await social.scrollIntoViewIfNeeded();
    await expect(social.getByRole("heading", { name: /follow femmora/i })).toBeVisible();
    await expect(social.getByText(/discover new arrivals/i)).toBeVisible();
    await expect(page.getByTestId("fashion-social-icon").locator("svg")).toBeVisible();
    await expect(page.getByTestId("fashion-social-handle")).toHaveAttribute(
      "href",
      "https://www.instagram.com/femmora_gh/"
    );
    await expect(page.getByTestId("fashion-social-icon")).toHaveAttribute(
      "href",
      "https://www.instagram.com/femmora_gh/"
    );
    await expect(page.getByTestId("fashion-social-cta")).toHaveAttribute(
      "href",
      "https://www.instagram.com/femmora_gh/"
    );
    await expect(page.getByTestId("fashion-social-cta")).toHaveAttribute("target", "_blank");
    await expect(page.getByTestId("fashion-social-cta")).toHaveAttribute("rel", /noopener/);
    await expect(page.getByTestId("fashion-social-handle")).toContainText("@femmora_gh");
    await expect(page.getByTestId("fashion-social-handle-tiktok")).toHaveAttribute(
      "href",
      "https://www.tiktok.com/@femmora.woman"
    );
    await expect(page.getByTestId("fashion-social-handle-tiktok")).toContainText("@femmora.woman");
    await expect(page.getByTestId("fashion-social-icon-tiktok")).toHaveAttribute(
      "href",
      "https://www.tiktok.com/@femmora.woman"
    );
    await expect(page.getByTestId("fashion-social-cta-tiktok")).toHaveAttribute(
      "href",
      "https://www.tiktok.com/@femmora.woman"
    );
    await expect(page.getByTestId("fashion-social-cta-tiktok")).toHaveAttribute("target", "_blank");
    await expect(page.getByTestId("fashion-social-cta-tiktok")).toHaveAttribute("rel", /noopener/);
    await page.getByTestId("fashion-social-cta").focus();
    await expect(page.getByTestId("fashion-social-cta")).toBeFocused();
    await expect(page.getByRole("link", { name: /follow femmora on instagram/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /follow femmora on tiktok/i }).first()).toBeVisible();

    await page.getByTestId("fashion-copy-link").click();
    await expect(page.getByTestId("fashion-copy-link")).toContainText(/share|copied/i);

    await page.getByTestId("fashion-finale").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("fashion-finale")).toContainText(/can't wait to welcome you|exclusive invitation/i);
    await expect(page.getByTestId("fashion-replay-unveiling")).toBeVisible();
    await expect(page.getByTestId("fashion-finale-actions").getByRole("button", { name: /replay store film/i })).toHaveCount(0);
    await expect(page.getByTestId("fashion-social")).toContainText("@femmora_gh");
    await expect(page.getByTestId("fashion-social")).toContainText("@femmora.woman");
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

  test("sealed folio waits 12 seconds after Enter the House", async ({ browser }) => {
    test.setTimeout(90_000);
    const context = await browser.newContext(devices["iPhone 13"]);
    await prepareContext(context);
    const page = await context.newPage();
    await page.goto(runtime, { waitUntil: "domcontentloaded" });
    await enterTheHouse(page);
    const { opening, clasp } = await waitForArmedFolio(page);
    await assertHubCoveredByOpening(page);
    await page.waitForTimeout(12_000);
    await expect(opening).toHaveAttribute("data-fashion-phase", "folio");
    await expect(clasp).toBeEnabled();
    await assertHubCoveredByOpening(page);
    await clasp.click({ force: true });
    await continueOpeningFilm(page);
    await expect(page.getByTestId("luxury-fashion-flagship")).toBeVisible({ timeout: 15_000 });
    await context.close();
  });

  test("desktop critical journey and rapid tapping does not skip silk", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await prepareContext(context);
    const page = await context.newPage();
    await page.goto(runtime, { waitUntil: "domcontentloaded" });
    await dismissCookieBanner(page);
    await expect(page.getByText("Soft Opening", { exact: true })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText(/^unveiled$/i)).toHaveCount(0);
    await shot(page, "A-desktop-whisper");
    const enter = page.getByRole("button", { name: /enter the house/i });
    await expect(enter).toBeVisible({ timeout: 45_000 });
    await enter.click({ clickCount: 3 });
    const { opening, clasp } = await waitForArmedFolio(page);
    await assertHubCoveredByOpening(page);
    await clasp.click({ clickCount: 4, force: true });
    await expect(opening).toBeVisible();
    await expect(opening).toHaveAttribute(
      "data-fashion-phase",
      /folio|folio-opening|silk-opening|doors-opening|film/
    );
    await continueOpeningFilm(page);
    await expect(opening).toBeHidden({ timeout: 15_000 });
    await expect(page.getByTestId("luxury-fashion-flagship")).toBeVisible({ timeout: 15_000 });
    await assertScrollUnlocked(page);
    await page.getByTestId("fashion-social").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("fashion-social-cta")).toHaveAttribute("target", "_blank");
    await expect(page.getByTestId("fashion-social-cta")).toHaveAttribute(
      "href",
      "https://www.instagram.com/femmora_gh/"
    );
    await shot(page, "G-desktop-details");
    await context.close();
  });

  test("320 to tablet frames keep the invitation hub usable", async ({ browser }) => {
    test.setTimeout(90_000);
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await prepareContext(context);
    const page = await context.newPage();
    await page.goto(runtime, { waitUntil: "domcontentloaded" });
    await completeOpening(page);
    for (const [name, viewport] of [
      ["320", { width: 320, height: 568 }],
      ["375", { width: 375, height: 667 }],
      ["390", { width: 390, height: 844 }],
      ["430", { width: 430, height: 932 }],
      ["tablet", { width: 768, height: 1024 }],
    ] as const) {
      await page.setViewportSize(viewport);
      await shot(page, `K-${name}-hub`);
      await expect(page.getByTestId("fashion-details").getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByTestId("fashion-nav").getByRole("button", { name: /view collection/i })).toBeVisible();
      await expect(page.getByTestId("fashion-nav").getByRole("button", { name: /follow femmora/i })).toBeVisible();
      await page.getByTestId("fashion-social").scrollIntoViewIfNeeded();
      const ctaBox = await page.getByTestId("fashion-social-cta").boundingBox();
      expect(ctaBox?.height ?? 0).toBeGreaterThanOrEqual(40);
    }
    await context.close();
  });

  test("reduced motion still offers a premium two-gesture entrance", async ({ browser }) => {
    const context = await browser.newContext({
      ...devices["iPhone 13"],
      reducedMotion: "reduce",
    });
    await prepareContext(context);
    const page = await context.newPage();
    await page.goto(runtime, { waitUntil: "domcontentloaded" });
    await completeOpening(page);
    await expect(page.getByTestId("luxury-fashion-flagship")).toBeVisible();
    await assertScrollUnlocked(page);
    await context.close();
  });

  test("share fallback copy works without Web Share", async ({ browser }) => {
    const context = await browser.newContext(devices["iPhone 13"]);
    await prepareContext(context);
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
    await prepareContext(context);
    const page = await context.newPage();
    await page.goto(runtime, { waitUntil: "domcontentloaded" });
    await completeOpening(page);
    await page.getByTestId("fashion-store-preview-cta").click();
    await expect(page.getByTestId("fashion-film-scene")).toBeVisible();
    await expect(page.getByTestId("fashion-film-play")).toHaveCount(0);
    await expect(page.getByTestId("fashion-film-chrome")).toHaveCount(0);
    await expect(page.getByTestId("fashion-film-mute")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /step inside/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /continue to the invitation/i })).toHaveCount(0);
    await page.getByTestId("fashion-nav").getByRole("button", { name: /view collection/i }).click();
    await expect(page.getByTestId("fashion-lookbook").or(page.getByTestId("fashion-lookbook-empty"))).toBeVisible();
    await context.close();
  });

  test("broken store film still lets the guest continue and scroll", async ({ browser }) => {
    const context = await browser.newContext(devices["iPhone 13"]);
    await prepareContext(context);
    const page = await context.newPage();
    await page.route("**/templates/femmora/store-preview.mp4**", (route) => route.abort());
    await page.goto(runtime, { waitUntil: "domcontentloaded" });
    await completeOpening(page);
    await page.getByTestId("fashion-store-preview-cta").click();
    await expect(page.getByTestId("fashion-film-scene")).toBeVisible();
    await expect(page.getByText(/could not load/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole("button", { name: /continue to the invitation/i })).toHaveCount(0);
    await page.getByTestId("fashion-nav").getByRole("button", { name: /view collection/i }).click();
    await assertScrollUnlocked(page);
    await expect(page.getByTestId("fashion-lookbook").or(page.getByTestId("fashion-lookbook-empty"))).toBeVisible();
    await context.close();
  });
});
