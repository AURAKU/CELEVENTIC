"use client";

import { Globe, Coins } from "lucide-react";
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
              "h-9 w-auto min-w-[4.5rem] gap-1.5 border-slate-200/80 bg-white/90 px-2.5 text-xs font-semibold touch-manipulation",
              compact && "h-10 min-h-[44px] sm:min-h-9"
            )}
            aria-label="Language"
          >
            <Globe className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <SelectValue>{locale.toUpperCase()}</SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            {availableLocales.map((code) => (
              <SelectItem key={code} value={code}>
                <span className="inline-flex items-center gap-2">
                  <span>{LOCALE_FLAGS[code]}</span>
                  <span>{labels[code]}</span>
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
            "h-9 w-auto min-w-[4.5rem] gap-1.5 border-slate-200/80 bg-white/90 px-2.5 text-xs font-semibold touch-manipulation",
            compact && "h-10 min-h-[44px] sm:min-h-9",
            ratesLoading && "opacity-70"
          )}
          aria-label="Currency"
        >
          <Coins className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <SelectValue>{ratesLoading ? "…" : currency}</SelectValue>
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
