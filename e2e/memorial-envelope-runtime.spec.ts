import { test, expect, devices, type Page } from "@playwright/test";

/**
 * Production-shaped memorial ceremony runtime.
 * Uses /dev/ceremony-runtime harness (live-guest mount, no DB).
 */

const HARNESS = "/dev/ceremony-runtime?skipSoftIntro=1";
const HARNESS_THROW = "/dev/ceremony-runtime?skipSoftIntro=1&throwReveal=1";

async function dismissCookieBanner(page: Page) {
  const dialog = page.getByRole("dialog", { name: /privacy|cookies/i });
  try {
    await dialog.waitFor({ state: "visible", timeout: 3_000 });
  } catch {
    return;
  }
  const accept = page.getByRole("button", { name: /accept all/i }).or(
    page.getByRole("button", { name: /essential only/i })
  );
  await accept.first().click({ timeout: 5_000 }).catch(() => undefined);
  await dialog.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => undefined);
}

async function completeTapToBegin(page: Page) {
  await dismissCookieBanner(page);
  const tap = page
    .getByRole("button", { name: /tap to (begin|enter|open)/i })
    .first();
  await expect(tap).toBeVisible({ timeout: 60_000 });
  await tap.scrollIntoViewIfNeeded().catch(() => undefined);
  // Prefer Playwright's real pointer sequence on mobile; fall back to DOM click.
  try {
    await tap.click({ timeout: 5_000 });
  } catch {
    await tap.evaluate((el: HTMLElement) => el.click());
  }
  await expect(page.locator('[data-envelope-phase]').first()).toBeVisible({
    timeout: 20_000,
  });
}

async function waitForSealedEnvelope(page: Page) {
  const envelope = page.locator('[data-envelope-phase="idle"]');
  await expect(envelope.first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-ceremony-armed="true"]').first()).toBeVisible({
    timeout: 10_000,
  });
  return envelope;
}

async function assertPortalScrollable(page: Page) {
  // Prefer paged scroller; fall back to live viewport shell.
  const scrolled = await page.evaluate(() => {
    const paged = document.querySelector(".inv-paged-scroll") as HTMLElement | null;
    const shell = document.querySelector(".invite-viewport-live") as HTMLElement | null;
    const target = paged ?? shell;
    if (!target) return { ok: false, before: 0, after: 0, reason: "no-scroller" };

    const before = target.scrollTop;
    target.scrollTop = before + 500;
    const after = target.scrollTop;

    const bodyTouch = document.body.style.touchAction || "";
    const locked = document.documentElement.classList.contains("reveal-scroll-locked");
    const center = document.elementFromPoint(
      Math.floor(window.innerWidth / 2),
      Math.floor(window.innerHeight / 2)
    );
    const centerIsReveal = Boolean(
      center?.closest?.("[data-envelope-phase], .interactive-reveal-root")
    );

    return {
      ok: after > before && bodyTouch !== "none" && !locked && !centerIsReveal,
      before,
      after,
      bodyTouch,
      locked,
      centerIsReveal,
      reason: after > before ? "ok" : "scroll-unchanged",
    };
  });

  expect(scrolled.ok, JSON.stringify(scrolled)).toBeTruthy();
  expect(scrolled.after).toBeGreaterThan(scrolled.before);
}

const suites = [
  { name: "desktop", context: { viewport: { width: 1280, height: 800 } } },
  { name: "mobile", context: devices["iPhone 13"] },
];

for (const vp of suites) {
  test.describe(`memorial ceremony runtime (${vp.name})`, () => {
    test(`sealed envelope waits 15s then opens; portal scrolls`, async ({ browser }) => {
      test.setTimeout(180_000);
      const context = await browser.newContext(vp.context);
      const page = await context.newPage();

      const phases: Array<{ from?: string; to?: string; reason?: string }> = [];
      page.on("console", (msg) => {
        const text = msg.text();
        if (text.includes("[invite-phase]")) {
          try {
            const jsonStart = text.indexOf("{");
            if (jsonStart >= 0) phases.push(JSON.parse(text.slice(jsonStart)));
          } catch {
            /* ignore */
          }
        }
      });

      await page.addInitScript(() => {
        (window as unknown as { __CELEVENTIC_FORCE_DIAG?: boolean }).__CELEVENTIC_FORCE_DIAG =
          true;
      });

      await page.goto(HARNESS, { waitUntil: "domcontentloaded" });
      await completeTapToBegin(page);

      // Portal must NOT be interactive yet.
      await expect(page.locator('[data-envelope-phase="idle"]').first()).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.locator('[data-ceremony-recover="reveal"]')).toHaveCount(0);

      const envelope = await waitForSealedEnvelope(page);

      // 15-second sealed proof
      await page.waitForTimeout(15_000);
      await expect(envelope.first()).toBeVisible();
      await expect(page.locator('[data-envelope-phase="idle"]').first()).toBeVisible();

      // Wax seal — new gesture
      const seal = page.locator('[data-envelope-seal="true"]');
      await expect(seal.first()).toBeVisible();
      await seal.first().click();

      await expect(page.locator('[data-envelope-phase="idle"]')).toHaveCount(0, {
        timeout: 15_000,
      });

      // Wait for portal (memorial open can take ~12s)
      await expect
        .poll(
          async () =>
            page.evaluate(() => {
              return (
                !document.querySelector('[data-envelope-phase="idle"]') &&
                !document.querySelector('[data-envelope-phase="unsealing"]') &&
                !document.querySelector('[data-envelope-phase="opening"]') &&
                document.body.style.touchAction !== "none"
              );
            }),
          { timeout: 90_000 }
        )
        .toBeTruthy();

      await assertPortalScrollable(page);

      // Scroll back
      await page.evaluate(() => {
        const paged = document.querySelector(".inv-paged-scroll") as HTMLElement | null;
        const shell = document.querySelector(".invite-viewport-live") as HTMLElement | null;
        const target = paged ?? shell;
        if (target) target.scrollTop = 0;
      });

      await context.close();
    });

    test(`double-click Tap to Begin does not skip sealed wait`, async ({ browser }) => {
      test.setTimeout(90_000);
      const context = await browser.newContext(vp.context);
      const page = await context.newPage();
      await page.goto(HARNESS, { waitUntil: "domcontentloaded" });

      await dismissCookieBanner(page);
      const tap = page.getByRole("button", { name: /tap to (begin|enter|open)/i }).first();
      await expect(tap).toBeVisible({ timeout: 60_000 });
      await tap.evaluate((el: HTMLElement) => {
        el.click();
        el.click();
      });
      await waitForSealedEnvelope(page);
      await page.waitForTimeout(2_000);
      await expect(page.locator('[data-envelope-phase="idle"]').first()).toBeVisible();

      await context.close();
    });
  });
}

test("mandatory memorial reveal error does not silently portal", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(HARNESS_THROW, { waitUntil: "domcontentloaded" });
  await completeTapToBegin(page);

  await expect(page.locator('[data-ceremony-recover="reveal"]')).toBeVisible({
    timeout: 30_000,
  });
  // Must NOT have completed into an unlocked portal-only state without recovery.
  await expect(page.locator('[data-envelope-phase="idle"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: /show sealed envelope/i })).toBeVisible();
});
