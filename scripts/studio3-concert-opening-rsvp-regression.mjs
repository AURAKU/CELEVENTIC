/**
 * P0 regression: Concert cinematic opening must not intercept RSVP.
 * Also smoke-checks other Batch 1 families after the modal/inert fix.
 *
 * Usage: node scripts/studio3-concert-opening-rsvp-regression.mjs
 * Env: STUDIO3_QA_BASE (default http://127.0.0.1:3002)
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.STUDIO3_QA_BASE || "http://127.0.0.1:3002";
const OUT = "docs/invitations/studio-3/phase-5/batch-1/acceptance-audit";
mkdirSync(OUT, { recursive: true });

const BATCH1 = [
  "ix3-heritage-marriage",
  "ix3-corporate-gala",
  "ix3-baby-shower",
  "ix3-graduation",
  "ix3-birthday-celebration",
  "ix3-concert-night",
];

function fail(message) {
  console.error("FAIL:", message);
  process.exitCode = 1;
}

async function seed(page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("celeventic_cookie_consent", JSON.stringify({ essential: true }));
    } catch {}
    try {
      for (const key of Object.keys(localStorage)) {
        if (/rsvp|ix3-preview/i.test(key)) localStorage.removeItem(key);
      }
    } catch {}
  });
}

async function gotoConcert(page) {
  await page.goto(`${BASE}/invitations/experience3/ix3-concert-night`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.getByTestId("ix3-opening-gate").waitFor({ state: "visible", timeout: 15000 });
  await page.getByTestId("ix3-opening-primary").waitFor({ state: "visible", timeout: 10000 });
  // SSR can paint the gate before hydration attaches dismiss handlers.
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(200);
}

async function dismissGate(page) {
  const gate = page.getByTestId("ix3-opening-gate");
  if (!(await gate.count())) return false;
  const primary = page.getByTestId("ix3-opening-primary");
  await primary.waitFor({ state: "visible", timeout: 5000 });
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await primary.evaluate((el) => {
      if (!(el instanceof HTMLButtonElement)) throw new Error("opening primary missing");
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      el.click();
    });
    try {
      await gate.waitFor({ state: "detached", timeout: 1000 });
      break;
    } catch {
      await page.waitForTimeout(150);
    }
  }
  if (await gate.count()) {
    // Last resort: Escape via the document capture listener.
    await page.evaluate(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true })
      );
    });
    await gate.waitFor({ state: "detached", timeout: 5000 });
  }
  await page.getByTestId("ix3-invitation-main").evaluate((el) => {
    if (el.hasAttribute("inert")) {
      throw new Error("main still inert after gate dismiss");
    }
  });
  return true;
}

async function acceptRsvp(page) {
  // Family-specific labels (P1-3) — use stable choice test ids, not English "Accept".
  const accept = page.getByTestId("rsvp-choice-ACCEPTED").first();
  await accept.scrollIntoViewIfNeeded();
  await accept.click({ timeout: 8000 });
  await page.waitForTimeout(700);
  const body = await page.innerText("body");
  return /Thank you|Pass confirmed|confirmed|blessing is received/i.test(body);
}

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  // —— 1) RSVP while cinematic opening is active (must NOT succeed through overlay) ——
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const page = await context.newPage();
    await seed(page);
    await gotoConcert(page);
    const gate = page.getByTestId("ix3-opening-gate");
    if (!(await gate.isVisible())) fail("expected cinematic gate visible");
    const main = page.getByTestId("ix3-invitation-main");
    const inert = await main.evaluate((el) => el.hasAttribute("inert") || el.inert === true);
    if (!inert) fail("invitation main must be inert while gate is open");
    const accept = page.getByTestId("rsvp-choice-ACCEPTED").first();
    let blocked = false;
    try {
      await accept.click({ timeout: 2500 });
    } catch {
      blocked = true;
    }
    if (!blocked) fail("Accept must not be actionable while cinematic gate is open");
    if (!(await gate.isVisible())) fail("gate should remain open when Accept is blocked");
    const thanked = /Thank you|Pass confirmed/i.test(await page.innerText("body"));
    if (thanked) fail("RSVP must not confirm while gate is open");
    await page.screenshot({
      path: join(OUT, "p0-concert-AFTER-gate-inert-blocks-rsvp.jpg"),
      type: "jpeg",
      quality: 60,
    });
    results.push({ case: "rsvp-while-gate-open-blocked", ok: blocked && inert });
    await context.close();
  }

  // —— 2) RSVP after dismissing opening ——
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const page = await context.newPage();
    await seed(page);
    await gotoConcert(page);
    await dismissGate(page);
    if (await page.getByTestId("ix3-opening-gate").count()) fail("gate should unmount after dismiss");
    const inert = await page.getByTestId("ix3-invitation-main").evaluate((el) => el.hasAttribute("inert"));
    if (inert) fail("invitation main must not stay inert after dismiss");
    const ok = await acceptRsvp(page);
    if (!ok) fail("Accept after dismiss should show Thank you");
    await page.screenshot({
      path: join(OUT, "p0-concert-AFTER-rsvp-confirmed.jpg"),
      type: "jpeg",
      quality: 60,
    });
    results.push({ case: "rsvp-after-dismiss", ok });
    await context.close();
  }

  // —— 3) Keyboard-only RSVP (Enter on CTA, then Enter on Accept) + Escape path ——
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await seed(page);
    await gotoConcert(page);
    // Escape path (document-level listener after hydration)
    await page.getByTestId("ix3-opening-primary").focus();
    await page.waitForTimeout(250);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    if (await page.getByTestId("ix3-opening-gate").count()) {
      // Fallback keyboard activation of the primary CTA (still keyboard-only)
      await page.getByTestId("ix3-opening-primary").focus();
      await page.keyboard.press("Enter");
      await page.getByTestId("ix3-opening-gate").waitFor({ state: "detached", timeout: 8000 });
    }
    if (await page.getByTestId("ix3-opening-gate").count()) fail("keyboard should dismiss gate");
    const accept = page.getByTestId("rsvp-choice-ACCEPTED").first();
    await accept.waitFor({ state: "visible", timeout: 8000 });
    await accept.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(700);
    const ok = /Thank you|Pass confirmed|confirmed/i.test(await page.innerText("body"));
    if (!ok) fail("keyboard Enter on Accept should confirm");
    results.push({ case: "keyboard-rsvp", ok });
    await context.close();
  }

  // —— 3b) Escape-only dismiss (fresh page) ——
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await seed(page);
    await gotoConcert(page);
    await page.getByTestId("ix3-opening-primary").focus();
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true })
      );
    });
    await page.getByTestId("ix3-opening-gate").waitFor({ state: "detached", timeout: 8000 });
    results.push({ case: "escape-dismiss", ok: true });
    await context.close();
  }

  // —— 4) Mobile touch: primary CTA then Accept ——
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    await seed(page);
    await gotoConcert(page);
    await page.getByTestId("ix3-opening-primary").tap();
    await page.waitForTimeout(350);
    const accept = page.getByTestId("rsvp-choice-ACCEPTED").first();
    await accept.scrollIntoViewIfNeeded();
    await accept.tap();
    await page.waitForTimeout(700);
    const ok = /Thank you|Pass confirmed|confirmed/i.test(await page.innerText("body"));
    if (!ok) fail("mobile tap RSVP should confirm");
    results.push({ case: "mobile-touch-rsvp", ok });
    await context.close();
  }

  // —— 5) Repeated opening/closing across reloads ——
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await seed(page);
    for (const mode of ["primary", "skip"]) {
      await gotoConcert(page);
      if (!(await page.getByTestId("ix3-opening-gate").isVisible())) fail(`gate missing on ${mode} cycle`);
      if (mode === "primary") await page.getByTestId("ix3-opening-primary").click();
      else await page.getByTestId("ix3-opening-skip").click();
      await page.waitForTimeout(250);
      if (await page.getByTestId("ix3-opening-gate").count()) fail(`gate stuck after ${mode}`);
    }
    const ok = await acceptRsvp(page);
    if (!ok) fail("RSVP after repeated open/close cycles");
    results.push({ case: "repeated-open-close", ok });
    await context.close();
  }

  // —— 6) Confirmation + decline (error/negative) states ——
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await seed(page);
    await gotoConcert(page);
    await dismissGate(page);
    const decline = page.getByTestId("rsvp-choice-DECLINED").first();
    await decline.scrollIntoViewIfNeeded();
    await decline.click({ timeout: 8000 });
    await page.waitForTimeout(700);
    const body = await page.innerText("body");
    const declined =
      /Thank you|Decline|not attending|won't|cannot|declined|Pass released|regrets/i.test(body);
    if (!declined) fail("Decline should produce a confirmation/response state");
    results.push({ case: "rsvp-decline-state", ok: declined });
    await context.close();
  }

  // —— 7) Other Batch 1 families smoke: dismiss (if any) + Accept ——
  for (const layout of BATCH1) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await seed(page);
    await page.goto(`${BASE}/invitations/experience3/${layout}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.getByTestId("ix3-invitation-main").waitFor({ state: "attached", timeout: 15000 });
    await page.waitForTimeout(300);
    if (await page.getByTestId("ix3-opening-gate").count()) {
      await page.getByTestId("ix3-opening-gate").waitFor({ state: "visible", timeout: 10000 });
      const inert = await page.getByTestId("ix3-invitation-main").evaluate((el) => el.hasAttribute("inert"));
      if (!inert) fail(`${layout}: main should be inert while gate open`);
      await dismissGate(page);
    }
    const ok = await acceptRsvp(page);
    if (!ok) fail(`${layout}: Accept/confirm failed`);
    results.push({ case: `family-smoke:${layout}`, ok });
    await context.close();
  }
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(JSON.stringify({ base: BASE, results, failed: failed.length }, null, 2));
if (failed.length) {
  fail(`${failed.length} regression case(s) failed`);
} else {
  console.log("Concert opening/RSVP P0 regression: ALL PASSED");
}
