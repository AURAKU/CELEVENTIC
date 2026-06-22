"use client";

import { useLocale } from "@/components/i18n/locale-provider";
import type { AppLocale } from "@/lib/i18n/constants";
import { LOCALE_FLAGS } from "@/lib/i18n/locale-flags";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean;
  showFlags?: boolean;
  /** Hide flag emoji on small screens (header row) */
  flagsOnDesktopOnly?: boolean;
  /** Larger tap targets for mobile header */
  touchFriendly?: boolean;
  allowedLocales?: AppLocale[];
}

export function LanguageSwitcher({
  className,
  compact,
  showFlags = true,
  flagsOnDesktopOnly = false,
  touchFriendly = false,
  allowedLocales,
}: LanguageSwitcherProps) {
  const { locale, setLocale, labels, availableLocales } = useLocale();
  const locales = allowedLocales ?? availableLocales;

  if (locales.length <= 1) return null;

  return (
    <div className={cn("inline-flex items-center gap-0.5", className)} role="group" aria-label="Language">
      {locales.map((code, index) => (
        <span key={code} className="inline-flex items-center">
          {index > 0 && <span className="px-1 text-slate-300 select-none" aria-hidden>|</span>}
          <button
            type="button"
            onClick={() => setLocale(code)}
            className={cn(
              "inline-flex items-center justify-center gap-1 rounded-lg text-xs font-semibold transition-all touch-manipulation",
              touchFriendly ? "min-h-[44px] min-w-[44px] px-2.5 py-2 sm:min-h-0 sm:min-w-0 sm:px-2 sm:py-1" : "px-2 py-1",
              locale === code
                ? "bg-[#0B8A83] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            )}
            aria-pressed={locale === code}
            aria-label={labels[code]}
          >
            {showFlags && (
              <span
                className={cn("text-sm leading-none", flagsOnDesktopOnly && "hidden sm:inline")}
              >
                {LOCALE_FLAGS[code]}
              </span>
            )}
            <span>{compact ? code.toUpperCase() : labels[code]}</span>
          </button>
        </span>
      ))}
    </div>
  );
}
