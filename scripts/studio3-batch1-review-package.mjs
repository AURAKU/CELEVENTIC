/**
 * Phase 5 Batch 1 — independent creative review evidence capture.
 * Evidence only. Does not modify invitation templates.
 */
import { chromium } from "playwright";
import {
  mkdirSync,
  writeFileSync,
  existsSync,
  readdirSync,
  renameSync,
  statSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.STUDIO3_QA_BASE || "http://127.0.0.1:3002";
const PKG = join(
  ROOT,
  "docs/invitations/studio-3/phase-5/batch-1/review-package/CELEVENTIC_STUDIO3_BATCH1_REVIEW"
);

const FAMILIES = [
  { key: "heritage-marriage", layout: "ix3-heritage-marriage", hasOpening: true },
  { key: "birthday", layout: "ix3-birthday-celebration", hasOpening: true },
  { key: "corporate-gala", layout: "ix3-corporate-gala", hasOpening: false },
  { key: "concert", layout: "ix3-concert-night", hasOpening: true },
  { key: "graduation", layout: "ix3-graduation", hasOpening: true },
  { key: "baby-shower", layout: "ix3-baby-shower", hasOpening: true },
];

const VIEWPORTS = [
  { w: 375, h: 812, label: "m375" },
  { w: 390, h: 844, label: "m390" },
  { w: 768, h: 1024, label: "t768" },
  { w: 1440, h: 900, label: "d1440" },
];

const missing = [];
const captured = { screenshots: [], recordings: [] };

function shotDir(family) {
  const dir = join(PKG, "03_SCREENSHOTS", family);
  mkdirSync(dir, { recursive: true });
  return dir;
}

async function dismissCookies(page) {
  const accept = page.getByRole("button", { name: /accept all|essential only/i }).first();
  if (await accept.count()) {
    await accept.click({ timeout: 2500 }).catch(() => {});
    await page.waitForTimeout(200);
  }
}

async function dismissGate(page) {
  const btn = page
    .getByRole("button", {
      name: /open invitation|skip|break the seal|enter the evening|continue/i,
    })
    .first();
  if (await btn.count()) {
    await btn.click({ timeout: 3500 }).catch(() => {});
    await page.waitForTimeout(400);
    return true;
  }
  return false;
}

async function setDevice(page, width) {
  if (width <= 430) {
    const mobile = page.getByRole("button", { name: /^Mobile$/i });
    if (await mobile.count()) await mobile.click().catch(() => {});
  } else {
    const desktop = page.getByRole("button", { name: /^Desktop$/i });
    if (await desktop.count()) await desktop.click().catch(() => {});
  }
  await page.waitForTimeout(350);
}

async function frameLocator(page) {
  const frame = page.locator("div.mx-auto.w-full.overflow-hidden").first();
  if (await frame.count()) return frame;
  return page.locator("body");
}

async function captureFamilyScreens(browser, family) {
  const out = shotDir(family.key);
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
    const url = `${BASE}/invitations/experience3/${family.layout}`;
    try {
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
      if (!res || res.status() >= 500) {
        missing.push(`${family.key}/${vp.label}: HTTP ${res?.status() ?? "none"}`);
        await context.close();
        continue;
      }
      await page.waitForTimeout(900);
      await dismissCookies(page);
      await setDevice(page, vp.w);

      const frame = await frameLocator(page);

      // Initial (opening gate when present)
      const initialPath = join(out, `${family.key}-${vp.label}-01-initial.png`);
      await frame.screenshot({ path: initialPath });
      captured.screenshots.push(initialPath);

      const opened = family.hasOpening ? await dismissGate(page) : false;
      if (family.hasOpening && !opened) {
        missing.push(`${family.key}/${vp.label}: opening gate button not found (may already be dismissed)`);
      }
      await page.waitForTimeout(500);

      const mainPath = join(out, `${family.key}-${vp.label}-02-main.png`);
      await frame.screenshot({ path: mainPath });
      captured.screenshots.push(mainPath);

      // Scroll through content for details / interactive / RSVP
      await page.evaluate(() => {
        const el = document.querySelector("div.mx-auto.w-full.overflow-hidden div.max-h-\\[812px\\], div.mx-auto.w-full.overflow-hidden div.max-h-\\[900px\\]");
        if (el) el.scrollTop = Math.min(el.scrollHeight * 0.35, 900);
        else window.scrollBy(0, 700);
      });
      await page.waitForTimeout(350);
      const detailsPath = join(out, `${family.key}-${vp.label}-03-details.png`);
      await frame.screenshot({ path: detailsPath });
      captured.screenshots.push(detailsPath);

      await page.evaluate(() => {
        const el = document.querySelector("div.mx-auto.w-full.overflow-hidden div.max-h-\\[812px\\], div.mx-auto.w-full.overflow-hidden div.max-h-\\[900px\\]");
        if (el) el.scrollTop = el.scrollHeight;
        else window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(400);
      const rsvpPath = join(out, `${family.key}-${vp.label}-04-rsvp-actions.png`);
      await frame.screenshot({ path: rsvpPath });
      captured.screenshots.push(rsvpPath);

      const fullPath = join(out, `${family.key}-${vp.label}-05-fullpage.png`);
      await page.screenshot({ path: fullPath, fullPage: true });
      captured.screenshots.push(fullPath);

      console.log(`${family.key} @ ${vp.label}: ok`);
    } catch (err) {
      missing.push(`${family.key}/${vp.label}: ${String(err?.message || err)}`);
      console.log(`${family.key} @ ${vp.label}: FAIL`);
    }
    await context.close();
  }
}

async function captureMotion(browser, family) {
  const out = join(PKG, "04_MOTION_RECORDINGS");
  mkdirSync(out, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    recordVideo: { dir: out, size: { width: 390, height: 844 } },
  });
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem("celeventic_cookie_consent", "essential");
    } catch {
      /* ignore */
    }
  });
  const page = await context.newPage();
  const url = `${BASE}/invitations/experience3/${family.layout}`;
  try {
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
    if (!res || res.status() >= 500) {
      missing.push(`motion/${family.key}: HTTP ${res?.status() ?? "none"}`);
      await context.close();
      return;
    }
    await page.waitForTimeout(800);
    await dismissCookies(page);
    await setDevice(page, 390);
    await page.waitForTimeout(700);
    if (family.hasOpening) {
      await dismissGate(page);
      await page.waitForTimeout(900);
    }
    // scroll interactions inside frame
    for (const y of [300, 700, 1200, 1800]) {
      await page.evaluate((scrollY) => {
        const el = document.querySelector(
          "div.mx-auto.w-full.overflow-hidden div.max-h-\\[812px\\], div.mx-auto.w-full.overflow-hidden div.max-h-\\[900px\\]"
        );
        if (el) el.scrollTop = scrollY;
        else window.scrollTo(0, scrollY);
      }, y);
      await page.waitForTimeout(450);
    }
    // RSVP hover/focus if present
    const accept = page.getByRole("button", { name: /accept/i }).first();
    if (await accept.count()) {
      await accept.hover().catch(() => {});
      await page.waitForTimeout(400);
      await accept.focus().catch(() => {});
      await page.waitForTimeout(400);
    } else {
      missing.push(`motion/${family.key}: RSVP Accept button not found for interaction clip`);
    }
    await page.waitForTimeout(600);
  } catch (err) {
    missing.push(`motion/${family.key}: ${String(err?.message || err)}`);
  }
  await context.close();
  // Playwright names videos randomly; rename newest unnamed webm to family key.
  const target = join(out, `${family.key}-opening-scroll-rsvp.webm`);
  const candidates = readdirSync(out)
    .filter((f) => f.endsWith(".webm") && !f.includes("-opening-scroll-rsvp"))
    .map((f) => ({ f, t: join(out, f), m: statSync(join(out, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  if (candidates[0]) {
    if (existsSync(target)) {
      // keep newest as family recording
      renameSync(candidates[0].t, target);
    } else {
      renameSync(candidates[0].t, target);
    }
    captured.recordings.push(target);
    console.log(`motion ${family.key}: ok`);
  } else if (existsSync(target)) {
    captured.recordings.push(target);
  } else {
    missing.push(`motion/${family.key}: recording file not produced`);
  }
}

const browser = await chromium.launch({ headless: true });
try {
  for (const family of FAMILIES) {
    await captureFamilyScreens(browser, family);
  }
  for (const family of FAMILIES) {
    await captureMotion(browser, family);
  }
} finally {
  await browser.close();
}

writeFileSync(
  join(PKG, "EVIDENCE_CAPTURE_LOG.json"),
  JSON.stringify(
    {
      base: BASE,
      capturedAt: new Date().toISOString(),
      screenshotCount: captured.screenshots.length,
      recordingCount: captured.recordings.length,
      missing,
      screenshots: captured.screenshots.map((p) => p.replace(PKG + "/", "")),
      recordings: captured.recordings.map((p) => p.replace(PKG + "/", "")),
    },
    null,
    2
  )
);

console.log(`\nScreenshots: ${captured.screenshots.length}`);
console.log(`Recordings: ${captured.recordings.length}`);
console.log(`Missing notes: ${missing.length}`);
if (missing.length) console.log(missing.join("\n"));
