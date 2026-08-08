import { NextResponse } from "next/server";
import { currencyService } from "@/services/commerce/currency.service";
import { BASE_CURRENCY, DEFAULT_EXCHANGE_RATES } from "@/lib/commerce/constants";

/**
 * Every page in the app polls this route. A database hiccup here must not put
 * the browser in a state it cannot parse: an unhandled throw returns Next's
 * HTML error page, and the client's `res.json()` then fails with
 * "Unexpected end of JSON input" far away from the actual cause. The seeded
 * defaults are the honest answer while the database is unreachable.
 */
const FALLBACK_SYMBOLS: Record<string, string> = { GHS: "₵", USD: "$", GBP: "£" };

function fallbackPayload() {
  const rates: Record<string, number> = { [BASE_CURRENCY]: 1, ...DEFAULT_EXCHANGE_RATES };
  return {
    success: true,
    degraded: true,
    data: {
      currencies: Object.keys(FALLBACK_SYMBOLS).map((code) => ({
        code,
        symbol: FALLBACK_SYMBOLS[code]!,
        name: code,
        isDefault: code === BASE_CURRENCY,
      })),
      rates,
      symbols: FALLBACK_SYMBOLS,
      baseCurrency: BASE_CURRENCY,
    },
  };
}

export async function GET() {
  let currencies: Awaited<ReturnType<typeof currencyService.getEnabledCurrencies>>;
  let rates: Awaited<ReturnType<typeof currencyService.getExchangeRates>>;
  try {
    [currencies, rates] = await Promise.all([
      currencyService.getEnabledCurrencies(),
      currencyService.getExchangeRates(),
    ]);
  } catch (error) {
    console.error("[commerce/currencies] falling back to seeded rates", error);
    return NextResponse.json(fallbackPayload(), {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }

  const ratesMap: Record<string, number> = { GHS: 1 };
  const symbolsMap: Record<string, string> = {};
  for (const c of currencies) {
    symbolsMap[c.code] = c.symbol;
  }
  for (const r of rates) {
    ratesMap[r.targetCurrency] = Number(r.rate);
  }

  return NextResponse.json(
    {
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
  },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
