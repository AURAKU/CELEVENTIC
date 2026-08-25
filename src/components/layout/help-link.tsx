"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";

interface HelpLinkProps {
  href?: string;
  label?: string;
  className?: string;
  /** Topbar: quiet icon that matches notifications / prefs */
  compact?: boolean;
}

/** Entry to Celeventic Guide / FAQ. */
export function HelpLink({
  href = "/legal/faq",
  label,
  className,
  compact = false,
}: HelpLinkProps) {
  const { t } = useLocale();
  const resolvedLabel = label ?? t("dashboard.nav_help");

  if (compact) {
    return (
      <Link
        href={href}
        title={resolvedLabel}
        aria-label={resolvedLabel}
        className={cn(
          "hidden sm:inline-flex items-center justify-center",
          "h-10 w-10 rounded-xl text-slate-600",
          "hover:bg-slate-100 hover:text-brand-700",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
          "transition-colors touch-manipulation",
          className
        )}
      >
        <BookOpen className="h-5 w-5" strokeWidth={2} aria-hidden />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600 transition-colors",
        className
      )}
    >
      <BookOpen className="h-4 w-4" aria-hidden />
      <span>{resolvedLabel}</span>
    </Link>
  );
}
