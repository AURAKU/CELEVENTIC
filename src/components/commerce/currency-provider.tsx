"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { DisplayCurrency } from "@/lib/commerce/constants";

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

  const refreshRates = useCallback(async () => {
    try {
      const res = await fetch("/api/commerce/currencies", { cache: "no-store" });
      const d = await res.json();
      if (d.success) {
        setRates(d.data.rates);
        setSymbols(d.data.symbols);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as DisplayCurrency | null;
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
    localStorage.setItem(STORAGE_KEY, c);
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
