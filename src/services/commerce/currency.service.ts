import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  BASE_CURRENCY,
  CURRENCY_NAMES,
  CURRENCY_SYMBOLS,
  DEFAULT_EXCHANGE_RATES,
  DISPLAY_CURRENCIES,
  type DisplayCurrency,
} from "@/lib/commerce/constants";

/** P2002 = unique constraint violation. Another concurrent request already seeded this row. */
function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export function roundConverted(amount: number, currency: string): number {
  if (currency === "GHS") return Math.round(amount * 100) / 100;
  if (currency === "USD") return Math.round(amount * 100) / 100;
  if (currency === "GBP") return Math.round(amount * 100) / 100;
  return Math.round(amount * 100) / 100;
}

export class CurrencyService {
  /**
   * Process-lifetime cache: once we've confirmed currencies exist (or just seeded them),
   * never re-check on this instance again. Combined with the `count()` short-circuit below,
   * this is what eliminates the P1008 socket-timeout storm. Every prior request to
   * `/api/commerce/currencies` ran a full batch of `upsert()` writes (currencies + exchange
   * rates) on *every single call*, exhausting the Prisma connection pool under load. Now a
   * write only ever happens once per empty table, and every other call (including the very
   * first one after that, in this same process) is a cheap in-memory no-op or a single read.
   */
  private seededChecked = false;

  /**
   * Seeds the default currencies/exchange rates ONLY when the `currencies` table is empty.
   * never on every request. `skipDuplicates` isn't available on `createMany` for this
   * project's SQLite datasource, so a concurrent cold-start race (two requests both see an
   * empty table before either has written) is instead handled by swallowing the resulting
   * unique-constraint error. Whichever request wins, the seed rows end up correct either way.
   */
  async ensureCurrenciesSeeded() {
    if (this.seededChecked) return;

    const existing = await prisma.currency.count();
    if (existing > 0) {
      await this.ensureCnyCurrency();
      this.seededChecked = true;
      return;
    }

    const defaults = DISPLAY_CURRENCIES.map((code) => ({
      code,
      symbol: CURRENCY_SYMBOLS[code],
      name: CURRENCY_NAMES[code],
      enabled: true,
      isDefault: code === BASE_CURRENCY,
    }));
    try {
      await prisma.currency.createMany({ data: defaults });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
    }

    const rateRows = Object.entries(DEFAULT_EXCHANGE_RATES)
      .filter(([target]) => target !== BASE_CURRENCY)
      .map(([target, rate]) => ({
        baseCurrency: BASE_CURRENCY,
        targetCurrency: target,
        rate,
        source: "seed",
      }));
    if (rateRows.length > 0) {
      try {
        await prisma.exchangeRate.createMany({ data: rateRows });
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;
      }
    }

    this.seededChecked = true;
  }

  /** Additive: existing DBs already have GHS/USD/GBP. Insert CNY once if missing. */
  private async ensureCnyCurrency() {
    const cny = await prisma.currency.findUnique({ where: { code: "CNY" } });
    if (!cny) {
      try {
        await prisma.currency.create({
          data: {
            code: "CNY",
            symbol: CURRENCY_SYMBOLS.CNY,
            name: CURRENCY_NAMES.CNY,
            enabled: true,
            isDefault: false,
          },
        });
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;
      }
    } else if (!cny.enabled) {
      await prisma.currency.update({
        where: { code: "CNY" },
        data: { enabled: true, name: CURRENCY_NAMES.CNY, symbol: CURRENCY_SYMBOLS.CNY },
      });
    }

    const rate = await prisma.exchangeRate.findUnique({
      where: {
        baseCurrency_targetCurrency: { baseCurrency: BASE_CURRENCY, targetCurrency: "CNY" },
      },
    });
    if (!rate) {
      try {
        await prisma.exchangeRate.create({
          data: {
            baseCurrency: BASE_CURRENCY,
            targetCurrency: "CNY",
            rate: DEFAULT_EXCHANGE_RATES.CNY,
            source: "seed",
          },
        });
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;
      }
    }
  }

  async getEnabledCurrencies() {
    await this.ensureCurrenciesSeeded();
    return prisma.currency.findMany({
      where: { enabled: true },
      orderBy: { isDefault: "desc" },
    });
  }

  async getExchangeRates() {
    await this.ensureCurrenciesSeeded();
    return prisma.exchangeRate.findMany({
      where: { baseCurrency: BASE_CURRENCY },
      orderBy: { targetCurrency: "asc" },
    });
  }

  async getRate(targetCurrency: string): Promise<{ rate: number; source: string }> {
    if (targetCurrency === BASE_CURRENCY) return { rate: 1, source: "base" };
    const row = await prisma.exchangeRate.findUnique({
      where: { baseCurrency_targetCurrency: { baseCurrency: BASE_CURRENCY, targetCurrency } },
    });
    if (row) return { rate: Number(row.rate), source: row.source };
    return { rate: DEFAULT_EXCHANGE_RATES[targetCurrency] ?? 1, source: "fallback" };
  }

  async convertFromGhs(amountGhs: number, targetCurrency: DisplayCurrency) {
    const { rate, source } = await this.getRate(targetCurrency);
    const displayAmount = roundConverted(amountGhs * rate, targetCurrency);
    return {
      baseCurrency: BASE_CURRENCY,
      baseAmount: amountGhs,
      displayCurrency: targetCurrency,
      displayAmount,
      exchangeRate: rate,
      rateSource: source,
    };
  }

  async updateExchangeRate(
    targetCurrency: string,
    rate: number,
    updatedBy: string,
    source = "manual"
  ) {
    return prisma.exchangeRate.upsert({
      where: {
        baseCurrency_targetCurrency: { baseCurrency: BASE_CURRENCY, targetCurrency },
      },
      update: { rate, source, updatedBy, updatedAt: new Date() },
      create: { baseCurrency: BASE_CURRENCY, targetCurrency, rate, source, updatedBy },
    });
  }

  formatDisplay(amount: number, currency: string, symbol?: string) {
    const sym =
      symbol ??
      CURRENCY_SYMBOLS[currency as DisplayCurrency] ??
      (currency === "GHS" ? "₵" : currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "CNY" ? "¥" : "");
    if (currency === "GHS") {
      return `${sym}${amount.toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }
    if (currency === "CNY") {
      return `${sym}${amount.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${sym}${amount.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

export const currencyService = new CurrencyService();
