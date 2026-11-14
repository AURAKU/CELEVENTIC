import { DEFAULT_TRANSLATIONS } from "@/lib/i18n/default-translations";
import { ZH_MESSAGES } from "@/lib/i18n/zh-messages";
import type { AppLocale } from "@/lib/i18n/constants";
import type { MessageDictionary } from "@/services/i18n/translation.service";

export type LocaleMessages = Record<AppLocale, MessageDictionary>;

function fullKey(namespace: string, key: string) {
  return `${namespace}.${key}`;
}

/** Bundled EN/FR/ZH dictionaries. Always available without DB or network. */
export function buildStaticMessageDictionaries(): LocaleMessages {
  const en: MessageDictionary = {};
  const fr: MessageDictionary = {};
  const zh: MessageDictionary = {};

  for (const row of DEFAULT_TRANSLATIONS) {
    const fk = fullKey(row.namespace, row.key);
    en[fk] = row.enValue;
    fr[fk] = row.frValue ?? row.enValue;
    zh[fk] = ZH_MESSAGES[fk] ?? row.enValue;
  }

  return { en, fr, zh };
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
    zh: { ...base.zh, ...(overlay.zh ?? {}) },
  };
}
