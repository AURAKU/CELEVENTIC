export type AppLocale = "en" | "fr";

export const DEFAULT_LOCALE: AppLocale = "en";
export const SUPPORTED_LOCALES: AppLocale[] = ["en", "fr"];
export const LOCALE_STORAGE_KEY = "celeventic_locale";

/** Future AI translation targets (not enabled in MVP) */
export const FUTURE_LOCALES = ["tw", "ga", "ee", "ha"] as const;

export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  fr: "Français",
};

export function isAppLocale(value: string): value is AppLocale {
  return SUPPORTED_LOCALES.includes(value as AppLocale);
}
