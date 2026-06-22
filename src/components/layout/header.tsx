"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/layout/logo";
import { PreferencesToolbar } from "@/components/layout/preferences-toolbar";
import { Button } from "@/components/ui/button";
import { isAdminRole } from "@/lib/roles";
import type { UserRole } from "@prisma/client";
import { useLocale } from "@/components/i18n/locale-provider";

interface HeaderProps {
  initialSession?: Session | null;
}

const navLinkKeys = [
  { href: "#features", key: "header.features" },
  { href: "#invitations", key: "header.invitations" },
  { href: "/templates", key: "header.templates" },
  { href: "#pricing", key: "header.pricing" },
  { href: "/discover", key: "header.discover" },
] as const;

export function Header({ initialSession }: HeaderProps) {
  const { t } = useLocale();
  const { data: clientSession } = useSession();
  const session = clientSession ?? initialSession;
  const [mobileOpen, setMobileOpen] = useState(false);

  const dashboardHref =
    session?.user?.role && isAdminRole(session.user.role as UserRole) && !session.user.isAdminView
      ? "/admin"
      : "/dashboard";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/50 bg-white/85 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex min-h-[4.5rem] sm:min-h-[5rem] max-w-7xl items-center gap-2 sm:gap-4 px-4 sm:px-6 lg:px-8 py-1">
        <div className="shrink-0 min-w-0">
          <Logo size="lg" className="hidden sm:flex" />
          <Logo size="md" className="flex sm:hidden" />
        </div>

        <nav className="hidden md:flex flex-1 items-center justify-center gap-1 min-w-0">
          {navLinkKeys.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-brand-600 rounded-lg hover:bg-brand-50/50 transition-all whitespace-nowrap"
            >
              {t(link.key)}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
          <PreferencesToolbar variant="inline" />

          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <Button asChild>
                <Link href={dashboardHref}>{t("common.dashboard")}</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/auth/login">{t("common.sign_in")}</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/register">{t("common.get_started")}</Link>
                </Button>
              </>
            )}
          </div>

          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl hover:bg-slate-100 transition-colors touch-manipulation"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? t("dashboard.close_menu") : t("dashboard.open_menu")}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200/60 bg-white/95 backdrop-blur-xl px-4 py-4 space-y-2">
          {navLinkKeys.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block px-3 py-2.5 text-sm font-medium text-slate-600 rounded-xl hover:bg-brand-50 touch-manipulation"
              onClick={() => setMobileOpen(false)}
            >
              {t(link.key)}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
            {session ? (
              <Button asChild>
                <Link href={dashboardHref}>{t("common.dashboard")}</Link>
              </Button>
            ) : (
              <>
                <Button variant="outline" asChild>
                  <Link href="/auth/login">{t("common.sign_in")}</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/register">{t("common.get_started")}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
