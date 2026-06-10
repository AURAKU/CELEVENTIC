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
import type { UserRole } from "@prisma/client";

const navSections = [
  {
    label: "Core",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/events", label: "Events", icon: Calendar },
      { href: "/dashboard/ai-planner", label: "AI Planner", icon: Sparkles },
    ],
  },
  {
    label: "Design",
    items: [
      { href: "/dashboard/design-studio", label: "Design Studio", icon: Palette },
      { href: "/dashboard/design-studio/assets", label: "Asset Library", icon: Layers },
      { href: "/dashboard/invitations", label: "Invitations", icon: Mail },
      { href: "/dashboard/my-invitations", label: "My Invitations", icon: Mail },
      { href: "/dashboard/invitation-analytics", label: "Invitation Analytics", icon: Sparkles },
      { href: "/dashboard/flyers", label: "Flyer Studio", icon: Image },
      { href: "/dashboard/inspiration", label: "Inspiration", icon: Upload },
    ],
  },
  {
    label: "Guests & Access",
    items: [
      { href: "/dashboard/guests", label: "Guest CRM", icon: Users },
      { href: "/dashboard/tickets", label: "Tickets", icon: Ticket },
      { href: "/dashboard/qr", label: "QR Admission", icon: QrCode },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/dashboard/campaigns", label: "Communications", icon: MessageSquare },
      { href: "/dashboard/discovery", label: "Discovery", icon: Compass },
      { href: "/marketplace", label: "Vendor Marketplace", icon: Store },
      { href: "/dashboard/vendors", label: "Find Vendors", icon: Store },
      { href: "/dashboard/my-collection", label: "My Collection", icon: Heart },
      { href: "/dashboard/vendor-portal", label: "Vendor Portal", icon: Store },
      { href: "/dashboard/venues", label: "Venues", icon: MapPin },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/dashboard/wallet", label: "Event Wallet", icon: Wallet },
      { href: "/dashboard/contributions", label: "Contributions", icon: Heart },
      { href: "/dashboard/funeral", label: "FuneralOS", icon: Flower2 },
    ],
  },
  {
    label: "Archive",
    items: [
      { href: "/dashboard/memory", label: "Memory Vault", icon: Archive },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
      { href: "/dashboard/privacy-center", label: "Privacy Center", icon: Shield },
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
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-5 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] px-3 mb-2">
              {section.label}
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
                      active
                        ? "nav-active"
                        : "text-slate-400 hover:text-white hover:bg-white/8"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 shrink-0", active && "text-white")} />
                    {item.label}
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
              Return to Admin Panel
            </Button>
          </form>
        </div>
      )}
    </aside>
  );
}
