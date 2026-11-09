#!/usr/bin/env tsx
/**
 * Populated disposable SQLite restore drill.
 *
 * Never opens prisma/production.db. Never overwrites prisma/dev.db.
 * Seeds a throwaway staging file, backs it up, restores it, then reconnects
 * a Prisma client to the restored copy to read events, ticket inventory, and
 * wallet ledger totals.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_SCHEMA_DB = path.join(ROOT, "prisma", "dev.db");
const PRODUCTION_DB = path.join(ROOT, "prisma", "production.db");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "celeventic-v23-restore-"));
const stagingPath = path.join(workDir, "staging.db");
const backupPath = path.join(workDir, "backup.db");
const restoredPath = path.join(workDir, "restored.db");
const reportPath = path.join(workDir, "report.txt");
const started = Date.now();

function log(line: string) {
  fs.appendFileSync(reportPath, `${line}\n`);
  console.log(line);
}

function refuseProduction(filePath: string) {
  if (path.resolve(filePath) === path.resolve(PRODUCTION_DB)) {
    throw new Error("Refusing to touch prisma/production.db");
  }
}

function cloneAppliedSchema(dest: string) {
  if (!fs.existsSync(SOURCE_SCHEMA_DB)) {
    throw new Error("prisma/dev.db is missing; cannot clone applied DDL");
  }
  refuseProduction(SOURCE_SCHEMA_DB);
  const schema = execFileSync("sqlite3", [SOURCE_SCHEMA_DB, ".schema"], { encoding: "utf8" });
  execFileSync("sqlite3", [dest], { input: schema, stdio: ["pipe", "pipe", "pipe"] });
  execFileSync("sqlite3", [dest, "PRAGMA journal_mode=WAL;"], { stdio: ["ignore", "pipe", "pipe"] });
  execFileSync("sqlite3", [dest, "PRAGMA busy_timeout=5000;"], { stdio: ["ignore", "pipe", "pipe"] });
  execFileSync("sqlite3", [dest, "PRAGMA foreign_keys=ON;"], { stdio: ["ignore", "pipe", "pipe"] });
}

function fileMode(filePath: string): string {
  return (fs.statSync(filePath).mode & 0o777).toString(8);
}

async function seedPopulated(dbUrl: string) {
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  try {
    const user = await prisma.user.create({
      data: {
        name: "Restore Drill Organizer",
        email: `restore-drill-${stamp}@example.test`,
      },
    });
    const event = await prisma.event.create({
      data: {
        slug: `restore-drill-${stamp.slice(0, 12)}`,
        title: "Restore Drill Wedding",
        eventType: "WEDDING",
        hostName: "Restore Host",
        startDate: new Date("2027-08-01T10:00:00.000Z"),
        organizerId: user.id,
        pricingType: "PAID",
        status: "PUBLISHED",
        isPublic: false,
      },
    });
    const ticket = await prisma.ticket.create({
      data: {
        eventId: event.id,
        name: "General",
        type: "PAID",
        price: 100,
        currency: "GHS",
        maxQuantity: 40,
        soldCount: 3,
        status: "PAID",
      },
    });
    const giftBook = await prisma.eventWalletAccount.create({
      data: {
        eventId: event.id,
        book: "GIFT",
        currency: "GHS",
        balanceMinor: 2500,
        availableMinor: 2500,
        lifetimeGiftMinor: 2500,
        giftCount: 1,
      },
    });
    const ticketBook = await prisma.eventWalletAccount.create({
      data: {
        eventId: event.id,
        book: "TICKET",
        currency: "GHS",
        balanceMinor: 9500,
        availableMinor: 9500,
        lifetimeTicketGrossMinor: 10000,
        lifetimeTicketCommissionMinor: 500,
        ticketSaleCount: 1,
      },
    });
    await prisma.eventWalletLedgerEntry.createMany({
      data: [
        {
          accountId: giftBook.id,
          eventId: event.id,
          type: "GIFT_CREDIT",
          direction: "CREDIT",
          amountMinor: 2500,
          balanceAfterMinor: 2500,
          idempotencyKey: `restore-gift-${stamp}`,
          source: "restore-drill",
          description: "Synthetic gift credit",
        },
        {
          accountId: ticketBook.id,
          eventId: event.id,
          type: "TICKET_GROSS_CREDIT",
          direction: "CREDIT",
          amountMinor: 10000,
          balanceAfterMinor: 10000,
          idempotencyKey: `restore-ticket-gross-${stamp}`,
          source: "restore-drill",
          description: "Synthetic ticket gross",
        },
        {
          accountId: ticketBook.id,
          eventId: event.id,
          type: "TICKET_COMMISSION_DEBIT",
          direction: "DEBIT",
          amountMinor: -500,
          balanceAfterMinor: 9500,
          idempotencyKey: `restore-ticket-fee-${stamp}`,
          source: "restore-drill",
          description: "Synthetic ticket commission",
        },
      ],
    });
    return { eventId: event.id, ticketId: ticket.id, giftBookId: giftBook.id, ticketBookId: ticketBook.id };
  } finally {
    await prisma.$disconnect();
  }
}

async function reconnectAndAssert(dbUrl: string, expected: { eventId: string; ticketId: string }) {
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  try {
    const event = await prisma.event.findUniqueOrThrow({ where: { id: expected.eventId } });
    const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: expected.ticketId } });
    const ledgerSum = await prisma.eventWalletLedgerEntry.aggregate({ _sum: { amountMinor: true } });
    const books = await prisma.eventWalletAccount.findMany({ where: { eventId: event.id } });
    assert.equal(event.title, "Restore Drill Wedding");
    assert.equal(ticket.soldCount, 3);
    assert.equal(ticket.maxQuantity, 40);
    assert.equal(ledgerSum._sum.amountMinor, 12000);
    const gift = books.find((row) => row.book === "GIFT");
    const ticketBook = books.find((row) => row.book === "TICKET");
    assert.equal(gift?.balanceMinor, 2500);
    assert.equal(ticketBook?.balanceMinor, 9500);
    return {
      eventTitle: event.title,
      soldCount: ticket.soldCount,
      ledgerSum: ledgerSum._sum.amountMinor,
      giftBalance: gift?.balanceMinor,
      ticketBalance: ticketBook?.balanceMinor,
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  log(`Populated restore drill ${stamp}`);
  log(`Work directory: ${workDir}`);
  refuseProduction(stagingPath);
  refuseProduction(backupPath);
  refuseProduction(restoredPath);

  const cloneStart = Date.now();
  cloneAppliedSchema(stagingPath);
  const ids = await seedPopulated(`file:${stagingPath}`);
  log(`Seeded staging event ${ids.eventId} in ${Date.now() - cloneStart}ms`);

  fs.copyFileSync(stagingPath, backupPath);
  const integrity = execFileSync("sqlite3", [backupPath, "PRAGMA integrity_check;"], {
    encoding: "utf8",
  }).trim();
  log(`Backup integrity_check: ${integrity}`);
  assert.equal(integrity, "ok");

  const restoreStart = Date.now();
  fs.copyFileSync(backupPath, restoredPath);
  const restoreMs = Date.now() - restoreStart;
  log(`Restoration duration (ms): ${restoreMs}`);

  const restoredIntegrity = execFileSync("sqlite3", [restoredPath, "PRAGMA integrity_check;"], {
    encoding: "utf8",
  }).trim();
  log(`Restored integrity_check: ${restoredIntegrity}`);
  assert.equal(restoredIntegrity, "ok");

  const reconnected = await reconnectAndAssert(`file:${restoredPath}`, ids);
  log(`Reconnected event title: ${reconnected.eventTitle}`);
  log(`Ticket soldCount: ${reconnected.soldCount}`);
  log(`Ledger amountMinor sum: ${reconnected.ledgerSum}`);
  log(`Gift book balance: ${reconnected.giftBalance}`);
  log(`Ticket book balance: ${reconnected.ticketBalance}`);
  log(`Backup mode: ${fileMode(backupPath)} restored mode: ${fileMode(restoredPath)}`);
  log(`Source prisma/dev.db untouched: yes`);
  log(`Production files touched: none`);
  log(`Total drill duration (ms): ${Date.now() - started}`);
  log("Result: PASS");
  log(workDir);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
