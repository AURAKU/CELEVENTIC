import { prisma } from "@/lib/prisma";
import { BASE_CURRENCY, DEFAULT_EXCHANGE_RATES, type DisplayCurrency } from "@/lib/commerce/constants";

export function roundConverted(amount: number, currency: string): number {
  if (currency === "GHS") return Math.round(amount * 100) / 100;
  if (currency === "USD") return Math.round(amount * 100) / 100;
  if (currency === "GBP") return Math.round(amount * 100) / 100;
  return Math.round(amount * 100) / 100;
}

export class CurrencyService {
  async ensureCurrenciesSeeded() {
    const defaults = [
      { code: "GHS", symbol: "₵", name: "Ghana Cedi", enabled: true, isDefault: true },
      { code: "USD", symbol: "$", name: "US Dollar", enabled: true, isDefault: false },
      { code: "GBP", symbol: "£", name: "British Pound", enabled: true, isDefault: false },
    ];
    for (const c of defaults) {
      await prisma.currency.upsert({
        where: { code: c.code },
        update: { symbol: c.symbol, name: c.name, enabled: c.enabled },
        create: c,
      });
    }
    for (const [target, rate] of Object.entries(DEFAULT_EXCHANGE_RATES)) {
      if (target === BASE_CURRENCY) continue;
      await prisma.exchangeRate.upsert({
        where: { baseCurrency_targetCurrency: { baseCurrency: BASE_CURRENCY, targetCurrency: target } },
        update: { rate },
        create: { baseCurrency: BASE_CURRENCY, targetCurrency: target, rate, source: "seed" },
      });
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
    const sym = symbol ?? (currency === "GHS" ? "₵" : currency === "USD" ? "$" : currency === "GBP" ? "£" : "");
    if (currency === "GHS") return `${sym}${amount.toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    return `${sym}${amount.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

export const currencyService = new CurrencyService();
