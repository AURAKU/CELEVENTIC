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
import { translationService } from "@/services/i18n/translation.service";

export interface ServerI18nState {
  locale: AppLocale;
  messages: LocaleMessages;
}

/** Resolve locale + merged dictionaries on the server for SSR/hydration parity. */
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
    const bootstrap = await translationService.getBootstrapPayload();
    messages = mergeMessageDictionaries(staticMessages, bootstrap.messages);
  } catch {
    // Static bundle is sufficient for first paint.
  }

  return { locale, messages };
}
