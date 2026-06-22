export const BASE_CURRENCY = "GHS" as const;
export const DISPLAY_CURRENCIES = ["GHS", "USD", "GBP"] as const;
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  GHS: 1,
  USD: 0.074,
  GBP: 0.058,
};
