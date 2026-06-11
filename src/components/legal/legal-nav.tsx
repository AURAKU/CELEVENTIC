"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";
import { LEGAL_POLICY_SLUGS_ORDERED, POLICY_TITLE_KEYS } from "@/lib/legal/policy-i18n";

interface LegalNavProps {
  className?: string;
}

export function LegalNav({ className }: LegalNavProps) {
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <nav className={cn("space-y-1", className)} aria-label={t("legal.nav_aria")}>
      <Link
        href="/legal"
        className={cn(
          "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          pathname === "/legal"
            ? "bg-brand-50 text-brand-700"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        )}
      >
        {t("legal.nav_center")}
      </Link>
      {LEGAL_POLICY_SLUGS_ORDERED.map((slug) => {
        const href = `/legal/${slug}`;
        const active = pathname === href;
        return (
          <Link
            key={slug}
            href={href}
            className={cn(
              "block rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-brand-50 text-brand-700 font-medium"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            {t(POLICY_TITLE_KEYS[slug])}
          </Link>
        );
      })}
    </nav>
  );
}
