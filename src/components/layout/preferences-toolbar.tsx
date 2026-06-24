"use client";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { CurrencySwitcher } from "@/components/commerce/currency-switcher";
import type { AppLocale } from "@/lib/i18n/constants";
import { cn } from "@/lib/utils";

interface PreferencesToolbarProps {
  className?: string;
  allowedLocales?: AppLocale[];
  showLanguage?: boolean;
  showCurrency?: boolean;
  vertical?: boolean;
  /** Inline header styling vs floating overlay pill */
  variant?: "floating" | "inline";
}

/** Combined EN|FR + GHS|USD|GBP switchers with flags */
export function PreferencesToolbar({
  className,
  allowedLocales,
  showLanguage = true,
  showCurrency = true,
  vertical = false,
  variant = "floating",
}: PreferencesToolbarProps) {
  const inline = variant === "inline";

  return (
    <div
      className={cn(
        "inline-flex items-center shrink-0",
        inline
          ? "gap-1 rounded-xl border border-slate-200/60 bg-white/90 p-1"
          : "gap-2 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-[0_4px_24px_rgba(15,23,42,0.08)] p-1.5",
        vertical && "flex-col items-stretch",
        className
      )}
    >
      {showLanguage && (
        <LanguageSwitcher
          compact
          showFlags
          flagsOnDesktopOnly={false}
          touchFriendly={inline}
          allowedLocales={allowedLocales}
        />
      )}
      {showLanguage && showCurrency && (
        <span className={cn("bg-slate-200", vertical ? "h-px w-full" : "w-px h-5")} aria-hidden />
      )}
      {showCurrency && (
        <CurrencySwitcher compact showFlags flagsOnDesktopOnly={false} touchFriendly={inline} />
      )}
    </div>
  );
}
