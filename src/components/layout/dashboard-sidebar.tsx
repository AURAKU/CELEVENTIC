"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import {
  Plus, QrCode, MessageSquare, Shield, X, ChevronDown, ChevronRight, LogOut,
} from "lucide-react";
import { performLogout } from "@/lib/auth/logout";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/layout/global-search";
import { EventWorkspaceNav } from "@/components/layout/event-workspace-nav";
import { useEventWorkspace, getActiveEventId, setActiveEventId as persistActiveEventId } from "@/hooks/use-event-workspace";
import { isAdminRole } from "@/lib/roles";
import { useLocale } from "@/components/i18n/locale-provider";
import type { WorkspaceId } from "@/lib/navigation/dashboard-nav";
import { getFilteredNavSections } from "@/lib/navigation/nav-filter";
import { getStoredWorkspace } from "@/components/layout/workspace-switcher";
import type { AccountType, UserRole } from "@prisma/client";

interface DashboardSidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function DashboardSidebar({ mobileOpen = false, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { t } = useLocale();
  const [accountWorkspace, setAccountWorkspace] = useState<WorkspaceId>("organizer");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [loggingOut, setLoggingOut] = useState(false);

  const [activeEventId, setActiveEventId] = useState("");
  const { workspace: eventWorkspace } = useEventWorkspace(activeEventId || undefined);

  const isAdmin = session?.user?.role && isAdminRole(session.user.role as UserRole);

  useEffect(() => {
    setActiveEventId(getActiveEventId());
    const handler = (e: Event) => {
      setActiveEventId((e as CustomEvent<string>).detail || getActiveEventId());
    };
    window.addEventListener("celeventic:active-event", handler);
    return () => window.removeEventListener("celeventic:active-event", handler);
  }, []);

  useEffect(() => {
    const match = pathname.match(/^\/dashboard\/events\/([^/]+)/);
    if (match?.[1] && match[1] !== "create") {
      setActiveEventId(match[1]);
      persistActiveEventId(match[1]);
    }
  }, [pathname]);

  useEffect(() => {
    setAccountWorkspace(getStoredWorkspace());
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<WorkspaceId>).detail;
      if (detail) setAccountWorkspace(detail);
    };
    window.addEventListener("celeventic:workspace", handler);
    return () => window.removeEventListener("celeventic:workspace", handler);
  }, []);

  const accountType = session?.user?.accountType as AccountType | undefined;
  const sections = useMemo(() => {
    return getFilteredNavSections(accountWorkspace, accountType);
  }, [accountWorkspace, accountType]);

  function isActive(href: string, exact?: boolean) {
    const [path, queryString] = href.split("?");
    const pathMatch = exact
      ? pathname === path
      : pathname === path || pathname.startsWith(path + "/");

    if (queryString) {
      if (pathname !== path) return false;
      const expected = new URLSearchParams(queryString);
      for (const [key, value] of expected.entries()) {
        if (searchParams.get(key) !== value) return false;
      }
      return true;
    }

    if (path === "/dashboard/invitations" && exact && pathname === path) {
      const tab = searchParams.get("tab");
      return !tab || tab === "studio";
    }

    if (exact) return pathname === path;
    return pathMatch;
  }

  function toggleSection(id: string) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleLogout() {
    setLoggingOut(true);
    onClose?.();
    await performLogout("/");
  }

  return (
    <aside
      className={cn(
        "fixed lg:sticky top-0 z-[60] flex w-[min(18rem,88vw)] flex-col sidebar-gradient text-slate-300 border-r border-white/10 transition-transform duration-300 lg:translate-x-0 lg:z-50",
        "h-[100dvh] max-h-[100dvh] pb-[env(safe-area-inset-bottom)]",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      <div className="shrink-0 p-4 sm:p-5 pt-[max(1rem,env(safe-area-inset-top))] border-b border-white/10 flex items-center justify-between gap-2">
        <Link href="/dashboard" onClick={onClose} className="min-w-0 flex items-center gap-2">
          <Logo variant="light" size="xs" decorative />
          <span className="font-display font-bold text-white text-base leading-none hidden sm:inline">Celeventic</span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl hover:bg-white/10 transition-colors touch-manipulation"
          aria-label={t("dashboard.close_menu")}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="shrink-0 px-4 pt-3 pb-2 space-y-2">
        <Link href="/dashboard/events/create" onClick={onClose} className="block">
          <span
            className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4A63A] to-[#C4952E] hover:from-[#E0B44A] hover:to-[#D4A63A] text-slate-900 font-semibold shadow-md border-0 touch-manipulation px-4 text-sm"
          >
            <Plus className="h-4 w-4" />
            {t("dashboard.create_event")}
          </span>
        </Link>

        <div className="flex gap-2 lg:hidden">
          <Link
            href="/dashboard/qr-admission"
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white/10 px-2 py-2.5 text-xs font-medium text-white touch-manipulation"
          >
            <QrCode className="h-3.5 w-3.5" />
            {t("dashboard.quick_scan")}
          </Link>
          <Link
            href="/dashboard/messages"
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white/10 px-2 py-2.5 text-xs font-medium text-white touch-manipulation"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {t("dashboard.nav_messages")}
          </Link>
        </div>

        <div className="md:hidden">
          <GlobalSearch />
        </div>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-4 py-2 space-y-3 scrollbar-thin">
        {eventWorkspace && activeEventId ? (
          <EventWorkspaceNav
            items={eventWorkspace.navigation}
            eventTitle={eventWorkspace.eventTitle}
            eventType={eventWorkspace.eventType}
          />
        ) : (
          sections.map((section) => {
          const isCollapsed = collapsed[section.id] === true;
          const hasActive = section.items.some((item) => isActive(item.href, item.exact));

          return (
            <div key={section.id}>
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-3 mb-1 lg:cursor-default"
              >
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                  {t(section.labelKey)}
                </p>
                <span className="lg:hidden text-slate-500">
                  {isCollapsed && !hasActive ? (
                    <ChevronRight className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </span>
              </button>
              <div className={cn("space-y-0.5", isCollapsed && !hasActive && "hidden lg:block")}>
                {section.items.map((item) => {
                  const active = isActive(item.href, item.exact);
                  const key = `${section.id}-${item.labelKey}`;
                  return (
                    <Link
                      key={key}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all touch-manipulation",
                        active
                          ? "bg-white/15 text-white shadow-sm ring-1 ring-white/10"
                          : "text-slate-400 hover:text-white hover:bg-white/8"
                      )}
                    >
                      <item.icon className={cn("h-4 w-4 shrink-0", active && "text-brand-300")} />
                      <span className="truncate">{t(item.labelKey)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
          })
        )}
      </nav>

      {isAdmin && (
        <div className="shrink-0 p-4 border-t border-white/10 space-y-2">
          <Button variant="secondary" className="w-full min-h-[44px]" asChild>
            <Link href="/admin" onClick={onClose}>
              <Shield className="h-4 w-4" />
              {t("dashboard.admin_control_center")}
            </Link>
          </Button>
        </div>
      )}

      <div className="shrink-0 p-4 border-t border-white/10 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button
          type="button"
          variant="ghost"
          disabled={loggingOut}
          onClick={() => void handleLogout()}
          className="w-full min-h-[44px] justify-start text-slate-300 hover:text-red-300 hover:bg-red-500/10 touch-manipulation"
        >
          <LogOut className="h-4 w-4" />
          {loggingOut ? t("common.signing_out") : t("common.sign_out")}
        </Button>
      </div>
    </aside>
  );
}
