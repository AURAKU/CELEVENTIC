import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

/**
 * Evidence suite for the 13 Nov 2026 CeleYou profile audit findings.
 * Run against a live server:
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3011
 *   npx playwright test e2e/celeyou-profile-audit.spec.ts
 */

const PROFILE = "/u/kojo-mensah";
const QR_TOKEN = "cmw9ryoql08kdb5gq7hisd05w";
const SCREEN_DIR = path.join("e2e", "screenshots", "profile-audit");

const VIEWPORTS = [
  { name: "320", width: 320, height: 568 },
  { name: "375", width: 375, height: 667 },
  { name: "390", width: 390, height: 844 },
  { name: "430", width: 430, height: 932 },
  { name: "768", width: 768, height: 1024 },
  { name: "1024", width: 1024, height: 768 },
  { name: "1280", width: 1280, height: 800 },
  { name: "1440", width: 1440, height: 900 },
] as const;

async function dismissCookies(page: Page) {
  const btn = page.getByRole("button", { name: /仅必要项|Necessary|Accept All|Accept all/i }).first();
  if (await btn.count()) {
    await btn.click({ timeout: 3000 }).catch(() => undefined);
  }
}

async function openProfile(page: Page) {
  await page.goto(PROFILE, { waitUntil: "domcontentloaded" });
  await dismissCookies(page);
  await expect(page.getByRole("heading", { level: 1, name: /Kojo Mensah/ })).toBeVisible();
}

