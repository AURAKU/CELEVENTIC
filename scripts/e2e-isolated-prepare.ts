#!/usr/bin/env tsx
/**
 * Prepare a disposable SQLite file for isolated Playwright.
 * Clones DDL from prisma/dev.db, copies lookup tables, seeds one host event.
 * Never opens prisma/production.db. Never overwrites prisma/dev.db.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

process.env.ADMISSION_PASS_SECRET ??= "test-admission-secret-do-not-use-in-production";
process.env.NEXTAUTH_SECRET ??= "e2e-isolated-nextauth-secret";

export const E2E_ISOLATED = {
  hostEmail: "e2e.host@example.test",
  hostPassword: "E2ePass!23456",
  hostName: "E2E Host",
  eventSlug: "e2e-phase1-event",
  eventTitle: "E2E Phase 1 Wedding",
  inviteLink: "e2e-phase1-invite",
  guestName: "E2E Guest",
  guestEmail: "e2e.guest@example.test",
  guestQr: "e2e-guest-qr",
  giftToken: "e2e-gift-token",
  memoryView: "e2e-memory-view",
  memoryUpload: "e2e-memory-upload",
  offlineDevice: "e2e-offline-device",
  ticketName: "General admission",
} as const;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "prisma", "dev.db");
const PRODUCTION = path.join(ROOT, "prisma", "production.db");
const DEST = path.join(ROOT, "prisma", "e2e-isolated.db");

function refuse(filePath: string) {
  if (path.resolve(filePath) === path.resolve(PRODUCTION)) {
    throw new Error("Refusing to touch prisma/production.db");
  }
}

function copyLookupTables() {
  const tables = ["event_packages", "event_package_features", "event_templates"];
  const copies = tables
    .map(
      (table) =>
        `INSERT OR IGNORE INTO main.${table} SELECT * FROM src.${table};`
    )
    .join("\n");
  execFileSync(
    "sqlite3",
    [DEST],
    {
      input: `ATTACH DATABASE '${SOURCE.replace(/'/g, "''")}' AS src;\n${copies}\nDETACH src;\n`,
      stdio: ["pipe", "pipe", "pipe"],
    }
  );
}

async function seedLifecycle(dbUrl: string) {
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  try {
    const passwordHash = await hashPassword(E2E_ISOLATED.hostPassword);
    const host = await prisma.user.create({
      data: {
        name: E2E_ISOLATED.hostName,
        email: E2E_ISOLATED.hostEmail,
        passwordHash,
        role: "ORGANIZER",
        status: "ACTIVE",
        accountType: "EVENT_OWNER",
        onboardingCompletedAt: new Date(),
      },
    });

    const event = await prisma.event.create({
      data: {
        slug: E2E_ISOLATED.eventSlug,
        title: E2E_ISOLATED.eventTitle,
        eventType: "WEDDING",
        hostName: "Ama and Kofi",
        startDate: new Date("2027-08-01T10:00:00.000Z"),
        organizerId: host.id,
        pricingType: "PAID",
        status: "PUBLISHED",
        isPublic: true,
      },
    });

    const invitation = await prisma.invitation.create({
      data: {
        eventId: event.id,
        name: "E2E invitation",
        slug: E2E_ISOLATED.inviteLink,
        uniqueLink: E2E_ISOLATED.inviteLink,
        status: "ACTIVE",
        message: "You are invited to the E2E celebration.",
      },
    });

    const guest = await prisma.guest.create({
      data: {
        eventId: event.id,
        invitationId: invitation.id,
        name: E2E_ISOLATED.guestName,
        email: E2E_ISOLATED.guestEmail,
        status: "INVITED",
        qrToken: E2E_ISOLATED.guestQr,
        plusOnes: 1,
      },
    });

    const ticket = await prisma.ticket.create({
      data: {
        eventId: event.id,
        name: E2E_ISOLATED.ticketName,
        type: "PAID",
        price: 50,
        currency: "GHS",
        quantity: 1,
        maxQuantity: 20,
        soldCount: 0,
        status: "PAID",
      },
    });

    await prisma.qrCode.create({
      data: {
        eventId: event.id,
        guestId: guest.id,
        token: E2E_ISOLATED.guestQr,
        type: "guest_admission",
      },
    });

    await prisma.eventGiftCampaign.create({
      data: {
        eventId: event.id,
        invitationId: invitation.id,
        createdById: host.id,
        publicToken: E2E_ISOLATED.giftToken,
        status: "ACTIVE",
        title: "Send a wedding gift",
        suggestedAmounts: [5000, 10000, 20000],
      },
    });

    await prisma.eventMemorySettings.create({
      data: { eventId: event.id, isEnabled: true, allowAnonymousUploads: true },
    });
    await prisma.eventMemoryToken.createMany({
      data: [
        { eventId: event.id, token: E2E_ISOLATED.memoryView, type: "VIEW" },
        { eventId: event.id, token: E2E_ISOLATED.memoryUpload, type: "UPLOAD" },
      ],
    });

    await prisma.offlineDevice.create({
      data: {
        eventId: event.id,
        userId: host.id,
        deviceName: "E2E scanner",
        deviceToken: E2E_ISOLATED.offlineDevice,
        isAuthorized: true,
        lastSyncAt: new Date(),
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
          idempotencyKey: "e2e-gift-credit",
          source: "e2e-isolated",
          description: "Isolated gift credit",
        },
        {
          accountId: ticketBook.id,
          eventId: event.id,
          type: "TICKET_GROSS_CREDIT",
          direction: "CREDIT",
          amountMinor: 10000,
          balanceAfterMinor: 10000,
          idempotencyKey: "e2e-ticket-gross",
          source: "e2e-isolated",
          description: "Isolated ticket gross",
        },
        {
          accountId: ticketBook.id,
          eventId: event.id,
          type: "TICKET_COMMISSION_DEBIT",
          direction: "DEBIT",
          amountMinor: -500,
          balanceAfterMinor: 9500,
          idempotencyKey: "e2e-ticket-fee",
          source: "e2e-isolated",
          description: "Isolated ticket commission",
        },
      ],
    });

    process.env.DATABASE_URL = dbUrl;
    const { ensureInvitationPass } = await import("../src/services/admission/guest-pass.service");
    const { eventWalletService } = await import("../src/services/gifts/event-wallet.service");
    const issued = await ensureInvitationPass(invitation.id);
    const giftReconcile = await eventWalletService.reconcile(event.id, "GIFT");
    const ticketReconcile = await eventWalletService.reconcile(event.id, "TICKET");
    if (giftReconcile.drifted || ticketReconcile.drifted) {
      throw new Error(
        `Isolated wallet drifted before tests: gift=${giftReconcile.drifted} ticket=${ticketReconcile.drifted}`
      );
    }

    const fixtureDir = path.join(ROOT, "e2e", "fixtures");
    fs.mkdirSync(fixtureDir, { recursive: true });
    const fixtures = {
      hostId: host.id,
      eventId: event.id,
      invitationId: invitation.id,
      guestId: guest.id,
      ticketId: ticket.id,
      inviteLink: E2E_ISOLATED.inviteLink,
      giftToken: E2E_ISOLATED.giftToken,
      memoryView: E2E_ISOLATED.memoryView,
      guestQr: E2E_ISOLATED.guestQr,
      admissionToken: issued?.token ?? null,
      admissionCode: issued?.pass.code ?? null,
      giftBalanceMinor: giftReconcile.ledgerBalanceMinor,
      ticketBalanceMinor: ticketReconcile.ledgerBalanceMinor,
      paymentMode: "mocked-provider",
      paystackSandbox: false,
    };
    fs.writeFileSync(path.join(fixtureDir, "phase1-isolated.json"), `${JSON.stringify(fixtures, null, 2)}\n`);
    console.log(JSON.stringify(fixtures));
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  refuse(SOURCE);
  refuse(DEST);
  if (!fs.existsSync(SOURCE)) {
    throw new Error("prisma/dev.db is missing; cannot clone schema for isolated e2e");
  }
  for (const extra of [`${DEST}-wal`, `${DEST}-shm`, `${DEST}-journal`]) {
    if (fs.existsSync(extra)) fs.rmSync(extra);
  }
  if (fs.existsSync(DEST)) fs.rmSync(DEST);

  const schema = execFileSync("sqlite3", [SOURCE, ".schema"], { encoding: "utf8" });
  execFileSync("sqlite3", [DEST], { input: schema, stdio: ["pipe", "pipe", "pipe"] });
  execFileSync("sqlite3", [DEST, "PRAGMA journal_mode=WAL;"], { stdio: ["ignore", "pipe", "pipe"] });
  execFileSync("sqlite3", [DEST, "PRAGMA busy_timeout=5000;"], { stdio: ["ignore", "pipe", "pipe"] });
  execFileSync("sqlite3", [DEST, "PRAGMA foreign_keys=ON;"], { stdio: ["ignore", "pipe", "pipe"] });
  copyLookupTables();
  const dbUrl = `file:${DEST}`;
  process.env.DATABASE_URL = dbUrl;
  await seedLifecycle(dbUrl);
  console.log(`Isolated e2e database ready: ${DEST}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
