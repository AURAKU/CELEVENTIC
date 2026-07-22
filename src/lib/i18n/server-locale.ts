import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/constants";
import { parseLocaleCookie, LOCALE_COOKIE_NAME } from "@/lib/i18n/locale-cookie";
import {
  buildStaticMessageDictionaries,
  mergeMessageDictionaries,
  type LocaleMessages,
} from "@/lib/i18n/static-messages";
import { languageService } from "@/services/i18n/language.service";
import { prisma } from "@/lib/prisma";

export interface ServerI18nState {
  locale: AppLocale;
  messages: LocaleMessages;
}

/**
 * Resolve locale + dictionaries for SSR.
 * Uses the static bundle by default and only merges existing DB rows.
 * Never seeds translations on the request path (seeding lives in /api/i18n/bootstrap
 * and admin routes) — seeding on every layout was locking SQLite and crashing pages.
 */
export async function getServerI18nState(): Promise<ServerI18nState> {
  const staticMessages = buildStaticMessageDictionaries();
  let locale = parseLocaleCookie((await cookies()).get(LOCALE_COOKIE_NAME)?.value);

  try {
    const session = await getSession();
    if (session?.user?.id) {
      locale = await languageService.getUserPreference(session.user.id);
    }
  } catch {
    locale = DEFAULT_LOCALE;
  }

  let messages = staticMessages;
  try {
    const rows = await prisma.translation.findMany({
      orderBy: [{ namespace: "asc" }, { key: "asc" }],
    });
    if (rows.length > 0) {
      const en: Record<string, string> = { ...staticMessages.en };
      const fr: Record<string, string> = { ...staticMessages.fr };
      for (const row of rows) {
        const fk = `${row.namespace}.${row.key}`;
        en[fk] = row.enValue;
        fr[fk] = row.frValue ?? row.enValue;
      }
      messages = mergeMessageDictionaries(staticMessages, { en, fr });
    }
  } catch {
    // Static bundle is sufficient for first paint.
  }

  return { locale, messages };
}
