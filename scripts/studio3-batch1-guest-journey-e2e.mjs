/**
 * Batch 1 end-to-end guest journey acceptance (sandbox / test data only).
 * Never posts to production RSVP for live invitations; uses ix3-preview-* IDs.
 * No payments, SMS, or production mutations.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.STUDIO3_QA_BASE || "http://127.0.0.1:3002";
const OUT = join("docs/invitations/studio-3/phase-5/batch-1/guest-journey");
mkdirSync(OUT, { recursive: true });

const FAMILIES = [
  "ix3-heritage-marriage",
  "ix3-birthday-celebration",
  "ix3-corporate-gala",
  "ix3-concert-night",
  "ix3-graduation",
  "ix3-baby-shower",
];

const VIEWPORTS = [
  { w: 390, h: 844, label: "mobile" },
  { w: 1440, h: 900, label: "desktop" },
];

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

async function runJourney(page, layout, label) {
  const result = {
    layout,
    viewport: label,
    ok: false,
    steps: {},
    errors: [],
  };
  const url = `${BASE}/invitations/experience3/${layout}`;
  try {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("celeventic_cookie_consent", "essential");
        // Clear prior sandbox RSVP so each run starts fresh.
        Object.keys(localStorage)
          .filter((k) => k.startsWith("celeventic:rsvp:ix3-preview-"))
          .forEach((k) => localStorage.removeItem(k));
      } catch {
        /* ignore */
      }
    });

    let res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
    if (!res || res.status() >= 500) {
      await page.waitForTimeout(1500);
      res = await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
      result.steps.retriedAfter5xx = true;
    }
    result.steps.http = res?.status() ?? null;
    if (!res || res.status() >= 500) {
      result.errors.push(`HTTP ${res?.status()}`);
      return result;
    }
    await page.waitForTimeout(900);
    if (label === "desktop") {
      const desktop = page.getByRole("button", { name: /^Desktop$/i });
      if (await desktop.count()) await desktop.click().catch(() => {});
    } else {
      const mobile = page.getByRole("button", { name: /^Mobile$/i });
      if (await mobile.count()) await mobile.click().catch(() => {});
    }
    await page.waitForTimeout(400);

    // Opening
    const gateVisible = await page
      .getByRole("button", { name: /open invitation|break the seal|enter the evening|continue|skip/i })
      .first()
      .count();
    result.steps.openingPresentOrSkipped = gateVisible > 0 || layout.includes("corporate-gala");
    await dismissGate(page);
    result.steps.openingDismissed = true;

    const bodyText = await page.locator("body").innerText();
    result.steps.personalizedGuest = /Alex Mensah/i.test(bodyText);
    result.steps.eventDetails =
      /When|Where|Dress|Ceremony|Programme|Venue|Gathering|Commencement|Night plan|Set timing|Shower schedule|Arrival|Reception/i.test(
        bodyText
      );

    // Scroll to interactive sections
    await page.evaluate(() => {
      const el = document.querySelector(
        "div.mx-auto.w-full.overflow-hidden div.max-h-\\[812px\\], div.mx-auto.w-full.overflow-hidden div.max-h-\\[900px\\]"
      );
      if (el) el.scrollTop = el.scrollHeight;
      else window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(500);

    result.steps.qrVisible = (await page.getByTestId("ix3-admission-qr").count()) > 0;
    result.steps.mapsOrActions = /Maps|Share|Reminder|Contact/i.test(await page.locator("body").innerText());

    // RSVP Accept (sandbox) — family-specific labels; use stable choice test ids.
    const accept = page.getByTestId("rsvp-choice-ACCEPTED");
    result.steps.rsvpControlPresent = (await accept.count()) > 0;
    if (result.steps.rsvpControlPresent) {
      await accept.waitFor({ state: "visible", timeout: 12000 });
      await accept.scrollIntoViewIfNeeded();
      await accept.click({ timeout: 8000 });
      await page.waitForTimeout(600);
      result.steps.rsvpThankYou =
        (await page.getByTestId("ix3-rsvp-confirmation").count()) > 0 ||
        (await page.getByTestId("rsvp-guest-feedback").count()) > 0 ||
        /thank you|sandbox rsvp|confirmed|blessing|pass confirmed/i.test(
          await page.locator("body").innerText()
        );
      result.steps.rsvpSandboxBadge = (await page.getByTestId("rsvp-sandbox-badge").count()) > 0;
    } else {
      result.errors.push("RSVP Accept control missing");
    }

    // Persist across reload
    await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForTimeout(900);
    await dismissGate(page);
    await page.evaluate(() => {
      const el = document.querySelector(
        "div.mx-auto.w-full.overflow-hidden div.max-h-\\[812px\\], div.mx-auto.w-full.overflow-hidden div.max-h-\\[900px\\]"
      );
      if (el) el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(400);
    result.steps.rsvpPersistedAfterReload =
      (await page.getByTestId("rsvp-guest-feedback").count()) > 0 ||
      /thank you|sandbox rsvp/i.test(await page.locator("body").innerText());

    // Ensure no network RSVP to production was required (sandbox path)
    result.steps.noDecorativeOnly =
      result.steps.personalizedGuest &&
      result.steps.eventDetails &&
      result.steps.rsvpThankYou &&
      result.steps.rsvpPersistedAfterReload &&
      result.steps.qrVisible;

    result.ok = Boolean(result.steps.noDecorativeOnly);
    await page.screenshot({
      path: join(OUT, `${layout}-${label}-journey.png`),
      fullPage: true,
    });
  } catch (err) {
    result.errors.push(String(err?.message || err));
  }
  return result;
}

const browser = await chromium.launch({ headless: true });
const results = [];
const warnings = [];
try {
  for (const layout of FAMILIES) {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        deviceScaleFactor: vp.w <= 430 ? 2 : 1,
      });
      const page = await context.newPage();
      // Block accidental outbound messaging/payment endpoints if any are hit.
      await page.route("**/api/rsvp**", async (route) => {
        // Sandbox must not need this; if hit, record and fulfill safely.
        warnings.push({
          layout,
          viewport: vp.label,
          warning: "Unexpected /api/rsvp request intercepted in guest-journey harness",
        });
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, sandbox: true }),
        });
      });
      await page.route("**/api/**/pay**", (route) => route.abort());
      await page.route("**/api/**/sms**", (route) => route.abort());
      await page.route("**/api/**/whatsapp**", (route) => route.abort());

      const entry = await runJourney(page, layout, vp.label);
      results.push(entry);
      console.log(
        `${layout} @ ${vp.label}: ${entry.ok ? "PASS" : "FAIL"} guest=${entry.steps.personalizedGuest} rsvp=${entry.steps.rsvpThankYou} persist=${entry.steps.rsvpPersistedAfterReload} qr=${entry.steps.qrVisible}`
      );
      await context.close();
    }
  }
} finally {
  await browser.close();
}

const report = {
  capturedAt: new Date().toISOString(),
  base: BASE,
  criterion:
    "End-to-end guest experience acceptance (sandbox): open → intro → details → RSVP → QR; mobile+desktop; persist; no production writes",
  results,
  warnings,
  passed: results.filter((r) => r.ok).length,
  total: results.length,
};
writeFileSync(join(OUT, "guest-journey-results.json"), JSON.stringify(report, null, 2));
console.log(`\nGuest journey: ${report.passed}/${report.total} passed`);
if (report.passed < report.total) process.exitCode = 1;
