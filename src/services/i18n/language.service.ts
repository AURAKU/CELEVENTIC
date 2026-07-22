import { prisma } from "@/lib/prisma";
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/constants";

const MVP_LANGUAGES = [
  { code: "en", name: "English", enabled: true, isDefault: true },
  { code: "fr", name: "French", enabled: true, isDefault: false },
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

  async getUserPreference(userId: string): Promise<AppLocale> {
    const pref = await prisma.userLanguagePreference.findUnique({ where: { userId } });
    if (pref?.languageCode === "fr") return "fr";
    return DEFAULT_LOCALE;
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
