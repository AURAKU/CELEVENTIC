"use client";

import { useLocale } from "@/components/i18n/locale-provider";
import { useCurrency } from "@/components/commerce/currency-provider";
import type { DisplayCurrency } from "@/lib/commerce/constants";
import type { AppLocale } from "@/lib/i18n/constants";
import { LOCALE_FLAGS } from "@/lib/i18n/locale-flags";
import { CURRENCY_FLAGS } from "@/lib/i18n/locale-flags";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface HeaderPreferencesDropdownsProps {
  className?: string;
  compact?: boolean;
}

const CURRENCIES: DisplayCurrency[] = ["GHS", "USD", "GBP"];

/** Compact language + currency dropdowns for dashboard/marketing headers */
export function HeaderPreferencesDropdowns({
  className,
  compact = false,
}: HeaderPreferencesDropdownsProps) {
  const { locale, setLocale, labels, availableLocales } = useLocale();
  const { currency, setCurrency, loading: ratesLoading } = useCurrency();

  return (
    <div className={cn("flex items-center gap-1.5 shrink-0", className)}>
      {availableLocales.length > 1 && (
        <Select value={locale} onValueChange={(v) => setLocale(v as AppLocale)}>
          <SelectTrigger
            className={cn(
              "h-9 w-auto min-w-[5rem] gap-1.5 border-slate-200/80 bg-white/90 px-2.5 text-xs font-semibold touch-manipulation",
              compact && "h-10 min-h-[44px] sm:min-h-9"
            )}
            aria-label="Language"
          >
            <span className="text-base leading-none shrink-0" aria-hidden>
              {LOCALE_FLAGS[locale]}
            </span>
            <SelectValue placeholder={locale.toUpperCase()} />
          </SelectTrigger>
          <SelectContent align="end">
            {availableLocales.map((code) => (
              <SelectItem key={code} value={code}>
                <span className="inline-flex items-center gap-2">
                  <span>{LOCALE_FLAGS[code]}</span>
                  <span>{compact ? code.toUpperCase() : labels[code]}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={currency}
        onValueChange={(v) => setCurrency(v as DisplayCurrency)}
        disabled={ratesLoading}
      >
        <SelectTrigger
          className={cn(
            "h-9 w-auto min-w-[5rem] gap-1.5 border-slate-200/80 bg-white/90 px-2.5 text-xs font-semibold touch-manipulation",
            compact && "h-10 min-h-[44px] sm:min-h-9",
            ratesLoading && "opacity-70"
          )}
          aria-label="Currency"
        >
          <span className="text-base leading-none shrink-0" aria-hidden>
            {CURRENCY_FLAGS[currency]}
          </span>
          <SelectValue placeholder={currency} />
        </SelectTrigger>
        <SelectContent align="end">
          {CURRENCIES.map((c) => (
            <SelectItem key={c} value={c}>
              <span className="inline-flex items-center gap-2">
                <span>{CURRENCY_FLAGS[c]}</span>
                <span>{c}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
