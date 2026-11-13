#!/usr/bin/env tsx
/**
 * Disposable HTTP Tap Mode suite. Uses prisma/e2e-tap.db only.
 * Playwright Chromium is preferred when the browser binary is installed.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.PLAYWRIGHT_BASE_URL || process.env.TAP_E2E_BASE || "http://127.0.0.1:3102";
const FIXTURE_PATH = path.resolve("e2e/fixtures/celeyou-tap-mode.json");

type Fixtures = {
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

const fixtures = JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf8")) as Fixtures;

function cookieHeader(parts: string[]) {
  return parts.map((row) => row.split(";")[0]).join("; ");
}

async function login(email: string, password: string) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  const cookies = csrfRes.headers.getSetCookie?.() ?? [];
  const body = new URLSearchParams({
    csrfToken,
    identifier: email,
    password,
    redirect: "false",
    json: "true",
  });
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader(cookies),
    },
    body,
    redirect: "manual",
  });
  const all = cookieHeader([...(csrfRes.headers.getSetCookie?.() ?? []), ...(loginRes.headers.getSetCookie?.() ?? [])]);
  const sessionRes = await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: all } });
  const session = (await sessionRes.json()) as { user?: { email?: string } };
  assert.equal(session.user?.email, email, `login failed for ${email}`);
  return all;
}

async function jsonFetch(
  url: string,
  init: RequestInit & { cookie?: string } = {}
) {
  const headers = new Headers(init.headers);
  if (init.cookie) headers.set("Cookie", init.cookie);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data, text, redirected: res.redirected, url: res.url };
}

const failures: string[] = [];
function check(name: string, fn: () => Promise<void>) {
  return fn()
    .then(() => {
      console.log(`PASS ${name}`);
    })
    .catch((error) => {
      failures.push(name);
      console.error(`FAIL ${name}`);
      console.error(error);
    });
}

async function main() {
  const health = await fetch(`${BASE}/tap/ABCDEF`).catch(() => null);
  if (!health) {
    throw new Error(`Tap e2e server is not reachable at ${BASE}`);
  }

  await check("guest QR landing without authentication", async () => {
    const cookie = await login(fixtures.userA.email, fixtures.password);
    const created = await jsonFetch(`${BASE}/api/digital-business-cards/proximity/sessions`, {
      method: "POST",
      cookie,
      body: JSON.stringify({ cardId: fixtures.userA.cardId, transport: "qr" }),
    });
    assert.equal(created.status, 201);
    const pairing = (created.data as { data: { pairingToken: string; joinCode: string } }).data;
    assert.ok(pairing.pairingToken.length >= 32);
    assert.match(pairing.joinCode, /^[A-Z0-9]{6}$/);
    const page = await jsonFetch(`${BASE}/tap/${pairing.pairingToken}`);
    assert.equal(page.status, 200);
    assert.doesNotMatch(page.text, /auth\/login\?callbackUrl=\/dashboard/);
    assert.match(page.text, /Connect Beyond the Tap/);
    assert.match(page.text, /Kojo Tap/);
    assert.doesNotMatch(page.text, new RegExp(fixtures.secretEmailA));
  });

  await check("guest contact, consent, duplicate, inbox", async () => {
    const cookie = await login(fixtures.userA.email, fixtures.password);
    const created = await jsonFetch(`${BASE}/api/digital-business-cards/proximity/sessions`, {
      method: "POST",
      cookie,
      body: JSON.stringify({ cardId: fixtures.userA.cardId, transport: "qr" }),
    });
    const pairing = (created.data as { data: { pairingToken: string } }).data.pairingToken;
    const noConsent = await jsonFetch(`${BASE}/api/digital-business-cards/connect`, {
      method: "POST",
      headers: { Origin: BASE },
      body: JSON.stringify({
        slug: fixtures.userA.slug,
        visitorName: "Ama Guest",
        visitorEmail: "ama.http.tap@example.test",
        consent: false,
        tapJoinCode: pairing,
      }),
    });
    assert.equal(noConsent.status, 400);
    const ok = await jsonFetch(`${BASE}/api/digital-business-cards/connect`, {
      method: "POST",
      headers: { Origin: BASE },
      body: JSON.stringify({
        slug: fixtures.userA.slug,
        visitorName: "Ama Guest",
        visitorEmail: "ama.http.tap@example.test",
        consent: true,
        tapJoinCode: pairing,
      }),
    });
    assert.equal(ok.status, 200);
    const dup = await jsonFetch(`${BASE}/api/digital-business-cards/connect`, {
      method: "POST",
      headers: { Origin: BASE },
      body: JSON.stringify({
        slug: fixtures.userA.slug,
        visitorName: "Ama Guest",
        visitorEmail: "ama.http.tap@example.test",
        consent: true,
        tapJoinCode: pairing,
      }),
    });
    assert.equal(dup.status, 200);
    assert.equal((dup.data as { duplicate?: boolean }).duplicate, true);
    const inbox = await jsonFetch(`${BASE}/api/digital-business-cards/${fixtures.userA.cardId}/connections?page=1`, {
      cookie,
    });
    const items = (inbox.data as { data: { items: Array<{ visitorEmail?: string; source?: string }>; pageSize: number } }).data;
    assert.equal(items.pageSize, 20);
    const hit = items.items.find((row) => row.visitorEmail === "ama.http.tap@example.test");
    assert.equal(hit?.source, "tap_mode_qr");
  });

  await check("private-field protection on guest API", async () => {
    const cookie = await login(fixtures.userA.email, fixtures.password);
    const created = await jsonFetch(`${BASE}/api/digital-business-cards/proximity/sessions`, {
      method: "POST",
      cookie,
      body: JSON.stringify({ cardId: fixtures.userA.cardId, transport: "qr" }),
    });
    const pairing = (created.data as { data: { pairingToken: string } }).data.pairingToken;
    const guest = await jsonFetch(
      `${BASE}/api/digital-business-cards/proximity/guest?code=${encodeURIComponent(pairing)}`
    );
    const blob = JSON.stringify(guest.data);
    assert.match(blob, new RegExp(fixtures.publicEmailA));
    assert.doesNotMatch(blob, new RegExp(fixtures.secretEmailA));
    assert.doesNotMatch(blob, /passwordHash|subscriptionExpiresAt/);
  });

  await check("expired and cancelled sessions", async () => {
    const cookie = await login(fixtures.userA.email, fixtures.password);
    const live = await jsonFetch(`${BASE}/api/digital-business-cards/proximity/sessions`, {
      method: "POST",
      cookie,
      body: JSON.stringify({ cardId: fixtures.userA.cardId, transport: "qr" }),
    });
    const session = (live.data as { data: { id: string; pairingToken: string } }).data;
    const cancel = await jsonFetch(`${BASE}/api/digital-business-cards/proximity/sessions/${session.id}`, {
      method: "POST",
      cookie,
      body: JSON.stringify({ action: "cancel" }),
    });
    assert.ok(cancel.status < 300);
    const cancelled = await jsonFetch(
      `${BASE}/api/digital-business-cards/proximity/guest?code=${encodeURIComponent(session.pairingToken)}`
    );
    assert.equal(cancelled.status, 410);
    const expiring = await jsonFetch(`${BASE}/api/digital-business-cards/proximity/sessions`, {
      method: "POST",
      cookie,
      body: JSON.stringify({ cardId: fixtures.userA.cardId, transport: "qr" }),
    });
    const exp = (expiring.data as { data: { id: string; pairingToken: string } }).data;
    const prisma = new PrismaClient({ datasources: { db: { url: `file:${fixtures.db}` } } });
    await prisma.celeYouProximitySession.update({
      where: { id: exp.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await prisma.$disconnect();
    const expired = await jsonFetch(
      `${BASE}/api/digital-business-cards/proximity/guest?code=${encodeURIComponent(exp.pairingToken)}`
    );
    assert.ok(expired.status === 410 || expired.status === 404);
  });

  await check("unauthorized session access", async () => {
    const cookieA = await login(fixtures.userA.email, fixtures.password);
    const created = await jsonFetch(`${BASE}/api/digital-business-cards/proximity/sessions`, {
      method: "POST",
      cookie: cookieA,
      body: JSON.stringify({ cardId: fixtures.userA.cardId, transport: "qr" }),
    });
    const id = (created.data as { data: { id: string } }).data.id;
    const anon = await jsonFetch(`${BASE}/api/digital-business-cards/proximity/sessions/${id}`);
    assert.equal(anon.status, 401);
    const cookieB = await login(fixtures.userB.email, fixtures.password);
    const cross = await jsonFetch(`${BASE}/api/digital-business-cards/proximity/sessions/${id}`, {
      cookie: cookieB,
    });
    assert.equal(cross.status, 404);
  });

  await check("deactivated card closes the landing", async () => {
    const cookie = await login(fixtures.userDeact.email, fixtures.password);
    const created = await jsonFetch(`${BASE}/api/digital-business-cards/proximity/sessions`, {
      method: "POST",
      cookie,
      body: JSON.stringify({ cardId: fixtures.userDeact.cardId, transport: "qr" }),
    });
    assert.equal(created.status, 201);
    const pairing = (created.data as { data: { pairingToken: string } }).data.pairingToken;
    const prisma = new PrismaClient({ datasources: { db: { url: `file:${fixtures.db}` } } });
    await prisma.digitalBusinessCard.update({
      where: { id: fixtures.userDeact.cardId },
      data: { adminDeactivatedAt: new Date() },
    });
    await prisma.$disconnect();
    const guest = await jsonFetch(
      `${BASE}/api/digital-business-cards/proximity/guest?code=${encodeURIComponent(pairing)}`
    );
    assert.ok(guest.status === 404 || guest.status === 410);
  });

  await check("two-account exchange, duplicate, self-exchange", async () => {
    const cookieA = await login(fixtures.userA.email, fixtures.password);
    const created = await jsonFetch(`${BASE}/api/digital-business-cards/proximity/sessions`, {
      method: "POST",
      cookie: cookieA,
      body: JSON.stringify({ cardId: fixtures.userA.cardId, transport: "qr" }),
    });
    const pairing = (created.data as { data: { pairingToken: string } }).data.pairingToken;
    const self = await jsonFetch(
      `${BASE}/api/digital-business-cards/connect/exchange?slug=${fixtures.userA.slug}`,
      { cookie: cookieA }
    );
    assert.equal(self.status, 400);
    const cookieB = await login(fixtures.userB.email, fixtures.password);
    const preview = await jsonFetch(
      `${BASE}/api/digital-business-cards/connect/exchange?slug=${fixtures.userA.slug}`,
      { cookie: cookieB }
    );
    assert.equal(preview.status, 200);
    const previewData = (preview.data as { data: { you: { email?: string | null }; them: { email?: string | null } } }).data;
    assert.notEqual(previewData.them.email, fixtures.secretEmailA);
    const confirm = await jsonFetch(`${BASE}/api/digital-business-cards/connect/exchange`, {
      method: "POST",
      cookie: cookieB,
      body: JSON.stringify({
        slug: fixtures.userA.slug,
        confirm: true,
        tapJoinCode: pairing,
        visitorCardId: fixtures.userB.cardId,
      }),
    });
    assert.ok(confirm.status < 300);
    const again = await jsonFetch(`${BASE}/api/digital-business-cards/connect/exchange`, {
      method: "POST",
      cookie: cookieB,
      body: JSON.stringify({ slug: fixtures.userA.slug, confirm: true, tapJoinCode: pairing }),
    });
    const againJson = again.data as { data?: { duplicate?: boolean }; duplicate?: boolean };
    assert.ok(againJson.data?.duplicate || againJson.duplicate);
    const inboxA = await jsonFetch(`${BASE}/api/digital-business-cards/${fixtures.userA.cardId}/connections?page=1`, {
      cookie: cookieA,
    });
    const inboxB = await jsonFetch(`${BASE}/api/digital-business-cards/${fixtures.userB.cardId}/connections?page=1`, {
      cookie: cookieB,
    });
    const aItems = (inboxA.data as { data: { items: Array<{ source: string; visitorName: string }> } }).data.items;
    const bItems = (inboxB.data as { data: { items: Array<{ source: string; visitorName: string }> } }).data.items;
    assert.ok(aItems.some((row) => row.source === "exchange" && row.visitorName === fixtures.userB.name));
    assert.ok(bItems.some((row) => row.source === "exchange" && row.visitorName === fixtures.userA.name));
  });

  await check("expired, suspended, connect-back-disabled", async () => {
    const noConnect = await jsonFetch(`${BASE}/api/digital-business-cards/connect`, {
      method: "POST",
      body: JSON.stringify({
        slug: fixtures.slugNoConnect,
        visitorName: "Blocked Guest",
        visitorEmail: "blocked.tap@example.test",
        consent: true,
      }),
    });
    assert.equal(noConnect.status, 403);
    const expiredPage = await jsonFetch(`${BASE}/u/${fixtures.slugExpired}`);
    assert.ok(expiredPage.status < 500);
    assert.doesNotMatch(expiredPage.text, /Send My Contact/);
    const suspendedPage = await jsonFetch(`${BASE}/u/${fixtures.slugSuspended}`);
    assert.ok(suspendedPage.status < 500);
  });

  if (failures.length) {
    console.error(`\n${failures.length} Tap HTTP checks failed`);
    process.exit(1);
  }
  console.log("\nAll Tap Mode HTTP checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
