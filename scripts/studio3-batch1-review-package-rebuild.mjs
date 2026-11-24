/**
 * Post-P1 Batch 1 review package rebuild from the current Git checkpoint.
 * Evidence only. Lean JPEGs. Includes FINAL_ACCEPTANCE_AUDIT.
 * Does not modify invitation templates / protected paths.
 *
 * Usage: node scripts/studio3-batch1-review-package-rebuild.mjs
 * Env: STUDIO3_QA_BASE (default http://127.0.0.1:3002)
 */
import { chromium } from "playwright";
import {
  mkdirSync,
  writeFileSync,
  copyFileSync,
  existsSync,
  rmSync,
  readdirSync,
  renameSync,
  statSync,
  cpSync,
} from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.STUDIO3_QA_BASE || "http://127.0.0.1:3002";
const PKG_ROOT = join(ROOT, "docs/invitations/studio-3/phase-5/batch-1/review-package");
const PKG = join(PKG_ROOT, "CELEVENTIC_STUDIO3_BATCH1_REVIEW");
const ZIP = join(PKG_ROOT, "CELEVENTIC_STUDIO3_BATCH1_REVIEW.zip");

const HEAD = execSync("git rev-parse HEAD", { cwd: ROOT }).toString().trim();
const BRANCH = execSync("git branch --show-current", { cwd: ROOT }).toString().trim();
const SHORT = HEAD.slice(0, 8);

const FAMILIES = [
  { key: "heritage-marriage", layout: "ix3-heritage-marriage", hasOpening: true },
  { key: "birthday", layout: "ix3-birthday-celebration", hasOpening: true },
  { key: "corporate-gala", layout: "ix3-corporate-gala", hasOpening: false },
  { key: "concert", layout: "ix3-concert-night", hasOpening: true },
  { key: "graduation", layout: "ix3-graduation", hasOpening: true },
  { key: "baby-shower", layout: "ix3-baby-shower", hasOpening: true },
];

/** Lean viewport set for storage-constrained rebuilds (still covers mobile/tablet/desktop). */
const VIEWPORTS = [
  { w: 375, h: 812, label: "m375" },
  { w: 390, h: 844, label: "m390" },
  { w: 768, h: 1024, label: "t768" },
  { w: 1440, h: 900, label: "d1440" },
];

const JPEG_QUALITY = 58;
const missing = [];
const captured = { screenshots: [], recordings: [], confirms: [] };

function ensureCleanDirs() {
  for (const rel of ["03_SCREENSHOTS", "04_MOTION_RECORDINGS"]) {
    const dir = join(PKG, rel);
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
  }
  for (const rel of ["01_REPORTS", "02_CATALOG_MAPPING", "05_PROTECTION", "06_ARCHITECTURE"]) {
    mkdirSync(join(PKG, rel), { recursive: true });
  }
  if (existsSync(ZIP)) rmSync(ZIP, { force: true });
}

function copyDoc(srcRel, destRel) {
  const src = join(ROOT, srcRel);
  const dest = join(PKG, destRel);
  if (!existsSync(src)) {
    missing.push(`doc-missing:${srcRel}`);
    return;
  }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
}

