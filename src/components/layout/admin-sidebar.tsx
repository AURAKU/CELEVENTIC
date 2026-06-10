"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, CreditCard, Settings, Shield,
  BarChart3, Package, Palette, Globe, Key, ScrollText, Eye, Calendar, X,
  Mail, Layers, Star, FileText, Phone, RefreshCw, ShoppingBag, Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
type NavSection = { title: string; items: NavItem[] };

const adminSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/admin", label: "Command Center", icon: LayoutDashboard },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    title: "VendorOS",
    items: [
      { href: "/admin/vendors", label: "Vendor Command Center", icon: Store },
    ],
  },
  {
    title: "Invitation Business",
    items: [
      { href: "/admin/invitation-orders", label: "Orders", icon: Mail },
      { href: "/admin/invitation-templates", label: "Templates", icon: Palette },
      { href: "/admin/commerce", label: "Packages & Add-ons", icon: Package },
      { href: "/admin/revisions", label: "Revisions", icon: RefreshCw },
      { href: "/admin/reviews", label: "Reviews", icon: Star },
    ],
  },
  {
    title: "Payments & Commerce",
    items: [
      { href: "/admin/payments", label: "Payments", icon: CreditCard },
      { href: "/admin/api-settings", label: "Payment Providers", icon: Key },
    ],
  },
  {
    title: "Content & Settings",
    items: [
      { href: "/admin/translations", label: "Languages", icon: Globe },
      { href: "/admin/legal", label: "Legal Center", icon: FileText },
      { href: "/admin/contact", label: "Contact", icon: Phone },
    ],
  },
  {
    title: "Platform",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/events", label: "Events", icon: Calendar },
      { href: "/admin/modules", label: "EventOS Modules", icon: Layers },
      { href: "/admin/services", label: "Services", icon: Settings },
      { href: "/admin/templates", label: "Event Templates", icon: ShoppingBag },
      { href: "/admin/security", label: "Security", icon: Shield },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
    ],
  },
];

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ mobileOpen = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed lg:sticky top-0 z-50 flex w-72 max-w-[85vw] flex-col sidebar-gradient text-slate-300 h-screen border-r border-white/10 transition-transform duration-300 lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      <div className="p-5 border-b border-white/10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Logo variant="light" showTagline size="sm" />
          <p className="text-[10px] text-gold-400 mt-2 font-semibold tracking-wide uppercase">
            Invitation Command Center
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors shrink-0"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-5 overflow-y-auto">
        {adminSections.map((section) => (
          <div key={section.title}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 mb-2">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
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
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <form action="/api/admin/switch-view" method="POST">
          <Button type="submit" variant="secondary" className="w-full">
            <Eye className="h-4 w-4" />
            Switch to User View
          </Button>
        </form>
      </div>
    </aside>
  );
}
