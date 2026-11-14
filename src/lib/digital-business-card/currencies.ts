/**
 * CeleYou display currencies. Checkout stays Paystack GHS until Super Admin
 * publishes another payable currency and the provider is verified.
 * Never invent an exchange rate or silently convert a charge.
 */

export const CELEYOU_DISPLAY_CURRENCIES = ["GHS", "USD", "GBP", "CNY"] as const;
export type CeleYouDisplayCurrency = (typeof CELEYOU_DISPLAY_CURRENCIES)[number];

export const CELEYOU_PAYABLE_CURRENCIES = ["GHS"] as const;
export type CeleYouPayableCurrency = (typeof CELEYOU_PAYABLE_CURRENCIES)[number];

export const CELEYOU_SETTLEMENT_CURRENCY: CeleYouPayableCurrency = "GHS";

const SYMBOL: Record<CeleYouDisplayCurrency, string> = {
  GHS: "GH₵",
  USD: "$",
  GBP: "£",
  CNY: "¥",
};

const FRACTION: Record<CeleYouDisplayCurrency, number> = {
  GHS: 2,
  USD: 2,
  GBP: 2,
  CNY: 0,
};

export function isCeleYouDisplayCurrency(value: unknown): value is CeleYouDisplayCurrency {
  return typeof value === "string" && (CELEYOU_DISPLAY_CURRENCIES as readonly string[]).includes(value);
}

export function isCeleYouPayableCurrency(value: unknown): value is CeleYouPayableCurrency {
  return typeof value === "string" && (CELEYOU_PAYABLE_CURRENCIES as readonly string[]).includes(value);
}

export function celeYouCurrencySymbol(code: CeleYouDisplayCurrency): string {
  return SYMBOL[code];
}

export function celeYouMinorUnits(major: number, code: CeleYouDisplayCurrency): number {
  const digits = FRACTION[code];
  return Math.round(Number(major) * 10 ** digits);
}

export function celeYouMajorFromMinor(minor: number, code: CeleYouDisplayCurrency): number {
  const digits = FRACTION[code];
  return Math.round(Number(minor)) / 10 ** digits;
}

export function formatCeleYouMoney(major: number, code: CeleYouDisplayCurrency): string {
  const amount = Number(major);
  const digits = code === "GHS" && Number.isInteger(amount) ? 0 : FRACTION[code];
  const body = Number.isFinite(amount)
    ? amount.toLocaleString("en-GB", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    : "0";
  return `${SYMBOL[code]}${body}`;
}

export type CeleYouCheckoutCurrencyDecision = {
  display: CeleYouDisplayCurrency;
  payable: boolean;
  settlement: CeleYouPayableCurrency;
  reason: string;
};

/**
 * Paystack on this product collects GHS. USD/GBP/CNY catalog rows are display
 * drafts. CNY is not a Paystack charge currency here.
 */
export function celeYouCheckoutCurrency(display: CeleYouDisplayCurrency): CeleYouCheckoutCurrencyDecision {
  if (display === "GHS") {
    return {
      display,
      payable: true,
      settlement: "GHS",
      reason: "CeleYou checkout uses Paystack in Ghana cedis.",
    };
  }
  if (display === "CNY") {
    return {
      display,
      payable: false,
      settlement: "GHS",
      reason: "Paystack does not collect RMB for CeleYou. Displayed yuan prices are drafts until a supported rail is approved.",
    };
  }
  return {
    display,
    payable: false,
    settlement: "GHS",
    reason: `${display} prices are drafts. Checkout still charges Ghana cedis on Paystack until Super Admin publishes this currency.`,
  };
}
