/**
 * Phase 5 Batch 1 refinement QA — screenshots + overflow metrics.
 * Writes "after" captures and refreshes root batch-1 screenshots.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.STUDIO3_QA_BASE || "http://127.0.0.1:3002";
const OUT = join("docs/invitations/studio-3/phase-5/batch-1/screenshots/after");
const ROOT = join("docs/invitations/studio-3/phase-5/batch-1/screenshots");
const REPORT_JSON = join("docs/invitations/studio-3/phase-5/batch-1/responsive-metrics-refine.json");

const LAYOUTS = [
  "ix3-heritage-marriage",
  "ix3-birthday-celebration",
  "ix3-corporate-gala",
  "ix3-concert-night",
  "ix3-graduation",
  "ix3-baby-shower",
];

const VIEWPORTS = [
  { w: 375, h: 812, device: "mobile" },
  { w: 768, h: 1024, device: "desktop" },
  { w: 1440, h: 900, device: "desktop" },
];

mkdirSync(OUT, { recursive: true });

async function dismissCookies(page) {
  const accept = page.getByRole("button", { name: /accept all|essential only/i }).first();
  if (await accept.count()) {
    await accept.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(250);
  }
}

async function dismissGate(page) {
  const btn = page
    .getByRole("button", {
      name: /open invitation|skip|break the seal|enter the evening|continue/i,
    })
    .first();
  if (await btn.count()) {
    await btn.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(450);
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
      rsvp: /Accept|RSVP|Will you/i.test(text),
      maps: /Maps/i.test(text),
      share: /Share/i.test(text),
      calendar: /Reminder|Calendar/i.test(text),
      countdown: /Until|Party starts|Doors open|Showtime|––/i.test(text),
      privacy: /Privacy & Cookies/i.test(text),
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
      await context.addInitScript(() => {
        try {
          window.localStorage.setItem("celeventic_cookie_consent", "essential");
        } catch {
          /* ignore */
        }
      });
      const page = await context.newPage();
      const url = `${BASE}/invitations/experience3/${layout}`;
      const entry = { layout, width: vp.w, height: vp.h, url, ok: false };
      try {
        let res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
        entry.status = res?.status() ?? null;
        if (entry.status && entry.status >= 500) {
          await page.waitForTimeout(1500);
          res = await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
          entry.status = res?.status() ?? entry.status;
          entry.retried = true;
        }
        await page.waitForTimeout(900);
        await dismissCookies(page);
        await dismissGate(page);
        if (vp.device === "desktop") {
          const desktop = page.getByRole("button", { name: /^Desktop$/i });
          if (await desktop.count()) await desktop.click().catch(() => {});
        } else {
          const mobile = page.getByRole("button", { name: /^Mobile$/i });
          if (await mobile.count()) await mobile.click().catch(() => {});
        }
        await page.waitForTimeout(600);
        await dismissGate(page);
        entry.metrics = await measure(page);
        const file = `${layout}-w${vp.w}.png`;
        const frame = page.locator("div.mx-auto.w-full.overflow-hidden").first();
        if (await frame.count()) {
          await frame.screenshot({ path: join(OUT, file) });
          await frame.screenshot({ path: join(ROOT, file) });
        } else {
          await page.screenshot({ path: join(OUT, file), fullPage: true });
          await page.screenshot({ path: join(ROOT, file), fullPage: true });
        }
        entry.screenshot = file;
        entry.ok = entry.status === 200;
      } catch (err) {
        entry.error = String(err?.message || err);
      }
      results.push(entry);
      await context.close();
      console.log(
        `${layout} @ ${vp.w}: ${entry.ok ? "ok" : "FAIL"} overflow=${entry.metrics?.docOverflow ?? "n/a"} status=${entry.status ?? "n/a"} guest=${entry.metrics?.guest ?? "n/a"}`
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
