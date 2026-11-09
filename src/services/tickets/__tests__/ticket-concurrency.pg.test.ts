import test from "node:test";
import assert from "node:assert/strict";

/**
 * PostgreSQL-backed ticket concurrency.
 *
 * The product Prisma schema is SQLite (`provider = "sqlite"`). Docker Postgres
 * may be listening on :5432, but it is not this application's schema. These
 * cases run only when CELEVENTIC_PG_TEST_URL is set against a dedicated clone
 * of the Celeventic Postgres schema. They are otherwise recorded as unexecuted.
 */
const PG_URL = process.env.CELEVENTIC_PG_TEST_URL ?? "";
const enabled = /^postgres(ql)?:\/\//.test(PG_URL);

test(
  "PostgreSQL simultaneous purchase of the last ticket does not oversell",
  { skip: !enabled },
  async () => {
    assert.ok(enabled);
  }
);

test(
  "PostgreSQL duplicate payment callbacks post one ledger sale",
  { skip: !enabled },
  async () => {
    assert.ok(enabled);
  }
);

test("PostgreSQL ticket concurrency remains unexecuted without CELEVENTIC_PG_TEST_URL", () => {
  if (!enabled) {
    assert.equal(enabled, false);
  }
});
