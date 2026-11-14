import type { AppLocale } from "@/lib/i18n/constants";

/**
 * Pick copy for the active UI locale. French uses its own string when present.
 * Mandarin uses its own string when present, otherwise English.
 * Never invent a language the map does not contain.
 */
export function pickLocalized(
  locale: AppLocale,
  map: Partial<Record<AppLocale, string | null | undefined>>,
  fallback: string
): string {
  const exact = map[locale];
  if (exact?.trim()) return exact;
  if (locale === "zh") {
    const en = map.en;
    if (en?.trim()) return en;
  }
  const en = map.en;
  if (en?.trim()) return en;
  return fallback;
}
