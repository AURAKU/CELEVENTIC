"use client";

import { useCurrency } from "@/components/commerce/currency-provider";
import type { DisplayCurrency } from "@/lib/commerce/constants";
import { CURRENCY_FLAGS } from "@/lib/i18n/locale-flags";
import { useLocale } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

const OPTIONS: DisplayCurrency[] = ["GHS", "USD", "GBP"];

interface CurrencySwitcherProps {
  className?: string;
  compact?: boolean;
  showFlags?: boolean;
}

export function CurrencySwitcher({ className, compact, showFlags = true }: CurrencySwitcherProps) {
  const { currency, setCurrency, loading } = useCurrency();
  const { t } = useLocale();

  if (loading) {
    return (
      <div className={cn("h-7 w-24 animate-pulse rounded-lg bg-slate-100", className)} aria-hidden />
    );
  }

  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      role="group"
      aria-label={t("commerce.currency_label")}
      title={t("commerce.currency_hint")}
    >
      {OPTIONS.map((c, index) => (
        <span key={c} className="inline-flex items-center">
          {index > 0 && <span className="px-1 text-slate-300 select-none" aria-hidden>|</span>}
          <button
            type="button"
            onClick={() => setCurrency(c)}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-all",
              currency === c
                ? "bg-[#0B8A83] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            )}
            aria-pressed={currency === c}
            aria-label={c}
          >
            {showFlags && <span className="text-sm leading-none">{CURRENCY_FLAGS[c]}</span>}
            <span>{compact ? c : c}</span>
          </button>
        </span>
      ))}
    </div>
  );
}
