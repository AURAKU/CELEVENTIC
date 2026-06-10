"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useSession } from "next-auth/react";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  LOCALE_LABELS,
  type AppLocale,
  isAppLocale,
} from "@/lib/i18n/constants";
import type { MessageDictionary } from "@/services/i18n/translation.service";

interface LocaleContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  labels: Record<AppLocale, string>;
  loading: boolean;
  availableLocales: AppLocale[];
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [locale, setLocaleState] = useState<AppLocale>(DEFAULT_LOCALE);
  const [messages, setMessages] = useState<{ en: MessageDictionary; fr: MessageDictionary }>({
    en: {},
    fr: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && isAppLocale(stored)) setLocaleState(stored);

    fetch("/api/i18n/bootstrap")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setMessages(d.data.messages);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;
    fetch("/api/i18n/preferences")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && isAppLocale(d.data.languageCode)) {
          setLocaleState(d.data.languageCode);
          localStorage.setItem(LOCALE_STORAGE_KEY, d.data.languageCode);
        }
      });
  }, [status, session?.user?.id]);

  const setLocale = useCallback(
    (next: AppLocale) => {
      setLocaleState(next);
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
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

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const dict = messages[locale] ?? messages.en;

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const raw = dict[key] ?? dict[`common.${key}`] ?? key;
      if (!params) return raw;
      return raw.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`));
    },
    [dict]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      labels: LOCALE_LABELS,
      loading,
      availableLocales: ["en", "fr"] as AppLocale[],
    }),
    [locale, setLocale, t, loading]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
