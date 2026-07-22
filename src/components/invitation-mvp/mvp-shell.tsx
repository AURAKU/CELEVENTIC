"use client";

import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { Footer } from "@/components/layout/footer";
import { PreferencesMenu } from "@/components/layout/preferences-menu";
import { useLocale } from "@/components/i18n/locale-provider";

interface MvpShellProps {
  children: React.ReactNode;
  step?: number;
  title?: string;
  subtitle?: string;
  /** Full-bleed workspace for Invitation Studio (no footer, wider canvas) */
  variant?: "default" | "workspace";
}

export function MvpShell({ children, step, title, subtitle, variant = "default" }: MvpShellProps) {
  const { t } = useLocale();
  const isWorkspace = variant === "workspace";

  const steps = [
    t("flow.step_package"),
    t("flow.step_details"),
    "Sections",
    t("flow.step_addons"),
    t("flow.step_checkout"),
    "Studio",
    t("flow.step_preview"),
  ];

  return (
    <div className={`min-h-screen ${isWorkspace ? "bg-slate-100" : "bg-[#FAF8F4]"}`}>
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/90 backdrop-blur-xl">
        <div className={`mx-auto flex h-14 items-center justify-between px-4 ${isWorkspace ? "max-w-[100vw]" : "max-w-6xl"}`}>
          <Logo size="sm" />
          <div className="flex items-center gap-2 sm:gap-3">
            <PreferencesMenu compact />
            <Link href="/invitations/catalogue" className="text-sm font-medium text-[#0B8A83] hover:underline hidden sm:inline">
              {t("invitations.browse_templates")}
            </Link>
          </div>
        </div>
        {step !== undefined && (
          <div className="border-t border-slate-100 bg-white/80">
            <div className={`mx-auto flex gap-1 overflow-x-auto px-4 py-2 ${isWorkspace ? "max-w-[100vw]" : "max-w-6xl"}`}>
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

      <main
        className={
          isWorkspace
            ? "mx-auto w-full max-w-[100vw] px-2 py-3 sm:px-3 sm:py-4"
            : "mx-auto max-w-6xl px-4 py-8 sm:py-12"
        }
      >
        {(title || subtitle) && !isWorkspace && (
          <div className="mb-8 text-center">
            {title && <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A]">{title}</h1>}
            {subtitle && <p className="mt-2 text-slate-600">{subtitle}</p>}
          </div>
        )}
        {isWorkspace && (title || subtitle) && (
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 px-1">
            {title && <h1 className="font-display text-lg font-bold text-[#0F172A] sm:text-xl">{title}</h1>}
            {subtitle && <p className="text-xs text-slate-500 sm:text-sm">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>

      {!isWorkspace && <Footer />}
    </div>
  );
}
