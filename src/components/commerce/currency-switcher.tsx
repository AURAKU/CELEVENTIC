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
  flagsOnDesktopOnly?: boolean;
  touchFriendly?: boolean;
}

export function CurrencySwitcher({
  className,
  compact,
  showFlags = true,
  flagsOnDesktopOnly = false,
  touchFriendly = false,
}: CurrencySwitcherProps) {
  const { currency, setCurrency, loading: ratesLoading } = useCurrency();
  const { t } = useLocale();

  const currencyLabel = t("commerce.currency_label");
  const currencyHint = t("commerce.currency_hint");

  if (ratesLoading) {
    return (
      <div
        className={cn("inline-flex items-center gap-0.5", className)}
        role="group"
        aria-label={currencyLabel}
        aria-busy="true"
      >
        {OPTIONS.map((c) => (
          <span
            key={c}
            className={cn(
              "inline-flex animate-pulse rounded-lg bg-slate-100",
              touchFriendly
                ? "min-h-[44px] min-w-[44px] sm:min-h-7 sm:min-w-[2.5rem]"
                : "h-7 min-w-[2.5rem]"
            )}
            aria-hidden
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      role="group"
      aria-label={currencyLabel}
      title={currencyHint}
    >
      {OPTIONS.map((c, index) => (
        <span key={c} className="inline-flex items-center">
          {index > 0 && <span className="px-1 text-slate-300 select-none" aria-hidden>|</span>}
          <button
            type="button"
            onClick={() => setCurrency(c)}
            className={cn(
              "inline-flex items-center justify-center gap-1 rounded-lg text-xs font-semibold transition-all touch-manipulation",
              touchFriendly ? "min-h-[44px] min-w-[44px] px-2.5 py-2 sm:min-h-0 sm:min-w-0 sm:px-2 sm:py-1" : "px-2 py-1",
              currency === c
                ? "bg-[#0B8A83] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            )}
            aria-pressed={currency === c}
            aria-label={c}
          >
            {showFlags && (
              <span
                className={cn("text-sm leading-none", flagsOnDesktopOnly && "hidden sm:inline")}
              >
                {CURRENCY_FLAGS[c]}
              </span>
            )}
            <span>{compact ? c : c}</span>
          </button>
        </span>
      ))}
    </div>
  );
}
