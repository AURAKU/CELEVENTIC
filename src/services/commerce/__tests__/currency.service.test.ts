import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../../lib/prisma";
import { CurrencyService } from "../currency.service";

/**
 * Regression coverage for the P1008 fix: `ensureCurrenciesSeeded()` used to run a full batch
 * of `upsert()` writes on EVERY call (every `/api/commerce/currencies` request), exhausting
 * the Prisma connection pool under load. These tests run against the real (local dev) SQLite
 * database and instrument the actual `prisma.currency`/`prisma.exchangeRate` delegates to
 * assert the exact write behavior — no DB writes at all once currencies exist, and exactly
 * one seed pass when the table starts empty.
 */

function countCalls<T extends object, K extends keyof T>(obj: T, method: K) {
  const original = obj[method] as unknown as (...args: unknown[]) => unknown;
  let calls = 0;
  (obj[method] as unknown) = (...args: unknown[]) => {
    calls++;
    return original.apply(obj, args);
  };
  return {
    get count() {
      return calls;
    },
    restore() {
      (obj[method] as unknown) = original;
    },
  };
}

describe("CurrencyService.ensureCurrenciesSeeded", () => {
  before(async () => {
    // Isolate from whatever local dev data exists — snapshot is restored in `after`.
    await prisma.exchangeRate.deleteMany({});
    await prisma.currency.deleteMany({});
  });

  after(async () => {
    // Leave the dev DB in a normal (seeded) state for anyone using it interactively afterward.
    const service = new CurrencyService();
    await service.ensureCurrenciesSeeded();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.exchangeRate.deleteMany({});
    await prisma.currency.deleteMany({});
  });

  it("seeds currencies + exchange rates exactly once when the table is empty, then never writes again", async () => {
    const service = new CurrencyService();
    const countSpy = countCalls(prisma.currency, "count");
    const createManySpy = countCalls(prisma.currency, "createMany");
    const rateCreateManySpy = countCalls(prisma.exchangeRate, "createMany");

    try {
      await service.ensureCurrenciesSeeded();

      const currencies = await prisma.currency.findMany();
      assert.equal(currencies.length, 3, "expected the 3 default currencies to be seeded");
      assert.equal(createManySpy.count, 1, "createMany should run exactly once for an empty table");
      assert.equal(rateCreateManySpy.count, 1, "exchange rate createMany should run exactly once");

      const countAfterFirstSeed = countSpy.count;

      // Subsequent calls — same instance — must be pure in-memory no-ops (no DB round trip at all).
      await service.ensureCurrenciesSeeded();
      await service.ensureCurrenciesSeeded();
      await service.ensureCurrenciesSeeded();

      assert.equal(countSpy.count, countAfterFirstSeed, "count() must not run again once seededChecked is true");
      assert.equal(createManySpy.count, 1, "createMany must never run again after the first successful seed");
      assert.equal(rateCreateManySpy.count, 1, "exchange rate createMany must never run again after the first successful seed");
    } finally {
      countSpy.restore();
      createManySpy.restore();
      rateCreateManySpy.restore();
    }
  });

  it("never writes when currencies already exist (read-only path)", async () => {
    // Simulate a table that was already seeded by a prior process/deploy.
    await prisma.currency.create({
      data: { code: "GHS", symbol: "₵", name: "Ghana Cedi", enabled: true, isDefault: true },
    });

    const service = new CurrencyService();
    const createManySpy = countCalls(prisma.currency, "createMany");
    const rateCreateManySpy = countCalls(prisma.exchangeRate, "createMany");

    try {
      await service.ensureCurrenciesSeeded();
      const currencies = await prisma.currency.findMany();

      assert.equal(currencies.length, 1, "pre-existing row must be untouched — no reseed over existing data");
      assert.equal(createManySpy.count, 0, "createMany must never run when the table is already non-empty");
      assert.equal(rateCreateManySpy.count, 0, "exchange rate createMany must never run when currencies already exist");
    } finally {
      createManySpy.restore();
      rateCreateManySpy.restore();
    }
  });

  it("getEnabledCurrencies / getExchangeRates trigger the same seed-once behavior and return usable data", async () => {
    const service = new CurrencyService();
    const createManySpy = countCalls(prisma.currency, "createMany");

    try {
      const currencies = await service.getEnabledCurrencies();
      const rates = await service.getExchangeRates();

      assert.equal(createManySpy.count, 1);
      assert.ok(currencies.some((c) => c.code === "GHS" && c.isDefault));
      assert.ok(rates.some((r) => r.targetCurrency === "USD"));

      // A second read-heavy round trip through the public API must not write again.
      await service.getEnabledCurrencies();
      await service.getExchangeRates();
      assert.equal(createManySpy.count, 1);
    } finally {
      createManySpy.restore();
    }
  });
});
