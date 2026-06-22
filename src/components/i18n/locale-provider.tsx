"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useSession } from "next-auth/react";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  LOCALE_LABELS,
  type AppLocale,
  isAppLocale,
} from "@/lib/i18n/constants";
import { localeCookieHeader } from "@/lib/i18n/locale-cookie";
import { mergeMessageDictionaries, STATIC_MESSAGE_DICTIONARIES, type LocaleMessages } from "@/lib/i18n/static-messages";
import { resolveTranslation } from "@/lib/i18n/translate";

interface LocaleContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  labels: Record<AppLocale, string>;
  /** True once dictionaries are safe to render (always true after mount with SSR props). */
  ready: boolean;
  /** Background refresh of admin-edited copy from API. */
  loading: boolean;
  availableLocales: AppLocale[];
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export interface LocaleProviderProps {
  children: React.ReactNode;
  initialLocale?: AppLocale;
  initialMessages?: LocaleMessages;
}

export function LocaleProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
  initialMessages,
}: LocaleProviderProps) {
  const { data: session, status } = useSession();
  const [locale, setLocaleState] = useState<AppLocale>(initialLocale);
  const [messages, setMessages] = useState<LocaleMessages>(
    initialMessages ?? STATIC_MESSAGE_DICTIONARIES
  );
  const [ready] = useState(true);
  const [loading, setLoading] = useState(false);
  const hydrated = useRef(false);

  // Keep locale in sync if server props change (e.g. after navigation).
  useEffect(() => {
    setLocaleState(initialLocale);
  }, [initialLocale]);

  useEffect(() => {
    if (initialMessages) setMessages(initialMessages);
  }, [initialMessages]);

  // One-time client hydration: align localStorage with server locale (no flash).
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  // Background merge of DB/admin translations (never blocks first paint).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/i18n/bootstrap", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d.success) return;
        setMessages((prev) => mergeMessageDictionaries(prev, d.data.messages));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Authenticated user preference — only apply if different from current (post-login).
  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;
    fetch("/api/i18n/preferences")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && isAppLocale(d.data.languageCode)) {
          setLocaleState((current) => {
            if (current === d.data.languageCode) return current;
            localStorage.setItem(LOCALE_STORAGE_KEY, d.data.languageCode);
            document.cookie = localeCookieHeader(d.data.languageCode);
            document.documentElement.lang = d.data.languageCode;
            return d.data.languageCode;
          });
        }
      });
  }, [status, session?.user?.id]);

  const setLocale = useCallback(
    (next: AppLocale) => {
      setLocaleState(next);
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
      document.cookie = localeCookieHeader(next);
      document.documentElement.lang = next;
      if (session?.user?.id) {
        fetch("/api/i18n/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ languageCode: next }),
        });
      }
    },
    [session?.user?.id]
  );

  const dict = useMemo(
    () => messages[locale] ?? messages.en ?? {},
    [messages, locale]
  );

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      resolveTranslation(key, locale, dict, params),
    [dict, locale]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      labels: LOCALE_LABELS,
      ready,
      loading,
      availableLocales: ["en", "fr"] as AppLocale[],
    }),
    [locale, setLocale, t, ready, loading]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
