import { DEFAULT_TRANSLATIONS } from "@/lib/i18n/default-translations";
import type { AppLocale } from "@/lib/i18n/constants";
import type { MessageDictionary } from "@/services/i18n/translation.service";

export type LocaleMessages = Record<AppLocale, MessageDictionary>;

function fullKey(namespace: string, key: string) {
  return `${namespace}.${key}`;
}

/** Bundled EN/FR dictionaries — always available without DB or network. */
export function buildStaticMessageDictionaries(): LocaleMessages {
  const en: MessageDictionary = {};
  const fr: MessageDictionary = {};

  for (const row of DEFAULT_TRANSLATIONS) {
    const fk = fullKey(row.namespace, row.key);
    en[fk] = row.enValue;
    fr[fk] = row.frValue ?? row.enValue;
  }

  return { en, fr };
}

export const STATIC_MESSAGE_DICTIONARIES = buildStaticMessageDictionaries();

export function mergeMessageDictionaries(
  base: LocaleMessages,
  overlay?: Partial<LocaleMessages>
): LocaleMessages {
  if (!overlay) return base;
  return {
    en: { ...base.en, ...(overlay.en ?? {}) },
    fr: { ...base.fr, ...(overlay.fr ?? {}) },
  };
}
