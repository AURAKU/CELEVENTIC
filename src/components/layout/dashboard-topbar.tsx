"use client";

import { useSession, signOut } from "next-auth/react";
import { Search, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeaderPreferencesDropdowns } from "@/components/layout/header-preferences-dropdowns";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";

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
        "sticky top-0 z-40 flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4 border-b border-slate-200/60 bg-white/85 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70 px-3 sm:px-6 lg:px-8 pt-[env(safe-area-inset-top)]",
        className
      )}
    >
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl hover:bg-slate-100 transition-colors touch-manipulation shrink-0"
          aria-label={t("dashboard.open_menu")}
        >
          <Menu className="h-5 w-5 text-slate-600" />
        </button>
        <div className="hidden md:flex items-center gap-2 flex-1 max-w-md min-w-0">
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

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <HeaderPreferencesDropdowns compact />

        <NotificationBell />

        <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 border-l border-slate-200/80">
          <div className="hidden lg:block text-right">
            <p className="text-sm font-semibold text-slate-900 leading-tight truncate max-w-[140px]">
              {session?.user?.name}
            </p>
            <p className="text-xs text-slate-500 truncate max-w-[140px]">{session?.user?.email}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white shadow-md shrink-0">
            {initials}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl text-slate-500 hover:text-red-600 min-h-[44px] min-w-[44px] sm:min-h-9 sm:min-w-9 touch-manipulation"
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
