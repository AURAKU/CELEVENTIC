"use client";

import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { Footer } from "@/components/layout/footer";
import { useLocale } from "@/components/i18n/locale-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

interface MvpShellProps {
  children: React.ReactNode;
  step?: number;
  title?: string;
  subtitle?: string;
}

export function MvpShell({ children, step, title, subtitle }: MvpShellProps) {
  const { t } = useLocale();

  const steps = [
    t("flow.step_package"),
    t("flow.step_details"),
    t("flow.step_addons"),
    "Blocks",
    t("flow.step_preview"),
    t("flow.step_checkout"),
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F4]">
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <LanguageSwitcher compact />
            <Link href="/invitations/catalogue" className="text-sm font-medium text-[#0B8A83] hover:underline">
              {t("invitations.browse_templates")}
            </Link>
          </div>
        </div>
        {step !== undefined && (
          <div className="border-t border-slate-100 bg-white/80">
            <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2">
              {steps.map((label, i) => (
                <div
                  key={label}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                    i === step
                      ? "bg-[#0B8A83] text-white"
                      : i < step
                        ? "bg-[#0B8A83]/10 text-[#0B8A83]"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {i + 1}. {label}
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        {(title || subtitle) && (
          <div className="mb-8 text-center">
            {title && <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A]">{title}</h1>}
            {subtitle && <p className="mt-2 text-slate-600">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>

      <Footer />
    </div>
  );
}
