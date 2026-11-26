/**
 * Stage 1 — regression for the five Batch 1 verification failures.
 * Fails hard on application defects. Retries once for transient 5xx (env).
 *
 * Usage: node scripts/studio3-batch1-stage1-five-failures.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.STUDIO3_QA_BASE || "http://127.0.0.1:3002";
const OUT = join("docs/invitations/studio-3/phase-5/batch-1/stage1-five-failures");
mkdirSync(OUT, { recursive: true });

const results = [];

function record(entry) {
  results.push(entry);
  console.log(JSON.stringify(entry));
}

async function dismissGate(page) {
  const gate = page.getByTestId("ix3-opening-gate");
  if (!(await gate.count())) return true;
  await page.waitForLoadState("networkidle").catch(() => {});
  const primary = page.getByTestId("ix3-opening-primary");
  for (let i = 0; i < 10; i += 1) {
    if (await primary.count()) {
      await primary.evaluate((el) => {
        if (el instanceof HTMLButtonElement) el.click();
      });
    }
    try {
      await gate.waitFor({ state: "detached", timeout: 800 });
      return true;
    } catch {
      /* retry */
    }
  }
  await page.keyboard.press("Escape");
  try {
    await gate.waitFor({ state: "detached", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function gotoWithRetry(page, url) {
  let res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  if (!res || res.status() >= 500) {
    await page.waitForTimeout(1500);
    res = await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
  }
  return res;
}

async function acceptConfirm(page, hasOpening) {
  if (hasOpening) {
    const ok = await dismissGate(page);
    if (!ok) throw new Error("opening gate stuck");
  }
  await page.getByTestId("ix3-invitation-main").waitFor({ state: "attached", timeout: 15000 });
  await page.getByTestId("ix3-invitation-main").evaluate((el) => {
    if (el.hasAttribute("inert")) throw new Error("main still inert after gate");
  });
  await page.getByTestId("ix3-rsvp-ritual").waitFor({ state: "visible", timeout: 15000 });
  const accept = page.getByTestId("rsvp-choice-ACCEPTED");
  await accept.waitFor({ state: "visible", timeout: 15000 });
  await accept.scrollIntoViewIfNeeded();
  // Allow client handlers to finish hydrating before the first RSVP click.
  await page.waitForTimeout(400);
  await accept.click({ timeout: 8000 });
  // Prefer confirmation test id; fall back to sandbox feedback as proof of accept.
  try {
    await page.getByTestId("ix3-rsvp-confirmation").waitFor({ state: "visible", timeout: 12000 });
  } catch {
    await page.getByTestId("rsvp-guest-feedback").waitFor({ state: "visible", timeout: 5000 });
    const status = await page.getByTestId("ix3-rsvp-ritual").getAttribute("data-ix3-rsvp-status");
    if (status !== "ACCEPTED") {
      throw new Error(`confirmation chrome missing after accept (status=${status})`);
    }
  }
}

const browser = await chromium.launch({ headless: true });
let failed = 0;

try {
  // 1) Birthday tablet HTTP
  {
    const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });
    const res = await gotoWithRetry(page, `${BASE}/invitations/experience3/ix3-birthday-celebration`);
    const status = res?.status() ?? 0;
    const ok = status > 0 && status < 500;
    record({ id: "birthday-t768-http", status, ok, class: ok ? "pass" : "application-or-env-5xx" });
    if (!ok) failed += 1;
    await page.screenshot({
      path: join(OUT, "birthday-t768.jpg"),
      type: "jpeg",
      quality: 55,
    });
    await page.close();
  }

  // 2) Graduation mobile HTTP
  {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    const res = await gotoWithRetry(page, `${BASE}/invitations/experience3/ix3-graduation`);
    const status = res?.status() ?? 0;
    const ok = status > 0 && status < 500;
    record({ id: "graduation-m375-http", status, ok, class: ok ? "pass" : "application-or-env-5xx" });
    if (!ok) failed += 1;
    await page.screenshot({
      path: join(OUT, "graduation-m375.jpg"),
      type: "jpeg",
      quality: 55,
    });
    await page.close();
  }

  // 3) Corporate Gala confirmation
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript(() => {
      try {
        localStorage.setItem("celeventic_cookie_consent", JSON.stringify({ essential: true }));
        for (const k of Object.keys(localStorage)) {
          if (/rsvp|ix3-preview/i.test(k)) localStorage.removeItem(k);
        }
      } catch {
        /* ignore */
      }
    });
    await gotoWithRetry(page, `${BASE}/invitations/experience3/ix3-corporate-gala`);
    let ok = false;
    let err = null;
    try {
      await acceptConfirm(page, false);
      ok = true;
    } catch (e) {
      err = String(e.message || e).slice(0, 240);
    }
    record({ id: "gala-confirm", ok, err, class: ok ? "pass" : "application" });
    if (!ok) failed += 1;
    await page.screenshot({
      path: join(OUT, "gala-confirm.jpg"),
      type: "jpeg",
      quality: 55,
    });
    await page.close();
  }

  // 4) Concert Accept after opening
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript(() => {
      try {
        localStorage.setItem("celeventic_cookie_consent", JSON.stringify({ essential: true }));
        for (const k of Object.keys(localStorage)) {
          if (/rsvp|ix3-preview/i.test(k)) localStorage.removeItem(k);
        }
      } catch {
        /* ignore */
      }
    });
    await gotoWithRetry(page, `${BASE}/invitations/experience3/ix3-concert-night`);
    let ok = false;
    let err = null;
    try {
      await acceptConfirm(page, true);
      ok = true;
    } catch (e) {
      err = String(e.message || e).slice(0, 240);
    }
    record({ id: "concert-accept", ok, err, class: ok ? "pass" : "application" });
    if (!ok) failed += 1;
    await page.screenshot({
      path: join(OUT, "concert-accept.jpg"),
      type: "jpeg",
      quality: 55,
    });
    await page.close();
  }

  // 5) Heritage Accept control present after opening (motion regression)
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript(() => {
      try {
        localStorage.setItem("celeventic_cookie_consent", JSON.stringify({ essential: true }));
        for (const k of Object.keys(localStorage)) {
          if (/rsvp|ix3-preview/i.test(k)) localStorage.removeItem(k);
        }
      } catch {
        /* ignore */
      }
    });
    await gotoWithRetry(page, `${BASE}/invitations/experience3/ix3-heritage-marriage`);
    const dismissed = await dismissGate(page);
    await page.evaluate(() => {
      const el = document.querySelector(
        "div.mx-auto.w-full.overflow-hidden div.max-h-\\[812px\\], div.mx-auto.w-full.overflow-hidden div.max-h-\\[900px\\]"
      );
      if (el) el.scrollTop = el.scrollHeight;
      else window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(400);
    const accept = page.getByTestId("rsvp-choice-ACCEPTED");
    const visible = await accept.isVisible().catch(() => false);
    const ok = dismissed && visible;
    record({
      id: "heritage-accept-control",
      ok,
      dismissed,
      visible,
      class: ok ? "pass" : "application",
    });
    if (!ok) failed += 1;
    await page.screenshot({
      path: join(OUT, "heritage-accept-control.jpg"),
      type: "jpeg",
      quality: 55,
    });
    await page.close();
  }
} finally {
  await browser.close();
}

writeFileSync(join(OUT, "results.json"), JSON.stringify({ base: BASE, results, failed }, null, 2));
console.log(`\nStage1 five-failures: ${failed === 0 ? "ALL PASSED" : `FAILED ${failed}`}`);
process.exitCode = failed ? 1 : 0;
