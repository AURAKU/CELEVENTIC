/**
 * Phase 3A responsive QA for Experience 3.0 references.
 * Captures screenshots + overflow metrics. Does NOT invent protected baselines.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.STUDIO3_QA_BASE || "http://127.0.0.1:3002";
const OUT = join("docs/invitations/studio-3/phase-3a/screenshots");
const REPORT_JSON = join("docs/invitations/studio-3/phase-3a/responsive-metrics.json");

const LAYOUTS = [
  "ix3-editorial-wedding",
  "ix3-brand-launch",
  "ix3-memorial",
];

const VIEWPORTS = [
  { w: 320, h: 568 },
  { w: 375, h: 812 },
  { w: 390, h: 844 },
  { w: 430, h: 932 },
  { w: 768, h: 1024 },
  { w: 1024, h: 768 },
  { w: 1440, h: 900 },
  { w: 1920, h: 1080 },
];

mkdirSync(OUT, { recursive: true });

async function dismissGate(page) {
  const btn = page.getByRole("button", { name: /open invitation|skip/i }).first();
  if (await btn.count()) {
    await btn.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(400);
  }
}

async function measure(page) {
  return page.evaluate(() => {
    const docOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    const bodyOverflow = document.body.scrollWidth > document.body.clientWidth + 1;
    const text = document.body.innerText || "";
    return {
      vw: window.innerWidth,
      vh: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      docOverflow,
      bodyOverflow,
      guest: /Alex Mensah/i.test(text),
      rsvp: /Accept/i.test(text),
      maps: /Maps/i.test(text),
      share: /Share/i.test(text),
      calendar: /Reminder|Calendar/i.test(text),
      countdown: /Until we gather|Launch countdown|Countdown|––/i.test(text),
      issuesOverlay: !!document.querySelector('[aria-label="Open issues overlay"]'),
    };
  });
}

const results = [];

const browser = await chromium.launch({ headless: true });
try {
  for (const layout of LAYOUTS) {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        deviceScaleFactor: vp.w <= 430 ? 2 : 1,
      });
      const page = await context.newPage();
      const url = `${BASE}/invitations/experience3/${layout}`;
      const entry = { layout, width: vp.w, height: vp.h, url, ok: false };
      try {
        const res = await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
        entry.status = res?.status() ?? null;
        await page.waitForTimeout(800);
        await dismissGate(page);
        // Prefer mobile frame for phone widths
        if (vp.w <= 430) {
          const mobile = page.getByRole("button", { name: /^Mobile$/i });
          if (await mobile.count()) await mobile.click().catch(() => {});
        } else {
          const desktop = page.getByRole("button", { name: /^Desktop$/i });
          if (await desktop.count()) await desktop.click().catch(() => {});
        }
        await page.waitForTimeout(500);
        entry.metrics = await measure(page);
        const file = `${layout}-w${vp.w}.png`;
        await page.screenshot({
          path: join(OUT, file),
          fullPage: true,
        });
        entry.screenshot = file;
        entry.ok = true;
      } catch (err) {
        entry.error = String(err?.message || err);
      }
      results.push(entry);
      await context.close();
      console.log(
        `${layout} @ ${vp.w}x${vp.h}: ${entry.ok ? "ok" : "FAIL"} overflow=${entry.metrics?.docOverflow}`
      );
    }
  }
} finally {
  await browser.close();
}

writeFileSync(REPORT_JSON, JSON.stringify({ base: BASE, capturedAt: new Date().toISOString(), results }, null, 2));
const fails = results.filter((r) => !r.ok || r.metrics?.docOverflow || r.metrics?.bodyOverflow);
console.log(`\nCaptured ${results.filter((r) => r.ok).length}/${results.length}`);
console.log(`Overflow or failures: ${fails.length}`);
if (fails.length) {
  console.log(JSON.stringify(fails, null, 2));
  process.exitCode = 1;
}
