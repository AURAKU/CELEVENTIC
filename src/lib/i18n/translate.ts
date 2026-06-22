import type { AppLocale } from "@/lib/i18n/constants";
import { STATIC_MESSAGE_DICTIONARIES } from "@/lib/i18n/static-messages";
import type { MessageDictionary } from "@/services/i18n/translation.service";

/** Turn `landing.hero_title_1` into readable fallback text. */
export function humanizeTranslationKey(key: string): string {
  const segment = key.includes(".") ? key.split(".").pop()! : key;
  return segment
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function lookup(dict: MessageDictionary, key: string): string | undefined {
  if (dict[key]) return dict[key];
  if (key.startsWith("common.")) {
    const short = key.slice("common.".length);
    if (dict[short]) return dict[short];
  }
  return undefined;
}

export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`));
}

/**
 * Resolve translated copy. Never returns a raw i18n key — falls back to static
 * bundle, then humanized key text.
 */
export function resolveTranslation(
  key: string,
  locale: AppLocale,
  messages: MessageDictionary,
  params?: Record<string, string | number>
): string {
  const staticDict = STATIC_MESSAGE_DICTIONARIES[locale];
  const raw =
    lookup(messages, key) ??
    lookup(staticDict, key) ??
    lookup(STATIC_MESSAGE_DICTIONARIES.en, key);

  const text = raw ?? humanizeTranslationKey(key);
  return interpolate(text, params);
}
