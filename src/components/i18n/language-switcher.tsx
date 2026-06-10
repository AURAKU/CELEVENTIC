"use client";

import { Globe } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import type { AppLocale } from "@/lib/i18n/constants";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean;
  allowedLocales?: AppLocale[];
}

export function LanguageSwitcher({ className, compact, allowedLocales }: LanguageSwitcherProps) {
  const { locale, setLocale, labels, availableLocales } = useLocale();
  const locales = allowedLocales ?? availableLocales;

  if (locales.length <= 1) return null;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {!compact && <Globe className="h-4 w-4 text-slate-400 shrink-0" />}
      {locales.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={cn(
            "rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
            locale === code
              ? "bg-[#0B8A83] text-white"
              : "text-slate-600 hover:bg-slate-100"
          )}
          aria-pressed={locale === code}
        >
          {compact ? code.toUpperCase() : labels[code]}
        </button>
      ))}
    </div>
  );
}
