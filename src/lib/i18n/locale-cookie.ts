import { DEFAULT_LOCALE, isAppLocale, type AppLocale } from "@/lib/i18n/constants";

export const LOCALE_COOKIE_NAME = "celeventic_locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function parseLocaleCookie(value: string | undefined | null): AppLocale {
  if (value && isAppLocale(value)) return value;
  return DEFAULT_LOCALE;
}

export function localeCookieHeader(locale: AppLocale): string {
  return `${LOCALE_COOKIE_NAME}=${locale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
}
