export const BASE_CURRENCY = "GHS" as const;
export const DISPLAY_CURRENCIES = ["GHS", "USD", "GBP", "CNY"] as const;
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

/**
 * Display conversion from 1 GHS. Settlement stays GHS via Paystack.
 * CNY tracks the USD reference (0.074) at about 7.16 CNY per USD.
 */
export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  GHS: 1,
  USD: 0.074,
  GBP: 0.058,
  CNY: 0.53,
};

export const CURRENCY_SYMBOLS: Record<DisplayCurrency, string> = {
  GHS: "₵",
  USD: "$",
  GBP: "£",
  CNY: "¥",
};

export const CURRENCY_NAMES: Record<DisplayCurrency, string> = {
  GHS: "Ghana Cedi",
  USD: "US Dollar",
  GBP: "British Pound",
  CNY: "Chinese Yuan",
};

export function isDisplayCurrency(value: string): value is DisplayCurrency {
  return (DISPLAY_CURRENCIES as readonly string[]).includes(value);
}
