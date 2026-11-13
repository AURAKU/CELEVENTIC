import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

/**
 * Isolated CeleYou Tap Mode browser coverage against prisma/e2e-tap.db.
 * Does not open prisma/production.db or prisma/dev.db.
 */

type TapFixtures = {
  password: string;
  userA: { id: string; email: string; cardId: string; slug: string; name: string };
  userB: { id: string; email: string; cardId: string; slug: string; name: string };
  userDeact: { id: string; email: string; cardId: string; slug: string };
  slugExpired: string;
  slugSuspended: string;
  slugNoConnect: string;
  publicEmailA: string;
  secretEmailA: string;
  db: string;
};

const FIXTURE_PATH = path.resolve("e2e/fixtures/celeyou-tap-mode.json");

function loadFixtures(): TapFixtures {
  if (!fs.existsSync(FIXTURE_PATH)) {
    throw new Error("Tap fixtures missing. Run: npx tsx scripts/e2e-tap-mode-prepare.ts");
  }
  return JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf8")) as TapFixtures;
}

function tapPrisma() {
  const fixtures = loadFixtures();
  return new PrismaClient({ datasources: { db: { url: `file:${fixtures.db}` } } });
}

async function dismissCookies(page: Page) {
  const accept = page.getByRole("button", { name: /Accept All|Accept all|Allow all/i });
  if (await accept.count()) {
    await accept.first().click().catch(() => undefined);
  }
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/auth/login");
  await dismissCookies(page);
  await page.getByLabel(/Email or phone/i).fill(email);
  await page.getByLabel(/^Password$/i).fill(password);
  await page.getByRole("button", { name: /Sign in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 25_000 });
}

async function createTapSession(request: APIRequestContext, cardId: string) {
  const res = await request.post("/api/digital-business-cards/proximity/sessions", {
    data: { cardId, transport: "qr" },
  });
  const json = await res.json();
  expect(res.status(), json.error || "session create").toBe(201);
  expect(json.data?.pairingToken).toBeTruthy();
  expect(String(json.data.pairingToken).length).toBeGreaterThanOrEqual(32);
  expect(json.data.joinCode).toMatch(/^[A-Z0-9]{6}$/);
  return json.data as { id: string; joinCode: string; pairingToken: string };
}

test.describe.configure({ mode: "serial" });

