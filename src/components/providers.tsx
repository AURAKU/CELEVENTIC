"use client";

import { SessionProvider } from "next-auth/react";
import { CookieConsent } from "@/components/legal/cookie-consent";
import { CurrencyProvider } from "@/components/commerce/currency-provider";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { GlobalPreferences } from "@/components/layout/global-preferences";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <LocaleProvider>
        <CurrencyProvider>
          {children}
          <GlobalPreferences />
          <CookieConsent />
        </CurrencyProvider>
      </LocaleProvider>
    </SessionProvider>
  );
}
