"use client";

import { useEffect, useRef, useState } from "react";
import { Globe } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { useCurrency } from "@/components/commerce/currency-provider";
import type { DisplayCurrency } from "@/lib/commerce/constants";
import type { AppLocale } from "@/lib/i18n/constants";
import { LOCALE_FLAGS, CURRENCY_FLAGS } from "@/lib/i18n/locale-flags";
import { cn } from "@/lib/utils";

interface PreferencesMenuProps {
  className?: string;
  /** Icon-only on small screens */
  compact?: boolean;
}

const CURRENCIES: DisplayCurrency[] = ["GHS", "USD", "GBP"];

/** Single control — tap to open language & currency picker (avoids crowded header). */
export function PreferencesMenu({ className, compact = false }: PreferencesMenuProps) {
  const { locale, setLocale, labels, availableLocales } = useLocale();
  const { currency, setCurrency, loading: ratesLoading } = useCurrency();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const showLanguage = availableLocales.length > 1;

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/90 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 touch-manipulation",
          compact ? "min-h-[44px] min-w-[44px] px-2.5 sm:min-h-9 sm:min-w-0 sm:px-3" : "h-9 px-3"
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Language and currency"
      >
        <Globe className="h-4 w-4 text-[#0B8A83] shrink-0" />
        <span className={cn("inline-flex items-center gap-1", compact && "hidden sm:inline-flex")}>
          {showLanguage && <span aria-hidden>{LOCALE_FLAGS[locale]}</span>}
          {showLanguage && <span className="text-slate-400">·</span>}
          <span>{currency}</span>
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Preferences"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-[100] w-[min(17rem,calc(100vw-2rem))] rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xl"
        >
          {showLanguage && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Language</p>
              <div className="grid grid-cols-2 gap-1.5">
                {availableLocales.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setLocale(code as AppLocale);
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors touch-manipulation",
                      locale === code
                        ? "bg-[#0B8A83] text-white"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                    )}
                    aria-pressed={locale === code}
                  >
                    <span className="text-base leading-none">{LOCALE_FLAGS[code]}</span>
                    <span>{labels[code]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={cn("space-y-2", showLanguage && "mt-4 pt-4 border-t border-slate-100")}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Currency</p>
            <div className="grid grid-cols-3 gap-1.5">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={ratesLoading}
                  onClick={() => {
                    setCurrency(c);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-xs font-semibold transition-colors touch-manipulation",
                    currency === c
                      ? "bg-[#0B8A83] text-white"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100",
                    ratesLoading && "opacity-60"
                  )}
                  aria-pressed={currency === c}
                >
                  <span className="text-base leading-none">{CURRENCY_FLAGS[c]}</span>
                  <span>{c}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