function assembleDocs() {
  copyDoc(
    "docs/invitations/studio-3/PHASE_5_BATCH_1_FINAL_ACCEPTANCE_AUDIT.md",
    "01_REPORTS/PHASE_5_BATCH_1_FINAL_ACCEPTANCE_AUDIT.md"
  );
  copyDoc(
    "docs/invitations/studio-3/PHASE_5_BATCH_1_REFINEMENT_REPORT.md",
    "01_REPORTS/PHASE_5_BATCH_1_REFINEMENT_REPORT.md"
  );
  copyDoc(
    "docs/invitations/studio-3/PHASE_5_CATALOG_TRANSFORMATION.md",
    "01_REPORTS/PHASE_5_CATALOG_TRANSFORMATION.md"
  );

  // Preserve creative brief if present from prior package; otherwise write a stub pointer.
  const creative = join(PKG, "01_REPORTS/BATCH_1_CREATIVE_REVIEW.md");
  if (!existsSync(creative)) {
    writeFileSync(
      creative,
      [
        "# Batch 1 Creative Review Brief",
        "",
        "See `PHASE_5_BATCH_1_FINAL_ACCEPTANCE_AUDIT.md` §9 for post-P1 remediation status.",
        "This rebuild supersedes the older ZIP checkpoint (`3533551d`).",
        "",
      ].join("\n")
    );
  }

  writeFileSync(
    join(PKG, "01_REPORTS/IMPLEMENTATION_STATUS.md"),
    [
      "# Batch 1 Implementation Status (post-P1 rebuild)",
      "",
      `- Branch: \`${BRANCH}\``,
      `- Commit: \`${HEAD}\``,
      `- Built (UTC): ${new Date().toISOString()}`,
      "",
      "## P1 remediation",
      "",
      "| ID | Status |",
      "|---|---|",
      "| P1-1 Heritage monogram AK | RESOLVED |",
      "| P1-2 Graduation Celebrating wrap | RESOLVED |",
      "| P1-3 Family RSVP presentation | RESOLVED |",
      "| P1-4 Category hero art direction | RESOLVED |",
      "| P1-5 Structural differentiation | RESOLVED (code) — human craft bar pending |",
      "| P1-6 Confirmation / thank-you | RESOLVED |",
      "| P1-7 Confirming wrap | RESOLVED |",
      "| P0-2 Concert opening RSVP intercept | RESOLVED (regression green) |",
      "",
      "## Not claimed",
      "",
      "- Batch 1 final creative acceptance — **pending human review**",
      "- Batch 2 — **locked**",
      "- Gallery / Memory Vault / background audio / multi-ceremony — not in Batch 1 scope",
      "- Production RSVP persistence / Lighthouse / automated a11y audit — not claimed in this package",
      "",
    ].join("\n")
  );

  copyDoc(
    "src/lib/invitation/studio3/catalog-transformation-map.ts",
    "02_CATALOG_MAPPING/catalog-transformation-map.ts"
  );
  // CSV may live under docs from prior export
  const csvCandidates = [
    "docs/invitations/studio-3/catalog-transformation-review.csv",
    "docs/invitations/studio-3/phase-5/batch-1/review-package/CELEVENTIC_STUDIO3_BATCH1_REVIEW/02_CATALOG_MAPPING/catalog-transformation-review.csv",
  ];
  for (const c of csvCandidates) {
    if (existsSync(join(ROOT, c))) {
      copyDoc(c, "02_CATALOG_MAPPING/catalog-transformation-review.csv");
      break;
    }
  }

  copyDoc(
    "docs/invitations/studio-3/protected-template-manifest.json",
    "05_PROTECTION/protected-template-manifest.json"
  );
  copyDoc(
    "docs/invitations/studio-3/protected-template-manifest.md",
    "05_PROTECTION/protected-template-manifest.md"
  );

  for (const name of [
    "design-families.md",
    "design-standard.md",
    "experience-engine-architecture.md",
    "feature-parity-matrix.md",
    "renderer-dependency-analysis.md",
    "studio-editor-compatibility.md",
    "version-isolation.md",
  ]) {
    copyDoc(`docs/invitations/studio-3/${name}`, `06_ARCHITECTURE/${name}`);
  }
}

async function dismissCookies(page) {
  const accept = page.getByRole("button", { name: /accept all|essential only/i }).first();
  if (await accept.count()) {
    await accept.click({ timeout: 2500 }).catch(() => {});
    await page.waitForTimeout(200);
  }
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
  if (!res || res.status() >= 500) {
    await page.waitForTimeout(2000);
    res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  }
  return res;
}

async function submitConfirm(page, choice) {
  await page.getByTestId("ix3-invitation-main").waitFor({ state: "attached", timeout: 15000 });
  await page.getByTestId("ix3-invitation-main").evaluate((el) => {
    if (el.hasAttribute("inert")) throw new Error("invitation main still inert");
  });
  const button = page.getByTestId(`rsvp-choice-${choice}`);
  await button.waitFor({ state: "visible", timeout: 15000 });
  await button.scrollIntoViewIfNeeded();
  await button.click({ timeout: 8000 });
  await page.getByTestId("ix3-rsvp-confirmation").waitFor({ state: "visible", timeout: 12000 });
}

