#!/usr/bin/env tsx
/**
 * Apply the Aug 2026 SQLite migrations against disposable databases.
 * Never touches prisma/production.db.
 *
 * Strategy:
 * 1) Push the pre-Aug-1 schema (git ce144c0) as a baseline
 * 2) Mark older migration folders as already applied
 * 3) Run prisma migrate deploy for 20260801010000…40000
 * 4) Also simulate the production partial thank-you failure + recovery path
 */

import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const ROOT = process.cwd();
const MIGRATIONS = path.join(ROOT, "prisma", "migrations");
const BASELINE_COMMIT = "ce144c0";
const NEW_MIGRATIONS = [
  "20260801010000_event_gift_withdrawals",
  "20260801020000_event_qr_hub",
  "20260801030000_thank_you_premium",
  "20260801040000_event_seating_companion_holds",
];

function dbUrl(dbPath: string): string {
  // Absolute file URLs avoid Prisma resolving against prisma/schema dir.
  return `file:${path.resolve(dbPath)}`;
}

function sh(cmd: string, args: string[], env?: NodeJS.ProcessEnv) {
  execFileSync(cmd, args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function sqlite(dbPath: string, sql: string): string {
  return execFileSync("sqlite3", [dbPath, sql], { encoding: "utf8" }).trim();
}

function sqliteScript(dbPath: string, sqlFile: string) {
  execFileSync("sqlite3", [dbPath], {
    input: fs.readFileSync(sqlFile),
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function sqliteExec(dbPath: string, sql: string) {
  execFileSync("sqlite3", [dbPath], {
    input: sql,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function tableColumns(dbPath: string, table: string): Set<string> {
  const out = sqlite(dbPath, `PRAGMA table_info("${table}");`);
  const cols = new Set<string>();
  for (const line of out.split("\n")) {
    if (!line.trim()) continue;
    const parts = line.split("|");
    if (parts[1]) cols.add(parts[1]);
  }
  return cols;
}

function count(dbPath: string, table: string): number {
  return Number(sqlite(dbPath, `SELECT COUNT(*) FROM "${table}";`));
}

function tableExists(dbPath: string, table: string): boolean {
  const out = sqlite(
    dbPath,
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${table.replace(/'/g, "''")}';`
  );
  return Boolean(out);
}

function assertIntegrity(dbPath: string) {
  assert.equal(sqlite(dbPath, "PRAGMA integrity_check;"), "ok");
  assert.equal(sqlite(dbPath, "PRAGMA foreign_key_check;"), "");
}

function listMigrationDirs(): string[] {
  return fs
    .readdirSync(MIGRATIONS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function createBaselineDb(dbPath: string, workDir: string) {
  const schemaPath = path.join(workDir, "schema.baseline.prisma");
  const baselineSchema = execFileSync("git", ["show", `${BASELINE_COMMIT}:prisma/schema.prisma`], {
    cwd: ROOT,
    encoding: "utf8",
  });
  fs.writeFileSync(schemaPath, baselineSchema);
  // Keep datasource URL override via env; schema file still has provider sqlite.
  sh(
    "npx",
    ["prisma", "db", "push", "--schema", schemaPath, "--accept-data-loss", "--skip-generate"],
    { DATABASE_URL: dbUrl(dbPath) }
  );

  // Ensure _prisma_migrations exists and older migrations are marked applied.
  sqliteExec(
    dbPath,
    `CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    );`
  );

  for (const name of listMigrationDirs()) {
    if (NEW_MIGRATIONS.includes(name)) continue;
    sqliteExec(
      dbPath,
      `INSERT INTO "_prisma_migrations"
        (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
       VALUES (
         'baseline_${name}',
         'baseline',
         CURRENT_TIMESTAMP,
         '${name}',
         NULL,
         NULL,
         CURRENT_TIMESTAMP,
         1
       );`
    );
  }
}

function verifyFinalSchema(dbPath: string) {
  for (const table of [
    "thank_you_pages",
    "invitation_guest_wishes",
    "event_wallet_withdrawal_requests",
    "event_qr_links",
    "shared_event_access_passes",
    "seating_companion_holds",
    "seating_party_plans",
    "seating_assignments",
  ]) {
    assert.ok(tableExists(dbPath, table), `missing table ${table}`);
  }

  const thankYou = tableColumns(dbPath, "thank_you_pages");
  for (const col of ["eyebrow", "themeSource", "designConfig", "version", "archivedAt"]) {
    assert.ok(thankYou.has(col), `thank_you_pages missing ${col}`);
  }

  const wishes = tableColumns(dbPath, "invitation_guest_wishes");
  for (const col of ["title", "status", "source", "updatedAt", "isPinned"]) {
    assert.ok(wishes.has(col), `invitation_guest_wishes missing ${col}`);
  }

  assert.ok(tableColumns(dbPath, "seating_assignments").has("locked"));
  assertIntegrity(dbPath);
}

function seedWish(dbPath: string, id: string) {
  const userId = sqlite(dbPath, "SELECT id FROM users LIMIT 1;");
  if (!userId) {
    sqliteExec(
      dbPath,
      `INSERT INTO users (id, email, name, role, createdAt, updatedAt)
       VALUES ('user_migrate_test', 'migrate-test@celeventic.local', 'Migrate Test', 'ORGANIZER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`
    );
  }
  const organizerId = sqlite(dbPath, "SELECT id FROM users LIMIT 1;");
  assert.ok(organizerId, "need a user to seed events");

  const eventId = sqlite(dbPath, "SELECT id FROM events LIMIT 1;");
  if (!eventId) {
    sqliteExec(
      dbPath,
      `INSERT INTO events (id, slug, title, eventType, hostName, startDate, pricingType, status, organizerId, createdAt, updatedAt)
       VALUES (
         'evt_migrate_test',
         'migrate-test',
         'Migrate Test',
         'WEDDING',
         'Host',
         CURRENT_TIMESTAMP,
         'FREE',
         'DRAFT',
         '${organizerId.replace(/'/g, "''")}',
         CURRENT_TIMESTAMP,
         CURRENT_TIMESTAMP
       );`
    );
  }
  const resolvedEventId = sqlite(dbPath, "SELECT id FROM events LIMIT 1;");
  assert.ok(resolvedEventId, "need at least one event to seed wishes");
  sqliteExec(
    dbPath,
    `INSERT INTO invitation_guest_wishes
      (id, eventId, authorName, message, isVisible, createdAt)
     VALUES ('${id}', '${resolvedEventId.replace(/'/g, "''")}', 'Ama', 'Congrats', 1, CURRENT_TIMESTAMP);`
  );
}

function applyPartialColumnsOnly(dbPath: string) {
  sqliteExec(
    dbPath,
    `
      ALTER TABLE "thank_you_pages" ADD COLUMN "eyebrow" TEXT;
      ALTER TABLE "thank_you_pages" ADD COLUMN "subtitle" TEXT;
      ALTER TABLE "thank_you_pages" ADD COLUMN "closingMessage" TEXT;
      ALTER TABLE "thank_you_pages" ADD COLUMN "signatureLine" TEXT;
      ALTER TABLE "thank_you_pages" ADD COLUMN "hostNames" TEXT;
      ALTER TABLE "thank_you_pages" ADD COLUMN "eventHashtag" TEXT;
      ALTER TABLE "thank_you_pages" ADD COLUMN "footerText" TEXT;
      ALTER TABLE "thank_you_pages" ADD COLUMN "heroImageUrl" TEXT;
      ALTER TABLE "thank_you_pages" ADD COLUMN "backgroundImageUrl" TEXT;
      ALTER TABLE "thank_you_pages" ADD COLUMN "backgroundVideoUrl" TEXT;
      ALTER TABLE "thank_you_pages" ADD COLUMN "signatureImageUrl" TEXT;
      ALTER TABLE "thank_you_pages" ADD COLUMN "themeSource" TEXT NOT NULL DEFAULT 'INVITATION';
      ALTER TABLE "thank_you_pages" ADD COLUMN "designConfig" JSON;
      ALTER TABLE "thank_you_pages" ADD COLUMN "sectionConfig" JSON;
      ALTER TABLE "thank_you_pages" ADD COLUMN "guestbookConfig" JSON;
      ALTER TABLE "thank_you_pages" ADD COLUMN "sharingConfig" JSON;
      ALTER TABLE "thank_you_pages" ADD COLUMN "seoConfig" JSON;
      ALTER TABLE "thank_you_pages" ADD COLUMN "featuredMemoryIds" JSON;
      ALTER TABLE "thank_you_pages" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE "thank_you_pages" ADD COLUMN "lastPublishedSnapshot" JSON;
      ALTER TABLE "thank_you_pages" ADD COLUMN "updatedById" TEXT;
      ALTER TABLE "thank_you_pages" ADD COLUMN "scheduledPublishAt" DATETIME;
      ALTER TABLE "thank_you_pages" ADD COLUMN "archivedAt" DATETIME;

      ALTER TABLE "invitation_guest_wishes" ADD COLUMN "title" TEXT;
      ALTER TABLE "invitation_guest_wishes" ADD COLUMN "avatarUrl" TEXT;
      ALTER TABLE "invitation_guest_wishes" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'APPROVED';
      ALTER TABLE "invitation_guest_wishes" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'INVITATION';
      ALTER TABLE "invitation_guest_wishes" ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT 0;
      ALTER TABLE "invitation_guest_wishes" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT 0;
      ALTER TABLE "invitation_guest_wishes" ADD COLUMN "isAnonymous" BOOLEAN NOT NULL DEFAULT 0;
      ALTER TABLE "invitation_guest_wishes" ADD COLUMN "editedAt" DATETIME;
      ALTER TABLE "invitation_guest_wishes" ADD COLUMN "moderatedAt" DATETIME;
      ALTER TABLE "invitation_guest_wishes" ADD COLUMN "moderatedById" TEXT;
      ALTER TABLE "invitation_guest_wishes" ADD COLUMN "moderationReason" TEXT;
    `
  );

  sqliteExec(
    dbPath,
    `INSERT INTO _prisma_migrations
      (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
     VALUES ('mig_fail_${Date.now()}', 'partial-failed', NULL, '20260801030000_thank_you_premium',
             'Cannot add a column with non-constant default', NULL, CURRENT_TIMESTAMP, 0);`
  );
}

function recoverPartial(dbPath: string) {
  const beforeWishes = count(dbPath, "invitation_guest_wishes");
  const beforeThankYou = count(dbPath, "thank_you_pages");

  sh(
    "npx",
    ["prisma", "migrate", "resolve", "--rolled-back", "20260801030000_thank_you_premium"],
    { DATABASE_URL: dbUrl(dbPath) }
  );

  assert.ok(!tableColumns(dbPath, "invitation_guest_wishes").has("updatedAt"));
  sqliteScript(dbPath, path.join(ROOT, "scripts/sql/recover-thank-you-premium-partial.sql"));

  assert.equal(count(dbPath, "invitation_guest_wishes"), beforeWishes);
  assert.equal(count(dbPath, "thank_you_pages"), beforeThankYou);
  assert.ok(tableColumns(dbPath, "invitation_guest_wishes").has("updatedAt"));
  assertIntegrity(dbPath);

  sh(
    "npx",
    ["prisma", "migrate", "resolve", "--applied", "20260801030000_thank_you_premium"],
    { DATABASE_URL: dbUrl(dbPath) }
  );
  sh("npx", ["prisma", "migrate", "deploy"], { DATABASE_URL: dbUrl(dbPath) });
}

function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "celeventic-migrate-"));
  const cleanDb = path.join(tmp, "clean.db");
  const partialDb = path.join(tmp, "partial.db");

  console.log("1) Validator");
  sh("npx", ["tsx", "scripts/validate-sqlite-migrations.ts"]);

  console.log("2) Clean baseline + migrate deploy");
  createBaselineDb(cleanDb, tmp);
  seedWish(cleanDb, `wish_clean_${Date.now()}`);
  const cleanWishBefore = count(cleanDb, "invitation_guest_wishes");
  sh("npx", ["prisma", "migrate", "deploy"], { DATABASE_URL: dbUrl(cleanDb) });
  sh("npx", ["prisma", "generate"]);
  assert.equal(count(cleanDb, "invitation_guest_wishes"), cleanWishBefore);
  verifyFinalSchema(cleanDb);
  console.log("   clean OK");

  console.log("3) Partial thank-you failure recovery");
  createBaselineDb(partialDb, tmp);
  seedWish(partialDb, `wish_partial_${Date.now()}`);
  // gifts + qr only — move later migrations fully outside prisma/migrations
  const thankYouDir = path.join(MIGRATIONS, "20260801030000_thank_you_premium");
  const seatingDir = path.join(MIGRATIONS, "20260801040000_event_seating_companion_holds");
  const thankYouOff = path.join(tmp, "20260801030000_thank_you_premium");
  const seatingOff = path.join(tmp, "20260801040000_event_seating_companion_holds");
  fs.renameSync(thankYouDir, thankYouOff);
  fs.renameSync(seatingDir, seatingOff);
  try {
    sh("npx", ["prisma", "migrate", "deploy"], { DATABASE_URL: dbUrl(partialDb) });
  } finally {
    fs.renameSync(thankYouOff, thankYouDir);
    fs.renameSync(seatingOff, seatingDir);
  }
  applyPartialColumnsOnly(partialDb);
  assert.ok(!tableColumns(partialDb, "invitation_guest_wishes").has("updatedAt"));
  recoverPartial(partialDb);
  verifyFinalSchema(partialDb);
  console.log("   partial recovery OK");

  const prodCopy = process.env.CELEVENTIC_PROD_DB_COPY;
  if (prodCopy && fs.existsSync(prodCopy)) {
    console.log("4) Production-copy migration");
    const copyTarget = path.join(tmp, "production-copy.db");
    execSync(`sqlite3 "${prodCopy}" ".backup '${copyTarget}'"`);
    const before: Record<string, number> = {};
    for (const table of [
      "events",
      "guests",
      "invitations",
      "thank_you_pages",
      "invitation_guest_wishes",
      "seating_plans",
      "seating_assignments",
      "event_wallet_accounts",
      "event_gift_transactions",
    ]) {
      if (tableExists(copyTarget, table)) before[table] = count(copyTarget, table);
    }

    const thankYouCols = tableColumns(copyTarget, "thank_you_pages");
    const wishCols = tableColumns(copyTarget, "invitation_guest_wishes");
    const partial = thankYouCols.has("eyebrow") && !wishCols.has("updatedAt");
    const failed = sqlite(
      copyTarget,
      `SELECT migration_name FROM _prisma_migrations
       WHERE migration_name='20260801030000_thank_you_premium'
         AND finished_at IS NULL AND rolled_back_at IS NULL;`
    );
    if (failed) {
      sh(
        "npx",
        ["prisma", "migrate", "resolve", "--rolled-back", "20260801030000_thank_you_premium"],
        { DATABASE_URL: dbUrl(copyTarget) }
      );
    }
    if (partial) {
      const beforeWishes = count(copyTarget, "invitation_guest_wishes");
      sqliteScript(copyTarget, path.join(ROOT, "scripts/sql/recover-thank-you-premium-partial.sql"));
      assert.equal(count(copyTarget, "invitation_guest_wishes"), beforeWishes);
      sh(
        "npx",
        ["prisma", "migrate", "resolve", "--applied", "20260801030000_thank_you_premium"],
        { DATABASE_URL: dbUrl(copyTarget) }
      );
      sh("npx", ["prisma", "migrate", "deploy"], { DATABASE_URL: dbUrl(copyTarget) });
    } else {
      sh("npx", ["prisma", "migrate", "deploy"], { DATABASE_URL: dbUrl(copyTarget) });
    }
    verifyFinalSchema(copyTarget);
    console.log("   Row counts before → after:");
    for (const [table, beforeCount] of Object.entries(before)) {
      const afterCount = count(copyTarget, table);
      console.log(`   - ${table}: ${beforeCount} → ${afterCount}`);
      assert.equal(afterCount, beforeCount);
    }
  } else {
    console.log("4) Skipping production-copy test (set CELEVENTIC_PROD_DB_COPY=/path/to/copy.db)");
  }

  console.log("\nAll SQLite migration tests passed.");
  console.log(`Artifacts: ${tmp}`);
}

main();
