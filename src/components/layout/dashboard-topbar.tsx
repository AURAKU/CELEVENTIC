"use client";

import { useSession, signOut } from "next-auth/react";
import { Bell, Search, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

interface DashboardTopbarProps {
  onMenuClick?: () => void;
  className?: string;
}

export function DashboardTopbar({ onMenuClick, className }: DashboardTopbarProps) {
  const { data: session } = useSession();
  const { t } = useLocale();
  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "CE";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl px-4 sm:px-6 lg:px-8",
        className
      )}
    >
      <div className="flex items-center gap-3 flex-1">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors"
          aria-label={t("dashboard.open_menu")}
        >
          <Menu className="h-5 w-5 text-slate-600" />
        </button>
        <div className="hidden sm:flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder={t("dashboard.search_placeholder")}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200/80 bg-slate-50/80 text-sm placeholder:text-slate-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <LanguageSwitcher compact />
        <Button variant="ghost" size="icon" className="relative rounded-xl">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-gold-400 ring-2 ring-white" />
        </Button>

        <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-slate-200/80">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-semibold text-slate-900 leading-tight">{session?.user?.name}</p>
            <p className="text-xs text-slate-500">{session?.user?.email}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white shadow-md">
            {initials}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl text-slate-500 hover:text-red-600"
            onClick={() => signOut({ callbackUrl: "/" })}
            aria-label={t("common.sign_out")}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
