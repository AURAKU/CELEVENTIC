"use client";

import { SessionProvider } from "next-auth/react";
import { CookieConsent } from "@/components/legal/cookie-consent";
import { CurrencyProvider } from "@/components/commerce/currency-provider";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import type { AppLocale } from "@/lib/i18n/constants";
import type { LocaleMessages } from "@/lib/i18n/static-messages";

export interface ProvidersProps {
  children: React.ReactNode;
  initialLocale?: AppLocale;
  initialMessages?: LocaleMessages;
}

export function Providers({ children, initialLocale, initialMessages }: ProvidersProps) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <LocaleProvider initialLocale={initialLocale} initialMessages={initialMessages}>
        <CurrencyProvider>
          {children}
          <CookieConsent />
        </CurrencyProvider>
      </LocaleProvider>
    </SessionProvider>
  );
}
