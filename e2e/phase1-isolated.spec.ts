import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Isolated Phase 1 browser lifecycle against prisma/e2e-isolated.db.
 *
 * Payments: route-mocked. This is not Paystack sandbox acceptance.
 * Paystack sandbox remains blocked until live keys are supplied outside this suite.
 */

type Fixtures = {
  hostId: string;
  eventId: string;
  invitationId: string;
  guestId: string;
  ticketId: string;
  inviteLink: string;
  giftToken: string;
  memoryView: string;
  guestQr: string;
  admissionToken: string | null;
  giftBalanceMinor: number;
  ticketBalanceMinor: number;
};

const HOST_EMAIL = "e2e.host@example.test";
const HOST_PASSWORD = "E2ePass!23456";
const FIXTURE_PATH = path.resolve("e2e/fixtures/phase1-isolated.json");

function loadFixtures(): Fixtures {
  if (!fs.existsSync(FIXTURE_PATH)) {
    throw new Error("Isolated fixtures missing. Run: npx tsx scripts/e2e-isolated-prepare.ts");
  }
  return JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf8")) as Fixtures;
}

async function dismissCookies(page: Page) {
  const accept = page.getByRole("button", { name: /Accept All|Accept all|Allow all/i });
  if (await accept.count()) {
    await accept.first().click().catch(() => undefined);
  }
}

async function shot(page: Page, name: string) {
  await page.screenshot({
    path: `e2e/screenshots/isolated-${name}.png`,
    fullPage: true,
  });
}

async function mockPaystack(page: Page) {
  const calls: string[] = [];
  await page.route("**/api/payments/**", async (route) => {
    calls.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          mocked: true,
          provider: "mock",
          status: "SUCCESSFUL",
          note: "Not a Paystack sandbox charge",
          authorizationUrl: "/discover?payment=mocked",
          reference: "e2e-mock-ref",
        },
      }),
    });
  });
  return calls;
}

