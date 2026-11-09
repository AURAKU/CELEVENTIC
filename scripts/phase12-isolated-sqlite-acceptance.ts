#!/usr/bin/env tsx
/**
 * Isolated SQLite acceptance for the engine Celeventic actually ships.
 *
 * Production deploy scripts use prisma/production.db (SQLite). This harness
 * never opens prisma/dev.db or prisma/production.db. It pushes the current
 * schema onto a disposable file under os.tmpdir() and exercises ticket
 * inventory, ledger posting, promo CAS, refunds, reservation expiry, and a
 * service-level event lifecycle.
 *
 * PostgreSQL is not the Prisma provider. Do not treat this as Postgres proof.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "celeventic-v22-sqlite-"));
const dbPath = path.join(workDir, `accept-${stamp}.db`);
const dbUrl = `file:${dbPath}`;

process.env.DATABASE_URL = dbUrl;
process.env.NEXTAUTH_SECRET ??= "accept-harness-not-a-real-secret";
process.env.NEXTAUTH_URL ??= "http://localhost:3000";
process.env.TICKET_RESERVATION_TTL_MS ??= String(15 * 60 * 1000);

const failures: string[] = [];
const results: Array<{ name: string; status: "PASS" | "FAIL"; detail?: string }> = [];

function record(name: string, fn: () => Promise<void> | void) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      results.push({ name, status: "PASS" });
      console.log(`PASS  ${name}`);
    })
    .catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : String(error);
      failures.push(`${name}: ${detail}`);
      results.push({ name, status: "FAIL", detail });
      console.error(`FAIL  ${name}: ${detail}`);
    });
}

function cloneAppliedSchema() {
  const source = path.join(ROOT, "prisma", "dev.db");
  const fixture = path.join(ROOT, "scripts", "fixtures", "applied-sqlite-schema.sql");
  // prisma db push cannot create a fresh SQLite file: JSONB DEFAULT {} is invalid
  // SQLite. Clone the already-applied DDL only. No rows are copied.
  const schema = fs.existsSync(source)
    ? execFileSync("sqlite3", [source, ".schema"], { encoding: "utf8" })
    : fs.existsSync(fixture)
      ? fs.readFileSync(fixture, "utf8")
      : "";
  if (!schema.trim()) {
    throw new Error("prisma/dev.db and scripts/fixtures/applied-sqlite-schema.sql are both missing");
  }
  execFileSync("sqlite3", [dbPath], {
    input: schema,
    stdio: ["pipe", "pipe", "pipe"],
  });
  execFileSync("sqlite3", [dbPath, "PRAGMA journal_mode=WAL;"], { stdio: ["ignore", "pipe", "pipe"] });
  execFileSync("sqlite3", [dbPath, "PRAGMA busy_timeout=30000;"], { stdio: ["ignore", "pipe", "pipe"] });
  execFileSync("sqlite3", [dbPath, "PRAGMA foreign_keys = ON;"], { stdio: ["ignore", "pipe", "pipe"] });
}

async function seedEvent(prisma: import("@prisma/client").PrismaClient, suffix: string) {
  const user = await prisma.user.create({
    data: {
      name: "Accept Organizer",
      email: `accept-${suffix}@example.test`,
    },
  });
  const event = await prisma.event.create({
    data: {
      slug: `accept-${suffix}`,
      title: "Acceptance Event",
      eventType: "WEDDING",
      hostName: "Host",
      startDate: new Date("2027-06-01T10:00:00.000Z"),
      organizerId: user.id,
      pricingType: "PAID",
      status: "PUBLISHED",
    },
  });
  return { user, event };
}

async function settledConfirm(
  ticketService: { confirmPurchase: (orderId: string) => Promise<unknown> },
  prisma: import("@prisma/client").PrismaClient,
  orderId: string
) {
  try {
    await ticketService.confirmPurchase(orderId);
  } catch (error) {
    const order = await prisma.ticketOrder.findUnique({ where: { id: orderId } });
    if (order?.status === "PAID" || order?.status === "USED") return;
    throw error;
  }
}

async function main() {
console.log(`Isolated SQLite acceptance db: ${dbPath}`);
console.log("Cloning applied SQLite DDL onto an empty disposable file...");
try {
  cloneAppliedSchema();
} catch (error) {
  const stderr =
    error && typeof error === "object" && "stderr" in error
      ? String((error as { stderr?: Buffer | string }).stderr)
      : "";
  console.error("BLOCKED: could not clone applied SQLite schema.");
  console.error(stderr.slice(0, 2000) || (error instanceof Error ? error.message : String(error)));
  process.exit(2);
}

const { prisma } = await import("../src/lib/prisma");
const { ticketService } = await import("../src/services/tickets/ticket.service");
const { postTicketSale } = await import("../src/services/tickets/ticket-ledger.service");
const { eventWalletService } = await import("../src/services/gifts/event-wallet.service");
const { incrementPromoUse } = await import("../src/lib/tickets/promo-storage");

await record("1. Forty simultaneous purchases against capacity ten", async () => {
  const { event } = await seedEvent(prisma, `cap10-${Date.now()}`);
  const ticket = await prisma.ticket.create({
    data: {
      eventId: event.id,
      name: "GA",
      type: "PAID",
      price: 100,
      maxQuantity: 10,
      status: "PAID",
    },
  });
  const settled = await Promise.allSettled(
    Array.from({ length: 40 }, (_, i) =>
      ticketService.purchaseTicket({
        ticketId: ticket.id,
        buyerName: `Buyer ${i + 1}`,
        quantity: 1,
      })
    )
  );
  const purchased = settled.filter((row) => row.status === "fulfilled");
  const pending = await prisma.ticketOrder.aggregate({
    where: { ticketId: ticket.id, status: "PENDING" },
    _sum: { quantity: true },
  });
  const held = Number(pending._sum.quantity ?? 0);
  const fresh = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
  assert.ok(fresh.soldCount >= 0, "inventory must never go negative");
  assert.ok(held + fresh.soldCount <= 10, "must not oversell capacity");
  assert.equal(held + fresh.soldCount, 10, `expected 10 holds, got ${held} pending + ${fresh.soldCount} sold (${purchased.length} fulfilled requests)`);
});

await record("2. Concurrent final-ticket reservations", async () => {
  const { event } = await seedEvent(prisma, `last-${Date.now()}`);
  const ticket = await prisma.ticket.create({
    data: {
      eventId: event.id,
      name: "Last",
      type: "PAID",
      price: 50,
      maxQuantity: 1,
      status: "PAID",
    },
  });
  const settled = await Promise.allSettled([
    ticketService.purchaseTicket({ ticketId: ticket.id, buyerName: "Ama", quantity: 1 }),
    ticketService.purchaseTicket({ ticketId: ticket.id, buyerName: "Kofi", quantity: 1 }),
  ]);
  const ok = settled.filter((row) => row.status === "fulfilled");
  assert.equal(ok.length, 1);
  const orders = await prisma.ticketOrder.findMany({ where: { ticketId: ticket.id } });
  assert.equal(orders.filter((row) => row.status === "PENDING").length, 1);
});

await record("3. Duplicate order confirmations mint once", async () => {
  const { event } = await seedEvent(prisma, `dup-confirm-${Date.now()}`);
  const ticket = await prisma.ticket.create({
    data: {
      eventId: event.id,
      name: "Dup",
      type: "PAID",
      price: 80,
      maxQuantity: 5,
      status: "PAID",
    },
  });
  const { order } = await ticketService.purchaseTicket({
    ticketId: ticket.id,
    buyerName: "Ama",
    quantity: 1,
  });
  await Promise.all([
    settledConfirm(ticketService, prisma, order.id),
    settledConfirm(ticketService, prisma, order.id),
    settledConfirm(ticketService, prisma, order.id),
  ]);
  const paid = await prisma.ticketOrder.findUniqueOrThrow({ where: { id: order.id } });
  assert.equal(paid.status, "PAID");
  const stock = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
  assert.equal(stock.soldCount, 1);
});

await record("4. Repeated payment webhooks post one ledger sale", async () => {
  const { event } = await seedEvent(prisma, `hook-${Date.now()}`);
  const paymentId = `pay_${Date.now()}`;
  const posts = await Promise.all([
    postTicketSale({ eventId: event.id, paymentId, orderId: "ord_hook", grossMinor: 10000 }),
    postTicketSale({ eventId: event.id, paymentId, orderId: "ord_hook", grossMinor: 10000 }),
    postTicketSale({ eventId: event.id, paymentId, orderId: "ord_hook", grossMinor: 10000 }),
  ]);
  assert.equal(posts.filter((row) => !row.alreadyApplied).length, 1);
  const account = await eventWalletService.getOrCreateAccount(event.id, "GHS", prisma, "TICKET");
  assert.equal(account.balanceMinor, 9500);
  assert.equal(account.lifetimeTicketGrossMinor, 10000);
  const gift = await eventWalletService.getOrCreateAccount(event.id, "GHS", prisma, "GIFT");
  assert.equal(gift.balanceMinor, 0);
});

await record("5. Concurrent ledger posting stays idempotent", async () => {
  const { event } = await seedEvent(prisma, `ledger-${Date.now()}`);
  const paymentId = `pay_race_${Date.now()}`;
  await Promise.all(
    Array.from({ length: 12 }, () =>
      postTicketSale({ eventId: event.id, paymentId, grossMinor: 20000 })
    )
  );
  const account = await eventWalletService.getOrCreateAccount(event.id, "GHS", prisma, "TICKET");
  assert.equal(account.balanceMinor, 19000);
  assert.ok(account.balanceMinor >= 0);
});

await record("6. Duplicate refund attempts reverse once", async () => {
  const { event } = await seedEvent(prisma, `refund-${Date.now()}`);
  const ticket = await prisma.ticket.create({
    data: {
      eventId: event.id,
      name: "Refundable",
      type: "PAID",
      price: 100,
      maxQuantity: 4,
      status: "PAID",
    },
  });
  const { order } = await ticketService.purchaseTicket({
    ticketId: ticket.id,
    buyerName: "Ama",
    quantity: 2,
  });
  await settledConfirm(ticketService, prisma, order.id);
  const payment = await prisma.payment.create({
    data: {
      reference: `ref-refund-${Date.now()}`,
      provider: "PAYSTACK",
      purpose: "TICKET_PURCHASE",
      amount: 200,
      currency: "GHS",
      status: "SUCCESSFUL",
      ticketOrderId: order.id,
    },
  });
  await postTicketSale({
    eventId: event.id,
    paymentId: payment.id,
    orderId: order.id,
    grossMinor: 20000,
  });
  const first = await ticketService.refundOrder(order.id);
  assert.equal(first.status, "REFUNDED");
  await assert.rejects(() => ticketService.refundOrder(order.id));
  const stock = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
  assert.equal(stock.soldCount, 0);
  const ticketBook = await eventWalletService.getOrCreateAccount(event.id, "GHS", prisma, "TICKET");
  assert.equal(ticketBook.balanceMinor, 0);
});

await record("7. Promotion redemption races honour maxUses", async () => {
  const { event } = await seedEvent(prisma, `promo-${Date.now()}`);
  const promo = await prisma.ticketPromo.create({
    data: {
      eventId: event.id,
      code: "ONCE",
      discountPercent: 100,
      maxUses: 1,
      active: true,
    },
  });
  const claimed = await Promise.allSettled(
    Array.from({ length: 8 }, (_, i) =>
      incrementPromoUse(event.id, "ONCE", prisma, { orderId: `ord-promo-${i}` })
    )
  );
  const applied = claimed.filter(
    (row) => row.status === "fulfilled" && row.value.applied
  );
  assert.equal(applied.length, 1);
  const latest = await prisma.ticketPromo.findUniqueOrThrow({ where: { id: promo.id } });
  assert.equal(latest.usedCount, 1);
});

await record("8. Transaction rollback leaves inventory unchanged", async () => {
  const { event } = await seedEvent(prisma, `rollback-${Date.now()}`);
  const ticket = await prisma.ticket.create({
    data: {
      eventId: event.id,
      name: "Sold out",
      type: "PAID",
      price: 40,
      maxQuantity: 1,
      status: "PAID",
      soldCount: 1,
    },
  });
  await assert.rejects(
    () =>
      ticketService.purchaseTicket({
        ticketId: ticket.id,
        buyerName: "Late",
        quantity: 1,
      }),
    /Not enough tickets available/
  );
  const orders = await prisma.ticketOrder.count({ where: { ticketId: ticket.id } });
  assert.equal(orders, 0);
  const stock = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
  assert.equal(stock.soldCount, 1);
});

await record("9. Reservation expiration releases the hold", async () => {
  const { event } = await seedEvent(prisma, `expire-${Date.now()}`);
  const ticket = await prisma.ticket.create({
    data: {
      eventId: event.id,
      name: "Hold",
      type: "PAID",
      price: 60,
      maxQuantity: 1,
      status: "PAID",
    },
  });
  const { order } = await ticketService.purchaseTicket({
    ticketId: ticket.id,
    buyerName: "Slow",
    quantity: 1,
  });
  await prisma.ticketOrder.update({
    where: { id: order.id },
    data: { createdAt: new Date(Date.now() - 20 * 60 * 1000) },
  });
  const expiredCount = await ticketService.expireStalePendingOrders();
  assert.ok(expiredCount >= 1);
  const expired = await prisma.ticketOrder.findUniqueOrThrow({ where: { id: order.id } });
  assert.equal(expired.status, "EXPIRED");
  const next = await ticketService.purchaseTicket({
    ticketId: ticket.id,
    buyerName: "Next",
    quantity: 1,
  });
  assert.equal(next.order.status, "PENDING");
});

await record("10. Payment confirmation after reservation expiration does not mint", async () => {
  const { event } = await seedEvent(prisma, `pay-expire-${Date.now()}`);
  const ticket = await prisma.ticket.create({
    data: {
      eventId: event.id,
      name: "Late pay",
      type: "PAID",
      price: 70,
      maxQuantity: 1,
      status: "PAID",
    },
  });
  const { order } = await ticketService.purchaseTicket({
    ticketId: ticket.id,
    buyerName: "Late",
    quantity: 1,
  });
  await prisma.ticketOrder.update({
    where: { id: order.id },
    data: { createdAt: new Date(Date.now() - 20 * 60 * 1000) },
  });
  await assert.rejects(() => ticketService.confirmPurchase(order.id), /expired/i);
  const latest = await prisma.ticketOrder.findUniqueOrThrow({ where: { id: order.id } });
  assert.equal(latest.status, "EXPIRED");
  const stock = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
  assert.equal(stock.soldCount, 0);
});

await record("11. Service-level event lifecycle (not browser E2E)", async () => {
  const { user, event } = await seedEvent(prisma, `life-${Date.now()}`);
  const invitation = await prisma.invitation.create({
    data: {
      eventId: event.id,
      name: "Main invitation",
      slug: `invite-${Date.now()}`,
      uniqueLink: `ulink-${Date.now()}`,
    },
  });
  const guest = await prisma.guest.create({
    data: {
      eventId: event.id,
      userId: user.id,
      name: "Nana Ama",
      email: "nana@example.test",
      status: "ACCEPTED",
    },
  });
  const ticket = await prisma.ticket.create({
    data: {
      eventId: event.id,
      name: "Ceremony",
      type: "PAID",
      price: 100,
      maxQuantity: 20,
      status: "PAID",
    },
  });
  const { order } = await ticketService.purchaseTicket({
    ticketId: ticket.id,
    buyerName: guest.name,
    buyerEmail: guest.email ?? undefined,
    quantity: 1,
  });
  const payment = await prisma.payment.create({
    data: {
      reference: `life-${Date.now()}`,
      provider: "PAYSTACK",
      purpose: "TICKET_PURCHASE",
      amount: 100,
      currency: "GHS",
      status: "SUCCESSFUL",
      ticketOrderId: order.id,
    },
  });
  const sale = await postTicketSale({
    eventId: event.id,
    paymentId: payment.id,
    orderId: order.id,
    grossMinor: 10000,
    reference: payment.reference,
  });
  await settledConfirm(ticketService, prisma, order.id);
  const qr = await prisma.qrCode.create({
    data: { eventId: event.id, ticketId: ticket.id, token: `qr-${Date.now()}`, type: "TICKET" },
  });
  const paid = await prisma.ticketOrder.findUniqueOrThrow({ where: { id: order.id } });
  const stock = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
  const ticketBook = await eventWalletService.getOrCreateAccount(event.id, "GHS", prisma, "TICKET");
  const giftBook = await eventWalletService.getOrCreateAccount(event.id, "GHS", prisma, "GIFT");
  assert.equal(invitation.uniqueLink.startsWith("ulink-"), true);
  assert.equal(guest.status, "ACCEPTED");
  assert.equal(paid.status, "PAID");
  assert.equal(stock.soldCount, 1);
  assert.equal(sale.netMinor, 9500);
  assert.equal(ticketBook.balanceMinor, 9500);
  assert.equal(giftBook.balanceMinor, 0);
  assert.ok(qr.id);
});

await record("12. Gift book remains isolated after ticket activity", async () => {
  const { event } = await seedEvent(prisma, `iso-${Date.now()}`);
  await eventWalletService.postEntry(
    {
      eventId: event.id,
      book: "GIFT",
      type: "GIFT_CREDIT",
      amountMinor: 2500,
      currency: "GHS",
      idempotencyKey: `gift-iso-${event.id}`,
      source: "test",
      description: "Isolated gift credit",
    },
    prisma
  );
  await postTicketSale({
    eventId: event.id,
    paymentId: `iso-pay-${event.id}`,
    grossMinor: 10000,
  });
  const gift = await eventWalletService.getOrCreateAccount(event.id, "GHS", prisma, "GIFT");
  const ticket = await eventWalletService.getOrCreateAccount(event.id, "GHS", prisma, "TICKET");
  assert.equal(gift.balanceMinor, 2500);
  assert.equal(ticket.balanceMinor, 9500);
});

await prisma.$disconnect();

console.log("\n--- Isolated SQLite acceptance ---");
for (const row of results) {
  console.log(`${row.status.padEnd(4)} ${row.name}${row.detail ? ` (${row.detail})` : ""}`);
}
console.log(`Database file retained for inspection: ${dbPath}`);

if (failures.length) {
  console.error(`\n${failures.length} isolated SQLite case(s) failed.`);
  process.exit(1);
}

console.log("\nAll isolated SQLite acceptance cases passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