test.describe("CeleYou Tap Mode isolated e2e", () => {
  test("guest QR landing does not require authentication", async ({ page }) => {
    const fixtures = loadFixtures();
    await signIn(page, fixtures.userA.email, fixtures.password);
    const session = await createTapSession(page.request, fixtures.userA.cardId);
    const guest = await page.context().browser()?.newContext();
    if (!guest) throw new Error("no browser");
    const guestPage = await guest.newPage();
    await guestPage.goto(`/tap/${session.pairingToken}`);
    await expect(guestPage).not.toHaveURL(/auth\/login/);
    await expect(guestPage.getByRole("heading", { name: /Connect Beyond the Tap/i })).toBeVisible();
    await expect(guestPage.getByText(fixtures.userA.name)).toBeVisible();
    await expect(guestPage.getByRole("button", { name: /Save Contact|SAVE CONTACT|Save/i }).first()).toBeVisible();
    await expect(guestPage.getByRole("button", { name: /Exchange Contact/i })).toBeVisible();
    await guest.close();
  });

  test("guest can submit contact with consent and duplicates are suppressed", async ({ page }) => {
    const fixtures = loadFixtures();
    await signIn(page, fixtures.userA.email, fixtures.password);
    const session = await createTapSession(page.request, fixtures.userA.cardId);

    const guest = await page.context().browser()?.newContext();
    if (!guest) throw new Error("no browser");
    const guestPage = await guest.newPage();
    await guestPage.goto(`/tap/${session.pairingToken}`);
    await guestPage.getByRole("button", { name: /Exchange Contact/i }).click();
    await guestPage.getByLabel("Your Name").fill("Ama Guest");
    await guestPage.getByLabel("Email Address").fill("ama.guest.tap@example.test");
    await guestPage.getByRole("button", { name: /Send My Contact/i }).click();
    await expect(guestPage.getByText(/You're Connected/i)).toHaveCount(0);

    await guestPage.getByRole("checkbox").check();
    await guestPage.getByRole("button", { name: /Send My Contact/i }).click();
    await expect(guestPage.getByText(/You're Connected/i)).toBeVisible();

    const noConsent = await guestPage.request.post("/api/digital-business-cards/connect", {
      data: {
        slug: fixtures.userA.slug,
        visitorName: "No Consent",
        visitorEmail: "noconsent.tap@example.test",
        consent: false,
        tapJoinCode: session.pairingToken,
      },
    });
    expect(noConsent.status()).toBe(400);

    const duplicate = await guestPage.request.post("/api/digital-business-cards/connect", {
      data: {
        slug: fixtures.userA.slug,
        visitorName: "Ama Guest",
        visitorEmail: "ama.guest.tap@example.test",
        consent: true,
        tapJoinCode: session.pairingToken,
      },
    });
    const dupJson = await duplicate.json();
    expect(duplicate.ok()).toBeTruthy();
    expect(dupJson.duplicate).toBe(true);

    const inbox = await page.request.get(`/api/digital-business-cards/${fixtures.userA.cardId}/connections?page=1`);
    const inboxJson = await inbox.json();
    expect(inbox.ok()).toBeTruthy();
    expect(inboxJson.data.pageSize).toBe(20);
    const hit = inboxJson.data.items.find(
      (row: { visitorEmail?: string }) => row.visitorEmail === "ama.guest.tap@example.test"
    );
    expect(hit?.source).toBe("tap_mode_qr");
    expect(hit?.visitorName).toBe("Ama Guest");
    await guest.close();
  });

  test("guest API hides protected fields and keeps pairing entropy", async ({ page }) => {
    const fixtures = loadFixtures();
    await signIn(page, fixtures.userA.email, fixtures.password);
    const session = await createTapSession(page.request, fixtures.userA.cardId);
    const guest = await page.request.get(
      `/api/digital-business-cards/proximity/guest?code=${encodeURIComponent(session.pairingToken)}`
    );
    const json = await guest.json();
    expect(guest.ok()).toBeTruthy();
    const blob = JSON.stringify(json);
    expect(blob).toContain(fixtures.publicEmailA);
    expect(blob).not.toContain(fixtures.secretEmailA);
    expect(blob).not.toContain("passwordHash");
    expect(blob).not.toContain("subscriptionExpiresAt");
    expect(session.pairingToken).not.toContain(fixtures.secretEmailA);
  });

  test("expired and cancelled sessions are rejected", async ({ page }) => {
    const fixtures = loadFixtures();
    await signIn(page, fixtures.userA.email, fixtures.password);
    const live = await createTapSession(page.request, fixtures.userA.cardId);
    const cancel = await page.request.post(
      `/api/digital-business-cards/proximity/sessions/${live.id}`,
      { data: { action: "cancel" } }
    );
    expect(cancel.ok()).toBeTruthy();
    const cancelledGuest = await page.request.get(
      `/api/digital-business-cards/proximity/guest?code=${encodeURIComponent(live.pairingToken)}`
    );
    expect(cancelledGuest.status()).toBe(410);

    const expiring = await createTapSession(page.request, fixtures.userA.cardId);
    const prisma = tapPrisma();
    await prisma.celeYouProximitySession.update({
      where: { id: expiring.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await prisma.$disconnect();
    const expiredGuest = await page.request.get(
      `/api/digital-business-cards/proximity/guest?code=${encodeURIComponent(expiring.pairingToken)}`
    );
    expect([410, 404]).toContain(expiredGuest.status());
  });

  test("unauthorized session access is denied", async ({ page, request }) => {
    const fixtures = loadFixtures();
    await signIn(page, fixtures.userA.email, fixtures.password);
    const session = await createTapSession(page.request, fixtures.userA.cardId);
    const anon = await request.get(`/api/digital-business-cards/proximity/sessions/${session.id}`);
    expect(anon.status()).toBe(401);
    const other = await page.context().browser()?.newContext();
    if (!other) throw new Error("no browser");
    const otherPage = await other.newPage();
    await signIn(otherPage, fixtures.userB.email, fixtures.password);
    const cross = await otherPage.request.get(`/api/digital-business-cards/proximity/sessions/${session.id}`);
    expect(cross.status()).toBe(404);
    await other.close();
  });

  test("deactivated cards cannot keep an open Tap landing", async ({ page }) => {
    const fixtures = loadFixtures();
    await signIn(page, fixtures.userDeact.email, fixtures.password);
    const session = await createTapSession(page.request, fixtures.userDeact.cardId);
    const prisma = tapPrisma();
    await prisma.digitalBusinessCard.update({
      where: { id: fixtures.userDeact.cardId },
      data: { adminDeactivatedAt: new Date() },
    });
    await prisma.$disconnect();
    const guest = await page.request.get(
      `/api/digital-business-cards/proximity/guest?code=${encodeURIComponent(session.pairingToken)}`
    );
    expect([404, 410]).toContain(guest.status());
  });

  test("two independent accounts exchange authorized snapshots once", async ({ page }) => {
    const fixtures = loadFixtures();
    await signIn(page, fixtures.userA.email, fixtures.password);
    const session = await createTapSession(page.request, fixtures.userA.cardId);
    const self = await page.request.get(
      `/api/digital-business-cards/connect/exchange?slug=${fixtures.userA.slug}`
    );
    const selfJson = await self.json();
    expect(self.status()).toBe(400);
    expect(String(selfJson.error)).toMatch(/own CeleYou/i);

    const browser = page.context().browser();
    if (!browser) throw new Error("no browser");
    const bCtx = await browser.newContext();
    const bPage = await bCtx.newPage();
    await signIn(bPage, fixtures.userB.email, fixtures.password);
    await bPage.goto(`/tap/${session.pairingToken}`);
    await expect(bPage.getByRole("button", { name: /Exchange Cards/i })).toBeVisible({ timeout: 20_000 });
    await bPage.getByRole("button", { name: /Exchange Cards/i }).click();
    await expect(bPage.getByText(fixtures.userB.name)).toBeVisible();
    await expect(bPage.getByText(fixtures.secretEmailA)).toHaveCount(0);
    await bPage.getByRole("button", { name: /Confirm Exchange/i }).click();
    await expect(bPage.getByText(/Connected|You're Connected/i).first()).toBeVisible({ timeout: 20_000 });

    const again = await bPage.request.post("/api/digital-business-cards/connect/exchange", {
      data: { slug: fixtures.userA.slug, confirm: true, tapJoinCode: session.pairingToken },
    });
    const againJson = await again.json();
    expect(again.ok()).toBeTruthy();
    expect(againJson.data?.duplicate || againJson.duplicate).toBeTruthy();

    const inboxA = await page.request.get(`/api/digital-business-cards/${fixtures.userA.cardId}/connections?page=1`);
    const inboxB = await bPage.request.get(`/api/digital-business-cards/${fixtures.userB.cardId}/connections?page=1`);
    const aItems = (await inboxA.json()).data.items as Array<{ source: string; visitorName: string }>;
    const bItems = (await inboxB.json()).data.items as Array<{ source: string; visitorName: string }>;
    expect(aItems.some((row) => row.source === "exchange" && row.visitorName === fixtures.userB.name)).toBeTruthy();
    expect(bItems.some((row) => row.source === "exchange" && row.visitorName === fixtures.userA.name)).toBeTruthy();
    await bCtx.close();
  });

  test("expired, suspended, and Connect Back disabled cards stay restricted", async ({ page }) => {
    const fixtures = loadFixtures();
    const expired = await page.request.get(`/u/${fixtures.slugExpired}`);
    const expiredHtml = await expired.text();
    expect(expiredHtml).not.toContain("Send My Contact");
    const suspended = await page.request.get(`/u/${fixtures.slugSuspended}`);
    expect(suspended.status()).toBeLessThan(500);
    const noConnect = await page.request.post("/api/digital-business-cards/connect", {
      data: {
        slug: fixtures.slugNoConnect,
        visitorName: "Blocked Guest",
        visitorEmail: "blocked.tap@example.test",
        consent: true,
      },
    });
    expect(noConnect.status()).toBe(403);
  });

  test("mobile viewport keeps the guest landing usable", async ({ browser }) => {
    const fixtures = loadFixtures();
    const host = await browser.newContext();
    const hostPage = await host.newPage();
    await signIn(hostPage, fixtures.userA.email, fixtures.password);
    const session = await createTapSession(hostPage.request, fixtures.userA.cardId);
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mobilePage = await mobile.newPage();
    await mobilePage.goto(`/tap/${session.pairingToken}`);
    await expect(mobilePage.getByRole("heading", { name: /Connect Beyond the Tap/i })).toBeVisible();
    const box = await mobilePage.getByRole("button", { name: /Exchange Contact/i }).boundingBox();
    expect(box?.height || 0).toBeGreaterThanOrEqual(40);
    await host.close();
    await mobile.close();
  });
});
