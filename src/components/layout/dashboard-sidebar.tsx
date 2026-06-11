"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard, Calendar, Mail, Users, Ticket, QrCode, MessageSquare,
  Sparkles, Settings, Shield, Palette, Upload, Wallet, Heart,
  Store, MapPin, Compass, Archive, Image, Layers, X, Flower2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { isAdminRole } from "@/lib/roles";
import { useLocale } from "@/components/i18n/locale-provider";
import type { UserRole } from "@prisma/client";

const navSections = [
  {
    labelKey: "dashboard.nav_section_core",
    items: [
      { href: "/dashboard", labelKey: "dashboard.nav_overview", icon: LayoutDashboard },
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
      { href: "/dashboard/qr", labelKey: "dashboard.nav_qr", icon: QrCode },
    ],
  },
  {
    labelKey: "dashboard.nav_section_growth",
    items: [
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
  const isAdmin = session?.user?.role && isAdminRole(session.user.role as UserRole);

  return (
    <aside
      className={cn(
        "fixed lg:sticky top-0 z-50 flex w-72 max-w-[85vw] flex-col sidebar-gradient text-slate-300 h-screen border-r border-white/10 transition-transform duration-300 lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <Logo variant="light" showTagline size="sm" />
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label={t("dashboard.close_menu")}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-5 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.labelKey}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] px-3 mb-2">
              {t(section.labelKey)}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "nav-item",
                      active ? "nav-active" : "text-slate-400 hover:text-white hover:bg-white/8"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 shrink-0", active && "text-white")} />
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {isAdmin && (
        <div className="p-4 border-t border-white/10">
          <form action="/api/admin/return-to-admin" method="POST">
            <Button type="submit" variant="secondary" className="w-full">
              <Shield className="h-4 w-4" />
              {t("dashboard.return_admin")}
            </Button>
          </form>
        </div>
      )}
    </aside>
  );
}
