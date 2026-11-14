import { prisma } from "@/lib/prisma";
import { isAppLocale, type AppLocale } from "@/lib/i18n/constants";

const MVP_LANGUAGES = [
  { code: "en", name: "English", enabled: true, isDefault: true },
  { code: "fr", name: "French", enabled: true, isDefault: false },
  { code: "zh", name: "Chinese (Mandarin)", enabled: true, isDefault: false },
  { code: "tw", name: "Twi", enabled: false, isDefault: false },
  { code: "ga", name: "Ga", enabled: false, isDefault: false },
  { code: "ee", name: "Ewe", enabled: false, isDefault: false },
  { code: "ha", name: "Hausa", enabled: false, isDefault: false },
];

let languagesSeedPromise: Promise<void> | null = null;

export class LanguageService {
  async ensureLanguagesSeeded() {
    if (!languagesSeedPromise) {
      languagesSeedPromise = (async () => {
        const zh = await prisma.language.findUnique({ where: { code: "zh" } });
        if (!zh) {
          await prisma.language.upsert({
            where: { code: "zh" },
            update: { name: "Chinese (Mandarin)", enabled: true, isDefault: false },
            create: { code: "zh", name: "Chinese (Mandarin)", enabled: true, isDefault: false },
          });
        } else if (!zh.enabled) {
          await prisma.language.update({
            where: { code: "zh" },
            data: { enabled: true, name: "Chinese (Mandarin)" },
          });
        }

        const existing = await prisma.language.count();
        if (existing >= MVP_LANGUAGES.length) return;

        for (const lang of MVP_LANGUAGES) {
          await prisma.language.upsert({
            where: { code: lang.code },
            update: { name: lang.name, enabled: lang.enabled, isDefault: lang.isDefault },
            create: lang,
          });
        }
      })().catch((err) => {
        languagesSeedPromise = null;
        throw err;
      });
    }
    await languagesSeedPromise;
  }

  async getEnabledLanguages() {
    await this.ensureLanguagesSeeded();
    return prisma.language.findMany({
      where: { enabled: true },
      orderBy: { isDefault: "desc" },
    });
  }

  async getUserPreference(userId: string): Promise<AppLocale | null> {
    const pref = await prisma.userLanguagePreference.findUnique({ where: { userId } });
    if (pref?.languageCode && isAppLocale(pref.languageCode)) return pref.languageCode;
    return null;
  }

  async setUserPreference(userId: string, languageCode: AppLocale) {
    return prisma.userLanguagePreference.upsert({
      where: { userId },
      update: { languageCode },
      create: { userId, languageCode },
    });
  }
}

export const languageService = new LanguageService();
