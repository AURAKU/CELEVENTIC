"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { DisplayCurrency } from "@/lib/commerce/constants";
import { storageGet, storageSet } from "@/lib/browser/safe-storage";

interface CurrencyContextValue {
  currency: DisplayCurrency;
  setCurrency: (c: DisplayCurrency) => void;
  rates: Record<string, number>;
  symbols: Record<string, string>;
  convert: (amountGhs: number) => number;
  format: (amountGhs: number) => string;
  loading: boolean;
  refreshRates: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const STORAGE_KEY = "celeventic_display_currency";
const RATE_POLL_MS = 45_000;

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<DisplayCurrency>("GHS");
  const [rates, setRates] = useState<Record<string, number>>({ GHS: 1 });
  const [symbols, setSymbols] = useState<Record<string, string>>({ GHS: "₵", USD: "$", GBP: "£" });
  const [loading, setLoading] = useState(true);

  /**
   * Rates are a nicety, never a reason to take the page down.
   *
   * This polls every 45s on every page of the app, so a single blip — an
   * offline phone, a redeploy, a 500 whose body is empty and blows up
   * `res.json()` — used to escape as an unhandled rejection and surface as the
   * app-wide error card. The last known rates stay on screen instead.
   */
  const refreshRates = useCallback(async () => {
    try {
      const res = await fetch("/api/commerce/currencies", { cache: "no-store" });
      if (!res.ok) return;
      const d = (await res.json()) as {
        success?: boolean;
        data?: { rates?: Record<string, number>; symbols?: Record<string, string> };
      };
      if (!d?.success || !d.data) return;
      if (d.data.rates) setRates(d.data.rates);
      if (d.data.symbols) setSymbols(d.data.symbols);
    } catch {
      // Keep the rates we already have.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = storageGet(STORAGE_KEY) as DisplayCurrency | null;
    if (stored && ["GHS", "USD", "GBP"].includes(stored)) setCurrencyState(stored);

    refreshRates();
    const interval = setInterval(refreshRates, RATE_POLL_MS);

    const onFocus = () => refreshRates();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshRates]);

  const setCurrency = useCallback((c: DisplayCurrency) => {
    setCurrencyState(c);
    storageSet(STORAGE_KEY, c);
  }, []);

  const convert = useCallback(
    (amountGhs: number) => {
      const rate = rates[currency] ?? 1;
      return Math.round(amountGhs * rate * 100) / 100;
    },
    [currency, rates]
  );

  const format = useCallback(
    (amountGhs: number) => {
      const converted = convert(amountGhs);
      const sym = symbols[currency] ?? currency;
      if (currency === "GHS") return `${sym}${converted.toLocaleString("en-GH")}`;
      return `${sym}${converted.toFixed(2)}`;
    },
    [convert, currency, symbols]
  );

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency, rates, symbols, convert, format, loading, refreshRates }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
