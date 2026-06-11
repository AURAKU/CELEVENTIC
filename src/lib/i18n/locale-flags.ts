import type { AppLocale } from "./constants";
import type { DisplayCurrency } from "@/lib/commerce/constants";

export const LOCALE_FLAGS: Record<AppLocale, string> = {
  en: "🇬🇧",
  fr: "🇫🇷",
};

export const CURRENCY_FLAGS: Record<DisplayCurrency, string> = {
  GHS: "🇬🇭",
  USD: "🇺🇸",
  GBP: "🇬🇧",
};
