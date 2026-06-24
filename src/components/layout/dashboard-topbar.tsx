"use client";

import Link from "next/link";
import { Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeaderPreferencesDropdowns } from "@/components/layout/header-preferences-dropdowns";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { GlobalSearch } from "@/components/layout/global-search";
import { UserAccountMenu, LogoutButton } from "@/components/layout/user-account-menu";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";

interface DashboardTopbarProps {
  onMenuClick?: () => void;
  className?: string;
}

export function DashboardTopbar({ onMenuClick, className }: DashboardTopbarProps) {
  const { t } = useLocale();

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
        <div className="hidden sm:flex flex-1 min-w-0 max-w-md">
          <GlobalSearch />
        </div>
        <Link href="/dashboard/events/create" className="sm:hidden shrink-0" aria-label={t("dashboard.create_event")}>
          <Button
            size="icon"
            className="min-h-[44px] min-w-[44px] bg-gradient-to-r from-[#D4A63A] to-[#C4952E] text-slate-900 font-semibold border-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <div className="hidden md:block">
          <WorkspaceSwitcher compact />
        </div>
        <HeaderPreferencesDropdowns compact />
        <NotificationBell />
        <div className="hidden sm:flex items-center pl-1 sm:pl-2 border-l border-slate-200/80">
          <UserAccountMenu compact />
        </div>
        <div className="sm:hidden pl-1 border-l border-slate-200/80">
          <LogoutButton showLabel={false} />
        </div>
      </div>
    </header>
  );
}
