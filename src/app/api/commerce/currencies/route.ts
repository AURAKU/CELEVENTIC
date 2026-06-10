import { NextResponse } from "next/server";
import { currencyService } from "@/services/commerce/currency.service";

export async function GET() {
  const [currencies, rates] = await Promise.all([
    currencyService.getEnabledCurrencies(),
    currencyService.getExchangeRates(),
  ]);

  const ratesMap: Record<string, number> = { GHS: 1 };
  const symbolsMap: Record<string, string> = {};
  for (const c of currencies) {
    symbolsMap[c.code] = c.symbol;
  }
  for (const r of rates) {
    ratesMap[r.targetCurrency] = Number(r.rate);
  }

  return NextResponse.json({
    success: true,
    data: {
      currencies: currencies.map((c) => ({
        code: c.code,
        symbol: c.symbol,
        name: c.name,
        isDefault: c.isDefault,
      })),
      rates: ratesMap,
      symbols: symbolsMap,
      baseCurrency: "GHS",
    },
  });
}
