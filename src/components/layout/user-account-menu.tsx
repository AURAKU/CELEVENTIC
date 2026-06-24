"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/i18n/locale-provider";
import { performLogout } from "@/lib/auth/logout";
import { cn } from "@/lib/utils";

interface UserAccountMenuProps {
  compact?: boolean;
  variant?: "light" | "dark";
  className?: string;
}

export function UserAccountMenu({ compact, variant = "light", className }: UserAccountMenuProps) {
  const { data: session } = useSession();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "CE";

  async function handleLogout() {
    setLoggingOut(true);
    setOpen(false);
    await performLogout("/");
  }

  const isDark = variant === "dark";

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border text-sm font-medium transition-colors touch-manipulation min-h-[44px]",
          compact ? "px-2 sm:px-2.5" : "px-3",
          isDark
            ? "border-white/15 bg-white/10 text-white hover:bg-white/15"
            : "border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50"
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("common.account_menu")}
      >
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold shrink-0",
            isDark
              ? "bg-gradient-to-br from-brand-400 to-brand-600 text-white"
              : "bg-gradient-to-br from-brand-500 to-brand-700 text-white"
          )}
        >
          {initials}
        </span>
        {!compact && (
          <span className="hidden md:inline max-w-[120px] truncate">{session?.user?.name ?? "Account"}</span>
        )}
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0", isDark ? "text-slate-300" : "text-slate-400")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="menu"
            className="absolute right-0 top-full mt-1 z-50 min-w-[220px] rounded-xl border border-slate-200 bg-white shadow-xl py-1 overflow-hidden"
          >
            <div className="px-3 py-2.5 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-900 truncate">{session?.user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{session?.user?.email}</p>
            </div>
            <Link
              href="/dashboard/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 touch-manipulation"
            >
              <Settings className="h-4 w-4 text-slate-400" />
              {t("dashboard.nav_settings")}
            </Link>
            <Link
              href="/dashboard"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 touch-manipulation"
            >
              <User className="h-4 w-4 text-slate-400" />
              {t("common.dashboard")}
            </Link>
            <div className="border-t border-slate-100 mt-1 pt-1">
              <button
                type="button"
                role="menuitem"
                disabled={loggingOut}
                onClick={() => void handleLogout()}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 touch-manipulation disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" />
                {loggingOut ? t("common.signing_out") : t("common.sign_out")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Standalone logout control — icon on mobile, label on larger screens. */
export function LogoutButton({ className, showLabel = true }: { className?: string; showLabel?: boolean }) {
  const { t } = useLocale();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await performLogout("/");
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={showLabel ? "sm" : "icon"}
      disabled={loggingOut}
      onClick={() => void handleLogout()}
      className={cn(
        "rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 touch-manipulation min-h-[44px]",
        showLabel ? "gap-2 px-3" : "min-w-[44px]",
        className
      )}
      aria-label={t("common.sign_out")}
    >
      <LogOut className="h-4 w-4 shrink-0" />
      {showLabel && (
        <span className="hidden sm:inline">{loggingOut ? t("common.signing_out") : t("common.sign_out")}</span>
      )}
    </Button>
  );
}