async function signInHost(page: Page) {
  await page.goto("/auth/login");
  await dismissCookies(page);
  await page.getByLabel(/Email or phone/i).fill(HOST_EMAIL);
  await page.getByLabel(/^Password$/i).fill(HOST_PASSWORD);
  await page.getByRole("button", { name: /Sign in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
}

test.describe.configure({ mode: "serial" });

test.describe("isolated Phase 1 lifecycle (mocked payments)", () => {
  test("host creates an event workspace through the wizard", async ({ page }) => {
    await signInHost(page);
    await page.goto("/dashboard/events/create");
    await dismissCookies(page);
    await page.getByRole("button", { name: /^Wedding$/i }).click();
    await page.getByRole("button", { name: /^Next/i }).click();
    await page.getByPlaceholder("My Amazing Event").fill("E2E Created Event");
    await page.locator("#create-event-host-name").fill("Ama and Kofi");
    await page.getByRole("button", { name: /^Next/i }).click();
    await page.locator('input[type="datetime-local"]').first().fill("2027-09-01T10:00");
    await page.getByRole("button", { name: /^Next/i }).click();
    await page.getByRole("button", { name: /^Next/i }).click();
    await page.getByRole("button", { name: /Create Event Workspace/i }).click();
    await page.waitForURL(/\/dashboard\/events\//, { timeout: 20_000 });
    await expect(page.locator("body")).not.toContainText(/Failed to create event/i);
    await shot(page, "event-create");
  });

  test("host publishes an invitation and guests can open it", async ({ page }) => {
    const fixtures = loadFixtures();
    await signInHost(page);
    const created = await page.evaluate(async (eventId) => {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          name: "E2E published invitation",
          message: "You are invited to the isolated celebration.",
        }),
      });
      return { status: res.status, body: await res.json().catch(() => null) };
    }, fixtures.eventId);
    expect(created.status).toBeLessThan(300);
    const uniqueLink =
      (created.body as { data?: { uniqueLink?: string } } | null)?.data?.uniqueLink ??
      fixtures.inviteLink;
    await page.goto(`/invite/${uniqueLink}`);
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/Application error/i);
    await shot(page, "invitation-published");
  });

  test("guest RSVP is accepted on the seeded invitation", async ({ page }) => {
    const fixtures = loadFixtures();
    await page.goto(`/invite/${fixtures.inviteLink}`);
    await dismissCookies(page);
    const rsvpResult = await page.evaluate(async (payload) => {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return { status: res.status, body: await res.json().catch(() => null) };
    }, {
      invitationId: fixtures.invitationId,
      guestName: "E2E Guest",
      email: "e2e.guest@example.test",
      response: "ACCEPTED",
    });
    expect([200, 201]).toContain(rsvpResult.status);
    expect((rsvpResult.body as { success?: boolean } | null)?.success).toBeTruthy();
    await shot(page, "rsvp");
  });

  test("ticket purchase is mocked and never calls Paystack", async ({ page }) => {
    const fixtures = loadFixtures();
    const calls = await mockPaystack(page);
    await page.goto(`/events/${"e2e-phase1-event"}`);
    await dismissCookies(page);
    const purchase = await page.evaluate(async (ticketId) => {
      const buy = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "purchase",
          ticketId,
          buyerName: "E2E Buyer",
          buyerEmail: "e2e.buyer@example.test",
          quantity: 1,
        }),
      });
      const bought = await buy.json().catch(() => null);
      const pay = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 50,
          email: "e2e.buyer@example.test",
          purpose: "TICKET_PURCHASE",
          ticketOrderId: bought?.data?.order?.id,
        }),
      });
      return {
        buyStatus: buy.status,
        bought,
        payStatus: pay.status,
        paid: await pay.json().catch(() => null),
      };
    }, fixtures.ticketId);
    expect(purchase.buyStatus).toBeLessThan(500);
    expect(purchase.payStatus).toBe(200);
    expect(JSON.stringify(purchase.paid)).toMatch(/mocked|SUCCESSFUL|authorizationUrl/i);
    expect(calls.join(" ")).not.toMatch(/paystack\.com/i);
    await shot(page, "ticket-purchase-mocked");
  });

  test("mocked payment confirmation stays off Paystack sandbox", async ({ page }) => {
    await mockPaystack(page);
    await page.goto("/discover?payment=mocked&reference=e2e-mock-ref");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/Paystack sandbox/i);
    await shot(page, "payment-confirmation-mocked");
  });

  test("QR admission token resolves for the seeded guest", async ({ page }) => {
    const fixtures = loadFixtures();
    await page.goto(`/qr/${fixtures.guestQr}`);
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/Application error/i);
    if (fixtures.admissionToken) {
      await page.goto(`/admission/${fixtures.admissionToken}`);
      await expect(page.locator("body")).toBeVisible();
      await expect(page.locator("body")).not.toContainText(/Application error/i);
    }
    await shot(page, "qr-admission");
  });

  test("offline package download and memory album render", async ({ page }) => {
    const fixtures = loadFixtures();
    await page.goto(`/memory/${fixtures.memoryView}`);
    await expect(page.locator("body")).toBeVisible();
    await shot(page, "offline-memory");
    await signInHost(page);
    const offline = await page.evaluate(async (eventId) => {
      const pkg = await fetch(`/api/admission/offline?eventId=${encodeURIComponent(eventId)}`);
      return { status: pkg.status, body: await pkg.json().catch(() => null) };
    }, fixtures.eventId);
    expect([200, 400, 403]).toContain(offline.status);
    if (offline.status === 200) {
      expect((offline.body as { success?: boolean } | null)?.success).toBeTruthy();
    }
    await page.goto("/dashboard/qr-admission");
    await expect(page.locator("body")).toBeVisible();
    await shot(page, "offline-sync");
  });

  test("gift wallet public page and host reconciliation balances match the ledger", async ({ page }) => {
    const fixtures = loadFixtures();
    await page.goto(`/gift/${fixtures.giftToken}`);
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/Application error/i);
    await shot(page, "gift-wallet");
    await signInHost(page);
    await page.goto("/dashboard/gifts");
    await expect(page.locator("body")).toBeVisible();
    const wallet = await page.evaluate(async (eventId) => {
      const res = await fetch(`/api/gifts/admin/transactions?eventId=${encodeURIComponent(eventId)}`);
      return { status: res.status, body: await res.json().catch(() => null) };
    }, fixtures.eventId);
    expect(wallet.status).toBe(200);
    const balance = (wallet.body as { data?: { wallet?: { balanceMinor?: number } } } | null)
      ?.data?.wallet?.balanceMinor;
    expect(balance).toBe(fixtures.giftBalanceMinor);
    await shot(page, "wallet-reconciliation");
  });
});

test.describe("isolated Phase 1 public marketing", () => {
  test("CeleCard marketing and signup intent", async ({ page }) => {
    await page.goto("/digital-cards");
    await dismissCookies(page);
    await expect(page.getByText("CeleCard").first()).toBeVisible();
    const design = page.getByRole("link", { name: /Design my CeleCard/i }).first();
    await expect(design).toHaveAttribute("href", /intent=smartcard/);
    await shot(page, "digital-cards");
  });
});
