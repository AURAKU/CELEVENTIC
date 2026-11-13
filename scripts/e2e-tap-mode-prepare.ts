#!/usr/bin/env tsx
/**
 * Disposable SQLite for CeleYou Tap Mode Playwright.
 * Never opens prisma/production.db. Never overwrites prisma/dev.db.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

export const E2E_TAP = {
  password: "TapPass!23456",
  userA: { email: "e2e.tap.a@example.test", name: "Kojo Tap" },
  userB: { email: "e2e.tap.b@example.test", name: "Ama Tap" },
  userDeact: { email: "e2e.tap.deact@example.test", name: "Deact Tap" },
  userExpired: { email: "e2e.tap.expired@example.test", name: "Expired Tap" },
  userSuspended: { email: "e2e.tap.suspended@example.test", name: "Suspended Tap" },
  userNoConnect: { email: "e2e.tap.noconnect@example.test", name: "No Connect Tap" },
  slugA: "e2e-tap-kojo",
  slugB: "e2e-tap-ama",
  slugDeact: "e2e-tap-deact",
  slugExpired: "e2e-tap-expired",
  slugSuspended: "e2e-tap-suspended",
  slugNoConnect: "e2e-tap-noconnect",
  publicEmailA: "kojo.public@example.test",
  secretEmailA: "kojo.secret@example.test",
  publicPhoneA: "+233241111111",
  publicEmailB: "ama.public@example.test",
} as const;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "prisma", "dev.db");
const PRODUCTION = path.join(ROOT, "prisma", "production.db");
const DEST = path.join(ROOT, "prisma", "e2e-tap.db");

function refuse(filePath: string) {
  if (path.resolve(filePath) === path.resolve(PRODUCTION)) {
    throw new Error("Refusing to touch prisma/production.db");
  }
}

function sqlite(db: string, sql: string) {
  execFileSync("sqlite3", [db], { input: sql, stdio: ["pipe", "pipe", "pipe"] });
}

function ensurePairingColumns(db: string) {
  const info = execFileSync("sqlite3", [db, "PRAGMA table_info(celeyou_proximity_sessions);"], {
    encoding: "utf8",
  });
  if (!info.includes("pairingToken")) {
    sqlite(db, `ALTER TABLE celeyou_proximity_sessions ADD COLUMN pairingToken TEXT;`);
  }
  if (!info.includes("pairingTokenHash")) {
    sqlite(db, `ALTER TABLE celeyou_proximity_sessions ADD COLUMN pairingTokenHash TEXT;`);
  }
  sqlite(
    db,
    `CREATE UNIQUE INDEX IF NOT EXISTS celeyou_proximity_sessions_pairingTokenHash_key ON celeyou_proximity_sessions(pairingTokenHash);`
  );
}

async function seed(dbUrl: string) {
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  try {
    const passwordHash = await hashPassword(E2E_TAP.password);
    async function user(email: string, name: string) {
      return prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: "ORGANIZER",
          status: "ACTIVE",
          accountType: "EVENT_OWNER",
          onboardingCompletedAt: new Date(),
        },
      });
    }

    const a = await user(E2E_TAP.userA.email, E2E_TAP.userA.name);
    const b = await user(E2E_TAP.userB.email, E2E_TAP.userB.name);
    const deact = await user(E2E_TAP.userDeact.email, E2E_TAP.userDeact.name);
    const expired = await user(E2E_TAP.userExpired.email, E2E_TAP.userExpired.name);
    const suspended = await user(E2E_TAP.userSuspended.email, E2E_TAP.userSuspended.name);
    const noconnect = await user(E2E_TAP.userNoConnect.email, E2E_TAP.userNoConnect.name);

    const paidUntil = new Date(Date.now() + 40 * 24 * 60 * 60 * 1000);
    const cardA = await prisma.digitalBusinessCard.create({
      data: {
        userId: a.id,
        slug: E2E_TAP.slugA,
        displayName: E2E_TAP.userA.name,
        title: "Product Lead",
        company: "Tap House",
        email: E2E_TAP.publicEmailA,
        phone: E2E_TAP.publicPhoneA,
        website: "https://www.celeventic.com",
        isPublished: true,
        subscriptionStatus: "ACTIVE",
        subscriptionExpiresAt: paidUntil,
        lastActivatedAt: new Date(),
        connectBackEnabled: true,
        proximityDiscoverable: true,
        socials: {
          emails: [E2E_TAP.publicEmailA, E2E_TAP.secretEmailA],
          emailTags: ["business", "personal"],
          phones: [E2E_TAP.publicPhoneA],
          reachVisibility: { "email-1": "CODE_PROTECTED" },
        },
      },
    });
    const cardB = await prisma.digitalBusinessCard.create({
      data: {
        userId: b.id,
        slug: E2E_TAP.slugB,
        displayName: E2E_TAP.userB.name,
        title: "Designer",
        company: "Ama Studio",
        email: E2E_TAP.publicEmailB,
        isPublished: true,
        subscriptionStatus: "TRIAL",
        connectBackEnabled: true,
        proximityDiscoverable: true,
        socials: { emails: [E2E_TAP.publicEmailB], emailTags: ["business"] },
      },
    });
    const cardDeact = await prisma.digitalBusinessCard.create({
      data: {
        userId: deact.id,
        slug: E2E_TAP.slugDeact,
        displayName: E2E_TAP.userDeact.name,
        isPublished: true,
        subscriptionStatus: "ACTIVE",
        subscriptionExpiresAt: paidUntil,
        lastActivatedAt: new Date(),
        connectBackEnabled: true,
        proximityDiscoverable: true,
      },
    });
    await prisma.digitalBusinessCard.create({
      data: {
        userId: expired.id,
        slug: E2E_TAP.slugExpired,
        displayName: E2E_TAP.userExpired.name,
        isPublished: true,
        subscriptionStatus: "EXPIRED",
        subscriptionExpiresAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        connectBackEnabled: true,
        proximityDiscoverable: true,
      },
    });
    await prisma.digitalBusinessCard.create({
      data: {
        userId: suspended.id,
        slug: E2E_TAP.slugSuspended,
        displayName: E2E_TAP.userSuspended.name,
        isPublished: true,
        subscriptionStatus: "ACTIVE",
        subscriptionExpiresAt: paidUntil,
        adminSuspendedAt: new Date(),
        connectBackEnabled: true,
        proximityDiscoverable: true,
      },
    });
    await prisma.digitalBusinessCard.create({
      data: {
        userId: noconnect.id,
        slug: E2E_TAP.slugNoConnect,
        displayName: E2E_TAP.userNoConnect.name,
        isPublished: true,
        subscriptionStatus: "ACTIVE",
        subscriptionExpiresAt: paidUntil,
        lastActivatedAt: new Date(),
        connectBackEnabled: false,
        proximityDiscoverable: true,
      },
    });

    const fixtureDir = path.join(ROOT, "e2e", "fixtures");
    fs.mkdirSync(fixtureDir, { recursive: true });
    const fixtures = {
      password: E2E_TAP.password,
      userA: { id: a.id, email: E2E_TAP.userA.email, cardId: cardA.id, slug: E2E_TAP.slugA, name: E2E_TAP.userA.name },
      userB: { id: b.id, email: E2E_TAP.userB.email, cardId: cardB.id, slug: E2E_TAP.slugB, name: E2E_TAP.userB.name },
      userDeact: {
        id: deact.id,
        email: E2E_TAP.userDeact.email,
        cardId: cardDeact.id,
        slug: E2E_TAP.slugDeact,
      },
      slugExpired: E2E_TAP.slugExpired,
      slugSuspended: E2E_TAP.slugSuspended,
      slugNoConnect: E2E_TAP.slugNoConnect,
      publicEmailA: E2E_TAP.publicEmailA,
      secretEmailA: E2E_TAP.secretEmailA,
      db: DEST,
    };
    fs.writeFileSync(path.join(fixtureDir, "celeyou-tap-mode.json"), `${JSON.stringify(fixtures, null, 2)}\n`);
    console.log(JSON.stringify({ ok: true, db: DEST, slugA: cardA.slug, slugB: cardB.slug }));
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  refuse(SOURCE);
  refuse(DEST);
  if (!fs.existsSync(SOURCE)) {
    throw new Error("prisma/dev.db is missing; cannot clone schema for Tap Mode e2e");
  }
  for (const extra of [`${DEST}-wal`, `${DEST}-shm`, `${DEST}-journal`]) {
    if (fs.existsSync(extra)) fs.rmSync(extra);
  }
  if (fs.existsSync(DEST)) fs.rmSync(DEST);
  const schema = execFileSync("sqlite3", [SOURCE, ".schema"], { encoding: "utf8" });
  sqlite(DEST, schema);
  sqlite(DEST, "PRAGMA journal_mode=WAL;");
  sqlite(DEST, "PRAGMA busy_timeout=5000;");
  sqlite(DEST, "PRAGMA foreign_keys=ON;");
  ensurePairingColumns(DEST);
  const dbUrl = `file:${DEST}`;
  process.env.DATABASE_URL = dbUrl;
  await seed(dbUrl);
  console.log(`Tap Mode e2e database ready: ${DEST}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
