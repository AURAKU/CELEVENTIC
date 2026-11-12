"use client";

import { useEffect, useState } from "react";
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

function readScrollY() {
  return Math.max(window.scrollY, document.documentElement.scrollTop, 0);
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useLocale();
  const [tucked, setTucked] = useState(false);

  const hidden =
    pathname.startsWith("/dashboard/getting-started") ||
    pathname.startsWith("/vendor/onboarding");

  useEffect(() => {
    setTucked(false);
  }, [pathname]);

  useEffect(() => {
    if (hidden) {
      delete document.documentElement.dataset.mobileDock;
      return;
    }
    document.documentElement.dataset.mobileDock = tucked ? "tucked" : "shown";
    return () => {
      delete document.documentElement.dataset.mobileDock;
    };
  }, [hidden, tucked]);

  useEffect(() => {
    if (hidden) return;
    let lastY = readScrollY();
    let ticking = false;

    function update() {
      ticking = false;
      const y = readScrollY();
      const delta = y - lastY;
      lastY = y;
      setTucked((isTucked) => {
        if (y < 24) return false;
        if (delta > 6) return true;
        if (delta < -6) return false;
        return isTucked;
      });
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [hidden]);

  if (hidden) return null;

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav
      className={cn(
        "lg:hidden pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 transition-[transform,translate] duration-300 ease-out motion-reduce:transition-none",
        "pb-[max(0.35rem,env(safe-area-inset-bottom))]"
      )}
      style={{ transform: tucked ? "translateY(calc(100% + 0.5rem))" : "translateY(0)" }}
      aria-label="Main navigation"
      data-tour="nav-browse-mobile"
      data-tucked={tucked ? "true" : "false"}
      onFocusCapture={() => setTucked(false)}
    >
      <div className="pointer-events-auto mx-auto flex h-11 max-w-md items-stretch justify-around overflow-hidden rounded-full border border-slate-200/80 bg-white/92 shadow-[0_8px_24px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, "exact" in item ? item.exact : undefined);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-11 flex-1 flex-col items-center justify-center gap-0 px-1 text-[10px] font-semibold leading-none transition-colors touch-manipulation",
                active ? "text-brand-700" : "text-slate-600 hover:text-slate-800"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={cn("h-4 w-4", active && "text-brand-600")} strokeWidth={active ? 2.4 : 2} />
              <span className="mt-0.5 max-w-full truncate whitespace-nowrap">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
