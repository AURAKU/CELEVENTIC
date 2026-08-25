"use client";

import Link from "next/link";
import { Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PreferencesMenu } from "@/components/layout/preferences-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { EventSwitcher } from "@/components/layout/event-switcher";
import { GlobalSearch } from "@/components/layout/global-search";
import { UserAccountMenu } from "@/components/layout/user-account-menu";
import { HelpLink } from "@/components/layout/help-link";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";

interface DashboardTopbarProps {
  onMenuClick?: () => void;
  className?: string;
}

/**
 * Social-app topbar pattern:
 * [Menu] [Search……………………] · [Create] [Prefs] [Help] [Alerts] [You]
 */
export function DashboardTopbar({ onMenuClick, className }: DashboardTopbarProps) {
  const { t } = useLocale();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-14 sm:h-16 items-center gap-2 sm:gap-3",
        "border-b border-slate-200/60 bg-white/90 backdrop-blur-xl supports-[backdrop-filter]:bg-white/75",
        "px-3 sm:px-5 lg:px-8 pt-[env(safe-area-inset-top)]",
        className
      )}
    >
      {/* Left: navigate */}
      <button
        type="button"
        onClick={onMenuClick}
        className="lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors touch-manipulation shrink-0"
        aria-label={t("dashboard.open_menu")}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Center: search owns the bar */}
      <div className="flex-1 min-w-0 max-w-2xl" data-tour="nav-search">
        <GlobalSearch />
      </div>

      {/* Right: primary actions — same size/rhythm as social apps */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        <div className="hidden xl:flex items-center gap-1.5 mr-1 pr-2 border-r border-slate-200/80">
          <EventSwitcher compact />
          <WorkspaceSwitcher compact />
        </div>

        <Link
          href="/dashboard/events/create"
          className="shrink-0"
          aria-label={t("dashboard.create_event")}
          data-tour="nav-create"
        >
          <span className="sm:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#D4A63A] to-[#C4952E] text-slate-900 shadow-sm">
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <Button
            size="sm"
            className="hidden sm:inline-flex h-10 rounded-xl px-3.5 bg-gradient-to-r from-[#D4A63A] to-[#C4952E] text-slate-900 font-semibold border-0 shadow-sm hover:opacity-95"
          >
            <Plus className="h-4 w-4 mr-1" strokeWidth={2.5} />
            Create
          </Button>
        </Link>

        <PreferencesMenu compact iconOnly />
        <HelpLink compact />
        <span data-tour="nav-notifications" className="inline-flex">
          <NotificationBell />
        </span>
        <div className="pl-1 ml-0.5 border-l border-slate-200/80" data-tour="nav-account">
          <UserAccountMenu compact />
        </div>
      </div>
    </header>
  );
}
