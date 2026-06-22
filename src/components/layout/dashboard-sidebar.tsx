"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import {
  LayoutDashboard, Calendar, Mail, Users, Ticket, QrCode, MessageSquare,
  Sparkles, Settings, Shield, Palette, Upload, Wallet, Heart,
  Store, MapPin, Compass, Archive, Image, Layers, X, Flower2, Search, Home, Armchair,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isAdminRole } from "@/lib/roles";
import { useLocale } from "@/components/i18n/locale-provider";
import type { UserRole } from "@prisma/client";

const navSections = [
  {
    labelKey: "dashboard.nav_section_core",
    items: [
      { href: "/dashboard", labelKey: "dashboard.nav_overview", icon: LayoutDashboard, exact: true },
      { href: "/dashboard/events", labelKey: "dashboard.nav_events", icon: Calendar },
      { href: "/dashboard/ai-planner", labelKey: "dashboard.nav_ai_planner", icon: Sparkles },
    ],
  },
  {
    labelKey: "dashboard.nav_section_design",
    items: [
      { href: "/dashboard/design-studio", labelKey: "dashboard.nav_design_studio", icon: Palette },
      { href: "/dashboard/design-studio/assets", labelKey: "dashboard.nav_asset_library", icon: Layers },
      { href: "/dashboard/invitations", labelKey: "dashboard.nav_invitations", icon: Mail },
      { href: "/dashboard/my-invitations", labelKey: "dashboard.nav_my_invitations", icon: Mail },
      { href: "/dashboard/seating", labelKey: "dashboard.nav_seating", icon: Armchair, exact: false },
      { href: "/dashboard/invitation-analytics", labelKey: "dashboard.nav_invitation_analytics", icon: Sparkles },
      { href: "/dashboard/flyers", labelKey: "dashboard.nav_flyer_studio", icon: Image },
      { href: "/dashboard/inspiration", labelKey: "dashboard.nav_inspiration", icon: Upload },
    ],
  },
  {
    labelKey: "dashboard.nav_section_guests",
    items: [
      { href: "/dashboard/guests", labelKey: "dashboard.nav_guest_crm", icon: Users },
      { href: "/dashboard/tickets", labelKey: "dashboard.nav_tickets", icon: Ticket },
      { href: "/dashboard/qr-admission", labelKey: "dashboard.nav_qr", icon: QrCode },
    ],
  },
  {
    labelKey: "dashboard.nav_section_growth",
    items: [
      { href: "/dashboard/messages", labelKey: "dashboard.nav_messages", icon: MessageSquare },
      { href: "/dashboard/campaigns", labelKey: "dashboard.nav_communications", icon: MessageSquare },
      { href: "/dashboard/discovery", labelKey: "dashboard.nav_discovery", icon: Compass },
      { href: "/marketplace", labelKey: "dashboard.nav_marketplace", icon: Store },
      { href: "/dashboard/vendors", labelKey: "dashboard.nav_find_vendors", icon: Store },
      { href: "/dashboard/my-collection", labelKey: "dashboard.nav_my_collection", icon: Heart },
      { href: "/dashboard/vendor-portal", labelKey: "dashboard.nav_vendor_portal", icon: Store },
      { href: "/dashboard/venues", labelKey: "dashboard.nav_venues", icon: MapPin },
    ],
  },
  {
    labelKey: "dashboard.nav_section_finance",
    items: [
      { href: "/dashboard/wallet", labelKey: "dashboard.nav_wallet", icon: Wallet },
      { href: "/dashboard/contributions", labelKey: "dashboard.nav_contributions", icon: Heart },
      { href: "/dashboard/funeral", labelKey: "dashboard.nav_funeral", icon: Flower2 },
    ],
  },
  {
    labelKey: "dashboard.nav_section_archive",
    items: [
      { href: "/dashboard/memory", labelKey: "dashboard.nav_memory", icon: Archive },
      { href: "/dashboard/settings", labelKey: "dashboard.nav_settings", icon: Settings },
      { href: "/dashboard/privacy-center", labelKey: "dashboard.nav_privacy", icon: Shield },
    ],
  },
];

interface DashboardSidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function DashboardSidebar({ mobileOpen = false, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const isAdmin = session?.user?.role && isAdminRole(session.user.role as UserRole);

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return navSections;

    return navSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          const label = t(item.labelKey).toLowerCase();
          return label.includes(q) || item.href.toLowerCase().includes(q);
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [query, t]);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
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
          <Logo variant="light" size="xs" />
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("dashboard.sidebar_search")}
            className="h-10 pl-9 bg-white/10 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-brand-400/30"
          />
        </div>
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/8 transition-colors touch-manipulation"
        >
          <Home className="h-4 w-4 shrink-0" />
          {t("dashboard.go_to_overview")}
        </Link>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-4 py-2 space-y-4 scrollbar-thin">
        {filteredSections.length === 0 ? (
          <p className="px-3 py-6 text-sm text-slate-500 text-center">{t("dashboard.sidebar_no_results")}</p>
        ) : (
          filteredSections.map((section) => (
            <div key={section.labelKey}>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] px-3 mb-1.5">
                {t(section.labelKey)}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.href, item.exact);
                  return (
                    <Link
                      key={item.href}
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
          ))
        )}
      </nav>

      {isAdmin && (
        <div className="shrink-0 p-4 border-t border-white/10 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <form action="/api/admin/return-to-admin" method="POST">
            <Button type="submit" variant="secondary" className="w-full min-h-[44px]">
              <Shield className="h-4 w-4" />
              {t("dashboard.return_admin")}
            </Button>
          </form>
        </div>
      )}
    </aside>
  );
}
