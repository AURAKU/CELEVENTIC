/**
 * Duplicate-safe additive columns for CeleYou on SQLite.
 * Never overwrites production.db. Never drops columns.
 *
 *   npx tsx scripts/sql/apply-celeyou-sqlite.ts prisma/production.db
 *   npx tsx scripts/sql/apply-celeyou-sqlite.ts prisma/dev.db
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const dbPath = path.resolve(
  process.argv[2] ||
    (process.env.DATABASE_URL || "").replace(/^file:/, "") ||
    "prisma/dev.db"
);

if (!existsSync(dbPath)) {
  console.error(`[celeyou-sqlite] missing database: ${dbPath}`);
  process.exit(1);
}

function sql(statement: string): string {
  return execFileSync("sqlite3", [dbPath, statement], { encoding: "utf8" }).trim();
}

function hasColumn(table: string, column: string): boolean {
  const count = sql(
    `SELECT COUNT(*) FROM pragma_table_info('${table}') WHERE name='${column}'`
  );
  return count !== "0";
}

function addColumn(table: string, column: string, spec: string) {
  if (hasColumn(table, column)) {
    console.log(`[celeyou-sqlite] skip ${table}.${column}`);
    return;
  }
  sql(`ALTER TABLE ${table} ADD COLUMN ${column} ${spec}`);
  console.log(`[celeyou-sqlite] add ${table}.${column}`);
}

const cardColumns: Array<[string, string]> = [
  ["adminSuspendedAt", "DATETIME"],
  ["adminDeactivatedAt", "DATETIME"],
  ["entitlementKind", "TEXT"],
  ["deletedAt", "DATETIME"],
  ["lastActivatedAt", "DATETIME"],
  ["lastActivationPaymentId", "TEXT"],
  ["publishedDesignVersionId", "TEXT"],
  ["lastCourtesyAt", "DATETIME"],
  ["unclaimedEmail", "TEXT"],
  ["unclaimedPhone", "TEXT"],
  ["claimedAt", "DATETIME"],
];

for (const [column, spec] of cardColumns) {
  addColumn("digital_business_cards", column, spec);
}

function addIndex(name: string, statement: string) {
  sql(statement);
  console.log(`[celeyou-sqlite] index ${name}`);
}

addIndex(
  "digital_business_cards_deletedAt_idx",
  `CREATE INDEX IF NOT EXISTS "digital_business_cards_deletedAt_idx" ON "digital_business_cards" ("deletedAt")`
);
addIndex(
  "digital_business_cards_adminSuspendedAt_idx",
  `CREATE INDEX IF NOT EXISTS "digital_business_cards_adminSuspendedAt_idx" ON "digital_business_cards"("adminSuspendedAt")`
);
addIndex(
  "digital_business_cards_adminDeactivatedAt_idx",
  `CREATE INDEX IF NOT EXISTS "digital_business_cards_adminDeactivatedAt_idx" ON "digital_business_cards"("adminDeactivatedAt")`
);
addIndex(
  "digital_business_cards_claimedAt_idx",
  `CREATE INDEX IF NOT EXISTS "digital_business_cards_claimedAt_idx" ON "digital_business_cards"("claimedAt")`
);
addIndex(
  "digital_business_cards_unclaimedEmail_idx",
  `CREATE INDEX IF NOT EXISTS "digital_business_cards_unclaimedEmail_idx" ON "digital_business_cards"("unclaimedEmail")`
);

if (sql(`SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='celecard_lifecycle_policy'`) !== "0") {
  addColumn("celecard_lifecycle_policy", "planPrices", "TEXT");
  addColumn("celecard_lifecycle_policy", "conciergePriceGhs", "INTEGER DEFAULT 199");
  addColumn("celecard_lifecycle_policy", "conciergeBundledPlanId", "TEXT");
}

console.log(`[celeyou-sqlite] ready ${dbPath}`);
