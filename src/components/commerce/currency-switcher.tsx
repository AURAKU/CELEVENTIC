"use client";

import { useCurrency } from "@/components/commerce/currency-provider";
import type { DisplayCurrency } from "@/lib/commerce/constants";

const OPTIONS: DisplayCurrency[] = ["GHS", "USD", "GBP"];

export function CurrencySwitcher({ className = "" }: { className?: string }) {
  const { currency, setCurrency, loading } = useCurrency();

  if (loading) return null;

  return (
    <div className={`inline-flex rounded-xl border border-slate-200/80 bg-white p-1 ${className}`}>
      {OPTIONS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => setCurrency(c)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            currency === c
              ? "bg-[#0B8A83] text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
