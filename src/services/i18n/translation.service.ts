import { prisma } from "@/lib/prisma";
import { DEFAULT_TRANSLATIONS } from "@/lib/i18n/default-translations";
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/constants";
import { languageService } from "@/services/i18n/language.service";

export type MessageDictionary = Record<string, string>;

function fullKey(namespace: string, key: string) {
  return `${namespace}.${key}`;
}

function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`));
}

export class TranslationService {
  async seedTranslations() {
    await languageService.ensureLanguagesSeeded();
    for (const row of DEFAULT_TRANSLATIONS) {
      await prisma.translation.upsert({
        where: { namespace_key: { namespace: row.namespace, key: row.key } },
        update: {
          enValue: row.enValue,
          frValue: row.frValue,
          editableByAdmin: row.editableByAdmin ?? true,
        },
        create: {
          namespace: row.namespace,
          key: row.key,
          enValue: row.enValue,
          frValue: row.frValue,
          editableByAdmin: row.editableByAdmin ?? true,
        },
      });
    }
  }

  async getDictionary(locale: AppLocale): Promise<MessageDictionary> {
    const rows = await prisma.translation.findMany();
    const dict: MessageDictionary = {};
    for (const row of rows) {
      const fk = fullKey(row.namespace, row.key);
      dict[fk] = locale === "fr" ? (row.frValue ?? row.enValue) : row.enValue;
    }
    return dict;
  }

  async getBootstrapPayload() {
    await this.seedTranslations();
    const [languages, rows] = await Promise.all([
      languageService.getEnabledLanguages(),
      prisma.translation.findMany({ orderBy: [{ namespace: "asc" }, { key: "asc" }] }),
    ]);

    const en: MessageDictionary = {};
    const fr: MessageDictionary = {};
    for (const row of rows) {
      const fk = fullKey(row.namespace, row.key);
      en[fk] = row.enValue;
      fr[fk] = row.frValue ?? row.enValue;
    }

    return { languages, messages: { en, fr }, defaultLocale: DEFAULT_LOCALE };
  }

  t(locale: AppLocale, namespace: string, key: string, params?: Record<string, string | number>) {
    return this.tSync(locale, namespace, key, params);
  }

  /** Sync helper when dictionary already loaded */
  tSync(
    locale: AppLocale,
    namespaceOrFullKey: string,
    key?: string,
    params?: Record<string, string | number>,
    dict?: MessageDictionary
  ) {
    const fk = key ? fullKey(namespaceOrFullKey, key) : namespaceOrFullKey;
    const messages = dict;
    if (messages) {
      const raw = messages[fk] ?? messages[namespaceOrFullKey] ?? fk;
      return interpolate(raw, params);
    }
    return fk;
  }

  async tAsync(locale: AppLocale, namespace: string, key: string, params?: Record<string, string | number>) {
    const row = await prisma.translation.findUnique({
      where: { namespace_key: { namespace, key } },
    });
    if (!row) return interpolate(fullKey(namespace, key), params);
    const raw = locale === "fr" ? (row.frValue ?? row.enValue) : row.enValue;
    return interpolate(raw, params);
  }

  async listForAdmin(namespace?: string) {
    return prisma.translation.findMany({
      where: namespace ? { namespace } : undefined,
      orderBy: [{ namespace: "asc" }, { key: "asc" }],
    });
  }

  async updateTranslation(id: string, data: { enValue?: string; frValue?: string }) {
    return prisma.translation.update({ where: { id }, data });
  }
}

export const translationService = new TranslationService();
