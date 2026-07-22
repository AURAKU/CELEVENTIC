"use client";

import { useEffect, useId, useRef, useState } from "react";
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

/** Orbital globe mark — modern, brand-aligned, readable at 16–18px */
function GlobeMark({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const orbitId = `pref-globe-orbit-${uid}`;
  const dotId = `pref-globe-dot-${uid}`;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.35" opacity="0.35" />
      <ellipse
        cx="12"
        cy="12"
        rx="3.4"
        ry="8.25"
        stroke="currentColor"
        strokeWidth="1.25"
        opacity="0.55"
      />
      <path
        d="M4.1 12h15.8"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.45"
      />
      <path
        d="M5.2 8.15c2.35 1.05 5.05 1.6 6.8 1.6s4.45-.55 6.8-1.6"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M5.2 15.85c2.35-1.05 5.05-1.6 6.8-1.6s4.45.55 6.8 1.6"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="10.4"
        ry="4.1"
        stroke={`url(#${orbitId})`}
        strokeWidth="1.4"
        strokeLinecap="round"
        transform="rotate(-28 12 12)"
      />
      <circle cx="20.15" cy="8.05" r="1.35" fill={`url(#${dotId})`} />
      <defs>
        <linearGradient id={orbitId} x1="2" y1="12" x2="22" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0B8A83" />
          <stop offset="0.55" stopColor="#14B8A6" />
          <stop offset="1" stopColor="#F97316" />
        </linearGradient>
        <radialGradient
          id={dotId}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(20.15 8.05) rotate(90) scale(1.35)"
        >
          <stop stopColor="#FB923C" />
          <stop offset="1" stopColor="#EA580C" />
        </radialGradient>
      </defs>
    </svg>
  );
}

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
          "group/pref relative inline-flex items-center justify-center touch-manipulation",
          "rounded-[1.15rem] p-[1px]",
          "bg-gradient-to-br from-teal-400/35 via-white/45 to-orange-400/30",
          "shadow-[0_0_0_1px_rgba(15,118,110,0.06)]",
          "transition-[transform,box-shadow] duration-300 ease-out",
          "hover:scale-[1.02] hover:shadow-[0_0_0_1px_rgba(20,184,166,0.16),0_6px_18px_rgba(15,118,110,0.1)]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
          open && "shadow-[0_0_0_1px_rgba(20,184,166,0.22),0_6px_18px_rgba(15,118,110,0.12)]"
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Language and currency"
      >
        <span
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-[1.08rem]",
            "bg-white/45 backdrop-blur-md supports-[backdrop-filter]:bg-white/30",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
            "text-xs font-semibold tracking-wide text-slate-700",
            compact
              ? "min-h-[44px] min-w-[44px] px-2.5 sm:min-h-9 sm:min-w-0 sm:px-3"
              : "h-9 px-3"
          )}
        >
          <GlobeMark className="h-[1.125rem] w-[1.125rem] shrink-0 text-[#0B8A83]" />
          <span
            className={cn(
              "inline-flex items-center gap-1.5 tabular-nums",
              compact && "hidden sm:inline-flex"
            )}
          >
            {showLanguage && (
              <span className="text-[0.95rem] leading-none" aria-hidden>
                {LOCALE_FLAGS[locale]}
              </span>
            )}
            {showLanguage && (
              <span
                className="h-1 w-1 rounded-full bg-gradient-to-br from-teal-500/70 to-orange-400/80"
                aria-hidden
              />
            )}
            <span className="text-[11px] font-bold tracking-[0.06em] text-slate-800">{currency}</span>
          </span>
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Preferences"
          className={cn(
            "absolute right-0 top-[calc(100%+0.55rem)] z-[100]",
            "w-[min(17rem,calc(100vw-2rem))] overflow-hidden",
            "rounded-[1.25rem] p-[1px]",
            "bg-gradient-to-br from-teal-400/30 via-white to-orange-400/25",
            "shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
          )}
        >
          <div className="rounded-[1.2rem] bg-white/95 backdrop-blur-xl p-4">
            {showLanguage && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Language
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {availableLocales.map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        setLocale(code as AppLocale);
                      }}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors touch-manipulation",
                        locale === code
                          ? "bg-[#0B8A83] text-white shadow-sm"
                          : "bg-slate-50/90 text-slate-700 hover:bg-slate-100"
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Currency
              </p>
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
                      "flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-xs font-semibold transition-colors touch-manipulation",
                      currency === c
                        ? "bg-[#0B8A83] text-white shadow-sm"
                        : "bg-slate-50/90 text-slate-700 hover:bg-slate-100",
                      ratesLoading && "opacity-60"
                    )}
                    aria-pressed={currency === c}
                  >
                    <span className="text-base leading-none">{CURRENCY_FLAGS[c]}</span>
                    <span className="tracking-wide">{c}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
