/**
 * Money helpers for the Event Gift Wallet.
 *
 * Every amount that touches a gift payment or a wallet ledger entry is an
 * integer in the currency's minor unit (pesewas for GHS). Floating point never
 * participates in a balance calculation — the only place a float appears is at
 * the display boundary, and even there we format from the integer.
 */

export const GIFT_DEFAULT_CURRENCY = "GHS";

/** Currencies whose minor unit is not 1/100 of the major unit. */
const ZERO_DECIMAL_CURRENCIES = new Set(["JPY", "KRW", "VND", "XOF", "XAF", "CLP", "ISK"]);
const THREE_DECIMAL_CURRENCIES = new Set(["BHD", "IQD", "JOD", "KWD", "OMR", "TND"]);

export function currencyExponent(currency: string): number {
  const code = currency.toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(code)) return 0;
  if (THREE_DECIMAL_CURRENCIES.has(code)) return 3;
  return 2;
}

function factor(currency: string): number {
  return 10 ** currencyExponent(currency);
}

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

/**
 * Convert a user-entered major-unit amount ("120", "120.5", 120.55) into minor
 * units. Rejects anything that cannot be represented exactly so a guest can
 * never be charged a rounded-up amount they did not agree to.
 */
export function toMinorUnits(value: string | number, currency = GIFT_DEFAULT_CURRENCY): number {
  const raw = typeof value === "number" ? String(value) : value.trim();
  if (!raw) throw new MoneyError("Amount is required");

  const normalised = raw.replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(normalised)) {
    throw new MoneyError("Amount must be a positive number");
  }

  const exponent = currencyExponent(currency);
  const [whole, fraction = ""] = normalised.split(".");
  if (fraction.length > exponent) {
    throw new MoneyError(
      exponent === 0
        ? `${currency.toUpperCase()} amounts cannot have decimals`
        : `Amount cannot have more than ${exponent} decimal places`
    );
  }

  const padded = fraction.padEnd(exponent, "0");
  const minor = Number(`${whole}${padded}`);
  if (!Number.isSafeInteger(minor)) throw new MoneyError("Amount is too large");
  return minor;
}

/** Minor units back to a major-unit number. Display only — never for maths. */
export function toMajorUnits(minor: number, currency = GIFT_DEFAULT_CURRENCY): number {
  return minor / factor(currency);
}

/** "GHS 120.00" */
export function formatMinor(
  minor: number,
  currency = GIFT_DEFAULT_CURRENCY,
  options?: { locale?: string; withSymbol?: boolean }
): string {
  const exponent = currencyExponent(currency);
  const value = toMajorUnits(minor, currency);
  const formatted = new Intl.NumberFormat(options?.locale ?? "en-GH", {
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).format(value);
  return options?.withSymbol === false ? formatted : `${currency.toUpperCase()} ${formatted}`;
}

export interface AmountRule {
  minAmountMinor: number;
  maxAmountMinor?: number | null;
  allowCustomAmount: boolean;
  suggestedAmountsMinor: number[];
  currency: string;
}

export type AmountValidation =
  | { ok: true; amountMinor: number }
  | { ok: false; error: string };

/**
 * Server-side gate for every gift amount. The client shows the same rules, but
 * this is the only check that counts.
 */
export function validateGiftAmount(amountMinor: unknown, rule: AmountRule): AmountValidation {
  if (typeof amountMinor !== "number" || !Number.isInteger(amountMinor)) {
    return { ok: false, error: "Amount must be a whole number of minor units" };
  }
  if (amountMinor <= 0) {
    return { ok: false, error: "Amount must be greater than zero" };
  }
  if (!Number.isSafeInteger(amountMinor) || amountMinor > 2_000_000_000) {
    return { ok: false, error: "Amount is too large" };
  }
  if (amountMinor < rule.minAmountMinor) {
    return {
      ok: false,
      error: `The minimum gift is ${formatMinor(rule.minAmountMinor, rule.currency)}`,
    };
  }
  if (rule.maxAmountMinor && amountMinor > rule.maxAmountMinor) {
    return {
      ok: false,
      error: `The maximum gift is ${formatMinor(rule.maxAmountMinor, rule.currency)}`,
    };
  }
  if (!rule.allowCustomAmount && !rule.suggestedAmountsMinor.includes(amountMinor)) {
    return { ok: false, error: "Please choose one of the suggested gift amounts" };
  }
  return { ok: true, amountMinor };
}

/** Parse the campaign's stored suggested-amount JSON into a clean integer list. */
export function parseSuggestedAmounts(raw: unknown, fallback: number[] = []): number[] {
  if (!Array.isArray(raw)) return fallback;
  const cleaned = raw
    .map((entry) => (typeof entry === "number" ? entry : Number(entry)))
    .filter((n) => Number.isInteger(n) && n > 0);
  const unique = Array.from(new Set(cleaned)).sort((a, b) => a - b);
  return unique.length > 0 ? unique.slice(0, 8) : fallback;
}

/**
 * Paystack (and every other provider we support) quotes amounts in minor units
 * already, so this is an identity guard rather than a conversion — it exists so
 * a mismatch between what we asked for and what the provider charged is caught
 * loudly at verification time.
 */
export function amountsMatch(expectedMinor: number, providerMinor: unknown): boolean {
  return typeof providerMinor === "number" && Math.trunc(providerMinor) === expectedMinor;
}
