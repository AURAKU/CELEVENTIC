export type AppLocale = "en" | "fr" | "zh";

export const DEFAULT_LOCALE: AppLocale = "en";
export const SUPPORTED_LOCALES: AppLocale[] = ["en", "fr", "zh"];
export const LOCALE_STORAGE_KEY = "celeventic_locale";

/** Future AI translation targets (not enabled in the live switcher) */
export const FUTURE_LOCALES = ["tw", "ga", "ee", "ha"] as const;

export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  fr: "Français",
  zh: "中文",
};

/** BCP 47 tags for <html lang> and Intl formatters. */
export const LOCALE_HTML_LANG: Record<AppLocale, string> = {
  en: "en",
  fr: "fr",
  zh: "zh-CN",
};

export function isAppLocale(value: string): value is AppLocale {
  return SUPPORTED_LOCALES.includes(value as AppLocale);
}

export function htmlLang(locale: AppLocale): string {
  return LOCALE_HTML_LANG[locale];
}
