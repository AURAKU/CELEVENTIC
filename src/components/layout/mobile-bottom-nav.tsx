"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Store, MessageSquare, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";

const NAV_ITEMS = [
  { href: "/dashboard", labelKey: "dashboard.mobile_nav_home", icon: Home, exact: true },
  { href: "/dashboard/events", labelKey: "dashboard.mobile_nav_events", icon: Calendar },
  { href: "/marketplace", labelKey: "dashboard.mobile_nav_marketplace", icon: Store },
  { href: "/dashboard/messages", labelKey: "dashboard.mobile_nav_messages", icon: MessageSquare },
  { href: "/dashboard/settings", labelKey: "dashboard.mobile_nav_profile", icon: UserCircle },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useLocale();

  const hidden =
    pathname.startsWith("/dashboard/getting-started") ||
    pathname.startsWith("/vendor/onboarding");

  if (hidden) return null;

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-slate-200/80 bg-white/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch justify-around">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, "exact" in item ? item.exact : undefined);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[56px] px-1 py-2 text-[10px] font-medium transition-colors touch-manipulation",
                active ? "text-brand-600" : "text-slate-500 hover:text-slate-700"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={cn("h-5 w-5", active && "text-brand-600")} />
              <span className="truncate max-w-full">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