async function setDevice(page, width) {
  if (width <= 430) {
    const mobile = page.getByRole("button", { name: /^Mobile$/i });
    if (await mobile.count()) await mobile.click().catch(() => {});
  } else {
    const desktop = page.getByRole("button", { name: /^Desktop$/i });
    if (await desktop.count()) await desktop.click().catch(() => {});
  }
  await page.waitForTimeout(300);
}

async function frameLocator(page) {
  const frame = page.locator("div.mx-auto.w-full.overflow-hidden").first();
  if (await frame.count()) return frame;
  return page.locator("body");
}

async function shot(locatorOrPage, path) {
  await locatorOrPage.screenshot({ path, type: "jpeg", quality: JPEG_QUALITY });
  captured.screenshots.push(path);
}

async function captureFamilyScreens(browser, family) {
  const out = join(PKG, "03_SCREENSHOTS", family.key);
  mkdirSync(out, { recursive: true });

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      deviceScaleFactor: vp.w <= 430 ? 2 : 1,
    });
    await context.addInitScript(() => {
      try {
        window.localStorage.setItem(
          "celeventic_cookie_consent",
          JSON.stringify({ essential: true })
        );
        for (const key of Object.keys(localStorage)) {
          if (/rsvp|ix3-preview/i.test(key)) localStorage.removeItem(key);
        }
      } catch {
        /* ignore */
      }
    });
    const page = await context.newPage();
    const url = `${BASE}/invitations/experience3/${family.layout}`;
    try {
      const res = await gotoWithRetry(page, url);
      if (!res || res.status() >= 500) {
        missing.push(`${family.key}/${vp.label}: HTTP ${res?.status() ?? "none"}`);
        await context.close();
        continue;
      }
      await page.waitForTimeout(700);
      await dismissCookies(page);
      await setDevice(page, vp.w);
      const frame = await frameLocator(page);

      await shot(frame, join(out, `${family.key}-${vp.label}-01-initial.jpg`));

      if (family.hasOpening) {
        const opened = await dismissGate(page);
        if (!opened) missing.push(`${family.key}/${vp.label}: opening gate not dismissed`);
      }
      await page.waitForTimeout(400);
      await shot(frame, join(out, `${family.key}-${vp.label}-02-main.jpg`));

      await page.evaluate(() => {
        const el = document.querySelector(
          "div.mx-auto.w-full.overflow-hidden div.max-h-\\[812px\\], div.mx-auto.w-full.overflow-hidden div.max-h-\\[900px\\]"
        );
        if (el) el.scrollTop = Math.min(el.scrollHeight * 0.35, 900);
        else window.scrollBy(0, 700);
      });
      await page.waitForTimeout(300);
      await shot(frame, join(out, `${family.key}-${vp.label}-03-details.jpg`));

      await page.evaluate(() => {
        const el = document.querySelector(
          "div.mx-auto.w-full.overflow-hidden div.max-h-\\[812px\\], div.mx-auto.w-full.overflow-hidden div.max-h-\\[900px\\]"
        );
        if (el) el.scrollTop = el.scrollHeight;
        else window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(350);
      await shot(frame, join(out, `${family.key}-${vp.label}-04-rsvp-actions.jpg`));

      // Full page only on primary mobile + desktop to conserve disk.
      if (vp.label === "m390" || vp.label === "d1440") {
        await page.screenshot({
          path: join(out, `${family.key}-${vp.label}-05-fullpage.jpg`),
          type: "jpeg",
          quality: JPEG_QUALITY,
          fullPage: true,
        });
        captured.screenshots.push(join(out, `${family.key}-${vp.label}-05-fullpage.jpg`));
      }

      console.log(`${family.key} @ ${vp.label}: ok`);
    } catch (err) {
      missing.push(`${family.key}/${vp.label}: ${String(err?.message || err)}`);
      console.log(`${family.key} @ ${vp.label}: FAIL`);
    }
    await context.close();
  }

  // Dedicated confirmation capture (mobile) — Accept + Decline outcomes
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem(
        "celeventic_cookie_consent",
        JSON.stringify({ essential: true })
      );
      for (const key of Object.keys(localStorage)) {
        if (/rsvp|ix3-preview/i.test(key)) localStorage.removeItem(key);
      }
    } catch {
      /* ignore */
    }
  });
  const page = await context.newPage();
  try {
    await gotoWithRetry(page, `${BASE}/invitations/experience3/${family.layout}`);
    await page.waitForTimeout(600);
    await dismissCookies(page);
    await setDevice(page, 390);
    if (family.hasOpening) {
      const opened = await dismissGate(page);
      if (!opened) throw new Error("opening gate stuck before accept confirm");
    }
    await submitConfirm(page, "ACCEPTED");
    const acceptPath = join(out, `${family.key}-m390-06-confirm-accept.jpg`);
    await page.screenshot({ path: acceptPath, type: "jpeg", quality: JPEG_QUALITY });
    captured.confirms.push(acceptPath);
    captured.screenshots.push(acceptPath);

    // Decline path on a fresh storage context
    await page.evaluate(() => {
      for (const key of Object.keys(localStorage)) {
        if (/rsvp/i.test(key)) localStorage.removeItem(key);
      }
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    if (family.hasOpening) {
      const opened = await dismissGate(page);
      if (!opened) throw new Error("opening gate stuck before decline confirm");
    }
    await submitConfirm(page, "DECLINED");
    const declinePath = join(out, `${family.key}-m390-07-confirm-decline.jpg`);
    await page.screenshot({ path: declinePath, type: "jpeg", quality: JPEG_QUALITY });
    captured.confirms.push(declinePath);
    captured.screenshots.push(declinePath);
    console.log(`${family.key} confirm: ok`);
  } catch (err) {
    missing.push(`${family.key}/confirm: ${String(err?.message || err)}`);
    console.log(`${family.key} confirm: FAIL`);
  }
  await context.close();
}

async function captureMotion(browser, family) {
  const out = join(PKG, "04_MOTION_RECORDINGS");
  mkdirSync(out, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    recordVideo: { dir: out, size: { width: 390, height: 844 } },
  });
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem(
        "celeventic_cookie_consent",
        JSON.stringify({ essential: true })
      );
    } catch {
      /* ignore */
    }
  });
  const page = await context.newPage();
  try {
    await gotoWithRetry(page, `${BASE}/invitations/experience3/${family.layout}`);
    await page.waitForTimeout(500);
    await dismissCookies(page);
    await setDevice(page, 390);
    if (family.hasOpening) {
      const opened = await dismissGate(page);
      if (!opened) throw new Error("opening gate stuck during motion");
      await page.waitForTimeout(400);
    }
    for (const y of [400, 900, 1500]) {
      await page.evaluate((scrollY) => {
        const el = document.querySelector(
          "div.mx-auto.w-full.overflow-hidden div.max-h-\\[812px\\], div.mx-auto.w-full.overflow-hidden div.max-h-\\[900px\\]"
        );
        if (el) el.scrollTop = scrollY;
        else window.scrollTo(0, scrollY);
      }, y);
      await page.waitForTimeout(350);
    }
    const accept = page.getByTestId("rsvp-choice-ACCEPTED").first();
    await accept.waitFor({ state: "visible", timeout: 12000 });
    await accept.scrollIntoViewIfNeeded();
    await accept.hover().catch(() => {});
    await page.waitForTimeout(300);
  } catch (err) {
    missing.push(`motion/${family.key}: ${String(err?.message || err)}`);
  }
  await context.close();
  const target = join(out, `${family.key}-opening-scroll-rsvp.webm`);
  const candidates = readdirSync(out)
    .filter((f) => f.endsWith(".webm") && !f.includes("-opening-scroll-rsvp"))
    .map((f) => ({ f, t: join(out, f), m: statSync(join(out, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  if (candidates[0]) {
    renameSync(candidates[0].t, target);
    captured.recordings.push(target);
    console.log(`motion ${family.key}: ok`);
  } else if (existsSync(target)) {
    captured.recordings.push(target);
  } else {
    missing.push(`motion/${family.key}: recording file not produced`);
  }
}

function writeManifest() {
  const drift = execSync("git diff --name-only main -- src/components/invitation/templates || true", {
    cwd: ROOT,
  })
    .toString()
    .trim();

  writeFileSync(
    join(PKG, "PACKAGE_MANIFEST.md"),
    [
      "# CELEVENTIC Studio 3 — Batch 1 Review Package Manifest",
      "",
      `- Built at (UTC): ${new Date().toISOString()}`,
      `- Git branch: \`${BRANCH}\``,
      `- Git commit: \`${HEAD}\``,
      `- Supersedes older ZIP checkpoint: \`3533551d\` (independent review package predating P1 remediation)`,
      `- Screenshots (JPEG): ${captured.screenshots.length}`,
      `- Confirmation captures: ${captured.confirms.length}`,
      `- Motion recordings (WebM): ${captured.recordings.length}`,
      `- Source nature: evidence export only (no Batch 2; no protected template edits; no deploy/merge)`,
      "",
      "## Folder map",
      "",
      "- `01_REPORTS/` — Phase 5 reports including **FINAL_ACCEPTANCE_AUDIT** + implementation status",
      "- `02_CATALOG_MAPPING/` — transformation map (+ CSV when available)",
      "- `03_SCREENSHOTS/` — fresh browser captures by family (post P1-1…P1-7)",
      "- `04_MOTION_RECORDINGS/` — short Playwright WebM clips",
      "- `05_PROTECTION/` — protected template manifest",
      "- `06_ARCHITECTURE/` — version isolation / design architecture docs",
      "",
      "## Production safety",
      "",
      `- Protected template path drift vs \`main\`: ${drift ? "SEE LIST" : "none"} (\`src/components/invitation/templates\`)`,
      "- No production DB modifications",
      "- No deployment",
      "- No merge to main",
      "- No catalog marketplace activation of `ix3-*`",
      "",
      "## Human review note",
      "",
      "Batch 1 final creative acceptance is **not** claimed by this package.",
      "Compare these fresh captures against the older ZIP screenshots to judge whether premium craft and structural differentiation now meet Celeventic’s bar.",
      "",
    ].join("\n")
  );

  writeFileSync(
    join(PKG, "MISSING_EVIDENCE.md"),
    [
      "# Missing / not claimed evidence",
      "",
      `- Capture notes (${missing.length}):`,
      ...(missing.length ? missing.map((m) => `- ${m}`) : ["- (none recorded during rebuild)"]),
      "",
      "## Explicitly out of scope / not verified in this package",
      "",
      "- Studio Edit → Save → Reload → Guest View (production path)",
      "- Production RSVP persistence",
      "- Production Lighthouse scores",
      "- Automated accessibility audit suite",
      "- Gallery / Memory Vault / background audio / multiple ceremonies",
      "- Batch 2 families",
      "",
    ].join("\n")
  );

  writeFileSync(
    join(PKG, "EVIDENCE_CAPTURE_LOG.json"),
    JSON.stringify(
      {
        base: BASE,
        branch: BRANCH,
        commit: HEAD,
        capturedAt: new Date().toISOString(),
        screenshotCount: captured.screenshots.length,
        confirmationCount: captured.confirms.length,
        recordingCount: captured.recordings.length,
        missing,
        screenshots: captured.screenshots.map((p) => p.replace(PKG + "/", "")),
        confirms: captured.confirms.map((p) => p.replace(PKG + "/", "")),
        recordings: captured.recordings.map((p) => p.replace(PKG + "/", "")),
      },
      null,
      2
    )
  );
}

function zipPackage() {
  execSync(`ditto -c -k --sequesterRsrc --keepParent "${basename(PKG)}" "${basename(ZIP)}"`, {
    cwd: PKG_ROOT,
    stdio: "inherit",
  });
}

ensureCleanDirs();
assembleDocs();

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

writeManifest();
zipPackage();

const zipStat = existsSync(ZIP) ? statSync(ZIP).size : 0;
console.log(`\nScreenshots: ${captured.screenshots.length}`);
console.log(`Confirmations: ${captured.confirms.length}`);
console.log(`Recordings: ${captured.recordings.length}`);
console.log(`Missing notes: ${missing.length}`);
console.log(`ZIP: ${ZIP} (${Math.round(zipStat / 1024)} KB)`);
console.log(`Commit: ${SHORT} (${BRANCH})`);
if (missing.length) console.log(missing.join("\n"));