test.describe("CeleYou profile audit evidence", () => {
  test("security headers, QR allowlist, VCF, OG, and Smart QR redirect", async ({ request, baseURL }) => {
    const origin = baseURL || "http://127.0.0.1:3011";
    const profile = await request.get(`${origin}${PROFILE}`);
    expect(profile.ok()).toBeTruthy();
    expect(profile.headers()["x-content-type-options"]).toBe("nosniff");
    expect(profile.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(profile.headers()["x-frame-options"]).toBe("SAMEORIGIN");
    expect(profile.headers()["x-powered-by"] || "").toBe("");
    expect(profile.headers()["cache-control"] || "").toMatch(/no-store/);

    const evil = await request.get(`${origin}/api/qr/image?data=https://evil.example/phish`);
    expect(evil.status()).toBe(400);
    expect(await evil.text()).toMatch(/destination not allowed/);

    const okQr = await request.get(
      `${origin}/api/qr/image?data=${encodeURIComponent(`https://www.celeventic.com/c/${QR_TOKEN}`)}`
    );
    expect(okQr.ok()).toBeTruthy();

    const vcf = await request.get(`${origin}${PROFILE}/contact.vcf`);
    expect(vcf.ok()).toBeTruthy();
    const vcfBody = await vcf.text();
    expect(vcfBody).toMatch(/BEGIN:VCARD/);
    expect(vcfBody).toMatch(/FN;CHARSET=UTF-8:Kojo Mensah/);
    expect(vcfBody).toMatch(/https:\/\/www\.celeventic\.com\/card\/kojo-mensah/);

    const og = await request.get(`${origin}${PROFILE}/og`);
    expect(og.ok()).toBeTruthy();
    expect(og.headers()["content-type"]).toMatch(/image\/jpeg/);
    const ogBytes = (await og.body()).byteLength;
    expect(ogBytes).toBeGreaterThan(8_000);
    expect(ogBytes).toBeLessThan(300_000);

    const scan = await request.get(`${origin}/c/${QR_TOKEN}`, { maxRedirects: 0 });
    expect([307, 308, 302]).toContain(scan.status());
    expect(scan.headers()["location"] || "").toMatch(/\/card\/kojo-mensah/);

    const nfcLive = await request.get(`${origin}/n/cmwaogena03fwb57vgkyttjwa`, { maxRedirects: 0 });
    expect([200, 307, 308, 302]).toContain(nfcLive.status());
    const nfcReplaced = await request.get(`${origin}/n/cmwaq6k5p01psb52ez98t0l3r`, { maxRedirects: 0 });
    expect(nfcReplaced.status()).toBe(200);
    expect(await nfcReplaced.text()).toMatch(/CeleYou|replaced|nfc_/i);
  });

  for (const viewport of VIEWPORTS) {
    test(`no horizontal overflow at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openProfile(page);
      const metrics = await page.evaluate(() => {
        const doc = document.documentElement;
        const qr = document.querySelector("[data-celecard-qr] img, .celecard-face-qr img");
        const qrBox = qr?.getBoundingClientRect();
        return {
          scrollWidth: Math.max(doc.scrollWidth, document.body.scrollWidth),
          innerWidth: window.innerWidth,
          qrVisible: Boolean(qrBox && qrBox.width > 24 && qrBox.height > 24),
          h1: document.querySelector("h1")?.textContent || "",
        };
      });
      expect(metrics.h1).toMatch(/Kojo Mensah/);
      expect(metrics.qrVisible).toBeTruthy();
      expect(metrics.scrollWidth).toBeLessThanOrEqual(viewport.width + 2);
      await page.screenshot({
        path: path.join(SCREEN_DIR, `viewport-${viewport.name}.png`),
        fullPage: true,
      });
    });
  }

  test("fullscreen contain-fit keeps QR and close control on screen", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openProfile(page);
    await page.locator(".celecard-hold-frame").dispatchEvent("click");
    await expect.poll(async () => page.locator("main").getAttribute("data-celecard-hold")).toBe("true");
    const held = await page.evaluate(() => {
      const plate = document.querySelector(".celecard-face");
      const qr = document.querySelector("[data-celecard-qr] img, .celecard-face-qr img");
      const close = document.querySelector(".celecard-hold-close");
      const plateBox = plate?.getBoundingClientRect();
      const qrBox = qr?.getBoundingClientRect();
      const closeBox = close ? getComputedStyle(close) : null;
      return {
        plate: plateBox && {
          w: plateBox.width,
          h: plateBox.height,
          top: plateBox.top,
          bottom: plateBox.bottom,
          right: plateBox.right,
        },
        qr: qrBox && { top: qrBox.top, bottom: qrBox.bottom, right: qrBox.right, w: qrBox.width },
        closeDisplay: closeBox?.display,
        vw: window.innerWidth,
        vh: window.innerHeight,
        ratio: plateBox ? plateBox.width / plateBox.height : 0,
      };
    });
    expect(held.closeDisplay).toBe("grid");
    expect(held.plate?.top).toBeGreaterThanOrEqual(-1);
    expect(held.plate?.bottom).toBeLessThanOrEqual(held.vh + 1);
    expect(held.plate?.right).toBeLessThanOrEqual(held.vw + 1);
    expect(held.qr?.bottom).toBeLessThanOrEqual(held.vh + 1);
    expect(held.qr?.w).toBeGreaterThan(24);
    expect(Math.abs(held.ratio - 85.6 / 54)).toBeLessThan(0.05);
    await page.screenshot({ path: path.join(SCREEN_DIR, "fullscreen-390.png") });
    await page.keyboard.press("Escape");
    await expect.poll(async () => page.locator("main").getAttribute("data-celecard-hold")).toBe("false");
  });

  test("bank and MoMo sheets sit above the dock and MoMo is not a telephone link", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openProfile(page);
    const momoLink = page.locator('a[href^="tel:"]');
    await expect(momoLink).toHaveCount(0);

    await page.getByRole("button", { name: /GCB Bank/i }).click();
    const bank = page.getByRole("dialog").filter({ hasText: /GCB Bank/i });
    await expect(bank).toBeVisible();
    await expect(bank.getByRole("button", { name: /Copy|复制/i }).first()).toBeVisible();
    const bankLayer = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const dock = document.querySelector(".celecard-dock-bar");
      return {
        z: dialog ? getComputedStyle(dialog).zIndex : "",
        dockHidden: dock ? getComputedStyle(dock).visibility : "",
        sheet: document.body.dataset.celecardSheet,
      };
    });
    expect(Number(bankLayer.z)).toBeGreaterThanOrEqual(200);
    expect(bankLayer.dockHidden).toBe("hidden");
    expect(bankLayer.sheet).toBe("true");
    await page.screenshot({ path: path.join(SCREEN_DIR, "bank-modal-390.png") });
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: /MTN MoMo/i }).click();
    const momo = page.getByRole("dialog").filter({ hasText: /MTN MoMo/i });
    await expect(momo).toBeVisible();
    await expect(momo).toContainText(/0240000000/);
    await page.screenshot({ path: path.join(SCREEN_DIR, "momo-modal-390.png") });
    await page.keyboard.press("Escape");
  });

  test("Connect Back exposes labels, email/tel types, and consent", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openProfile(page);
    await page.getByRole("button", { name: /Connect Back|回连|把您的信息/i }).click();
    const email = page.locator('input[name="visitorEmail"]');
    const phone = page.locator('input[name="visitorPhone"]');
    await expect(email).toHaveAttribute("type", "email");
    await expect(phone).toHaveAttribute("type", "tel");
    await expect(page.getByRole("checkbox")).toBeVisible();
    await expect(page.locator('input[name="website"]')).toBeHidden();
    await page.screenshot({ path: path.join(SCREEN_DIR, "connect-back-390.png") });
  });

  test("locked Alipay stays private and empty Business is omitted", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openProfile(page);
    await expect(page.getByRole("button", { name: /Alipay/i })).toBeVisible();
    await expect(page.getByText(/folio-alipay/i)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Business|业务/i })).toHaveCount(0);
  });
});
