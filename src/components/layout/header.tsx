"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import type { Session } from "next-auth";
import {
  Compass,
  LayoutTemplate,
  LogIn,
  LogOut,
  Mail,
  Menu,
  Sparkles,
  Tag,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/layout/logo";
import { PreferencesMenu } from "@/components/layout/preferences-menu";
import { Button } from "@/components/ui/button";
import { isAdminRole } from "@/lib/roles";
import type { UserRole } from "@prisma/client";
import { useLocale } from "@/components/i18n/locale-provider";
import { performLogout } from "@/lib/auth/logout";
import { cn } from "@/lib/utils";

interface HeaderProps {
  initialSession?: Session | null;
}

const navLinkKeys: ReadonlyArray<{
  href: string;
  key: string;
  icon: LucideIcon;
  /** Match pathname for active state (route links only) */
  match?: string;
}> = [
  { href: "/#features", key: "header.features", icon: Sparkles },
  { href: "/#invitations", key: "header.invitations", icon: Mail },
  { href: "/templates", key: "header.templates", icon: LayoutTemplate, match: "/templates" },
  { href: "/#pricing", key: "header.pricing", icon: Tag },
  { href: "/discover", key: "header.discover", icon: Compass, match: "/discover" },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
  mobile = false,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "group/nav relative inline-flex items-center touch-manipulation",
        "rounded-[0.95rem] p-[1px] transition-[transform,box-shadow] duration-300 ease-out",
        mobile ? "w-full" : "shrink-0",
        active
          ? "bg-gradient-to-br from-teal-400/50 via-white/50 to-orange-400/40 shadow-[0_0_0_1px_rgba(20,184,166,0.18)]"
          : "bg-transparent hover:bg-gradient-to-br hover:from-teal-400/35 hover:via-white/40 hover:to-orange-400/30",
        !mobile && "hover:scale-[1.02]"
      )}
      aria-current={active ? "page" : undefined}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[0.88rem] font-semibold tracking-wide transition-colors",
          mobile
            ? "w-full justify-start px-3.5 py-3 text-sm"
            : "px-3 py-1.5 text-[13px] whitespace-nowrap",
          active
            ? "bg-white/70 text-[#0B8A83] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] supports-[backdrop-filter]:bg-white/55 backdrop-blur-md"
            : "bg-transparent text-slate-600 group-hover/nav:bg-white/50 group-hover/nav:text-slate-900 group-hover/nav:backdrop-blur-md supports-[backdrop-filter]:group-hover/nav:bg-white/35"
        )}
      >
        <Icon
          className={cn(
            "shrink-0 transition-colors",
            mobile ? "h-4 w-4" : "h-3.5 w-3.5",
            active ? "text-[#0B8A83]" : "text-slate-400 group-hover/nav:text-[#0B8A83]"
          )}
          strokeWidth={2.1}
          aria-hidden
        />
        <span>{label}</span>
        {!mobile && (
          <span
            className={cn(
              "pointer-events-none absolute inset-x-3 -bottom-[1px] h-px rounded-full bg-gradient-to-r from-transparent via-teal-500/70 to-orange-400/60 transition-opacity duration-300",
              active ? "opacity-100" : "opacity-0 group-hover/nav:opacity-70"
            )}
            aria-hidden
          />
        )}
      </span>
    </Link>
  );
}

/** Secondary auth CTA — glass capsule matching prefs / logo */
function SignInLink({
  label,
  className,
  onNavigate,
}: {
  label: string;
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href="/auth/login"
      onClick={onNavigate}
      className={cn(
        "group/signin relative inline-flex touch-manipulation",
        "rounded-[1.1rem] p-[1px]",
        "bg-gradient-to-br from-teal-400/40 via-white/50 to-orange-400/35",
        "shadow-[0_0_0_1px_rgba(15,118,110,0.08)]",
        "transition-[transform,box-shadow] duration-300 ease-out",
        "hover:scale-[1.02] hover:shadow-[0_0_0_1px_rgba(20,184,166,0.2),0_8px_22px_rgba(15,118,110,0.12)]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
        className
      )}
    >
      <span
        className={cn(
          "inline-flex h-10 items-center justify-center gap-2 rounded-[1.02rem] px-4",
          "bg-white/55 backdrop-blur-md supports-[backdrop-filter]:bg-white/40",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]",
          "text-sm font-semibold tracking-wide text-[#0B8A83]",
          "transition-colors group-hover/signin:bg-white/70 group-hover/signin:text-[#097068]"
        )}
      >
        <LogIn className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2.2} aria-hidden />
        {label}
      </span>
    </Link>
  );
}

/** Primary auth CTA — solid brand fill with soft edge glow */
function GetStartedLink({
  label,
  className,
  onNavigate,
}: {
  label: string;
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href="/auth/register"
      onClick={onNavigate}
      className={cn(
        "group/cta relative inline-flex touch-manipulation",
        "rounded-[1.1rem] p-[1px]",
        "bg-gradient-to-br from-teal-300 via-brand-500 to-orange-400/80",
        "shadow-[0_6px_20px_rgba(11,138,131,0.28)]",
        "transition-[transform,box-shadow] duration-300 ease-out",
        "hover:scale-[1.02] hover:shadow-[0_10px_28px_rgba(11,138,131,0.35)]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
        className
      )}
    >
      <span
        className={cn(
          "inline-flex h-10 items-center justify-center gap-1.5 rounded-[1.02rem] px-5",
          "bg-gradient-to-r from-[#0B8A83] to-[#0d9a92] text-sm font-semibold tracking-wide text-white",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]",
          "transition-colors group-hover/cta:from-[#097068] group-hover/cta:to-[#0B8A83]"
        )}
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
        {label}
      </span>
    </Link>
  );
}

export function Header({ initialSession }: HeaderProps) {
  const { t } = useLocale();
  const pathname = usePathname();
  const { data: clientSession } = useSession();
  const session = clientSession ?? initialSession;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const dashboardHref =
    session?.user?.role && isAdminRole(session.user.role as UserRole) && !session.user.isAdminView
      ? "/admin"
      : "/dashboard";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/50 bg-white/85 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex min-h-[4rem] sm:min-h-[4.25rem] max-w-7xl items-center gap-2 sm:gap-4 px-4 sm:px-6 lg:px-8 py-1.5">
        <div className="shrink-0 min-w-0">
          <Logo size="sm" className="hidden sm:flex" />
          <Logo size="xs" className="flex sm:hidden" />
        </div>

        <nav
          className={cn(
            "hidden md:flex flex-1 items-center justify-center min-w-0",
            "mx-1"
          )}
          aria-label="Primary"
        >
          <div
            className={cn(
              "inline-flex max-w-full items-center gap-0.5 overflow-x-auto",
              "rounded-[1.2rem] p-1",
              "bg-white/35 backdrop-blur-md supports-[backdrop-filter]:bg-white/25",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_0_0_1px_rgba(15,118,110,0.06)]",
              "scrollbar-none"
            )}
          >
            {navLinkKeys.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={t(link.key)}
                icon={link.icon}
                active={Boolean(link.match && pathname.startsWith(link.match))}
              />
            ))}
          </div>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
          <PreferencesMenu compact />

          <div className="hidden md:flex items-center gap-2">
            {session ? (
              <>
                <Button asChild>
                  <Link href={dashboardHref}>{t("common.dashboard")}</Link>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={loggingOut}
                  onClick={() => {
                    setLoggingOut(true);
                    void performLogout("/");
                  }}
                  className="text-slate-600 hover:text-red-600"
                >
                  <LogOut className="h-4 w-4 mr-1.5" />
                  {loggingOut ? t("common.signing_out") : t("common.sign_out")}
                </Button>
              </>
            ) : (
              <>
                <SignInLink label={t("common.sign_in")} />
                <GetStartedLink label={t("common.get_started")} />
              </>
            )}
          </div>

          <button
            type="button"
            className={cn(
              "md:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] touch-manipulation",
              "rounded-[1rem] p-[1px]",
              "bg-gradient-to-br from-teal-400/30 via-white/40 to-orange-400/25",
              "transition-transform hover:scale-[1.02]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            )}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? t("dashboard.close_menu") : t("dashboard.open_menu")}
          >
            <span className="inline-flex h-full w-full min-h-[42px] min-w-[42px] items-center justify-center rounded-[0.92rem] bg-white/50 backdrop-blur-md text-slate-700">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200/60 bg-white/95 backdrop-blur-xl px-4 py-4 space-y-2">
          <div
            className={cn(
              "rounded-[1.2rem] p-1.5 space-y-1",
              "bg-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_0_0_1px_rgba(15,118,110,0.06)]"
            )}
          >
            {navLinkKeys.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={t(link.key)}
                icon={link.icon}
                active={Boolean(link.match && pathname.startsWith(link.match))}
                onNavigate={() => setMobileOpen(false)}
                mobile
              />
            ))}
          </div>
          <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
            {session ? (
              <>
                <Button asChild>
                  <Link href={dashboardHref}>{t("common.dashboard")}</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loggingOut}
                  onClick={() => {
                    setLoggingOut(true);
                    void performLogout("/");
                  }}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {loggingOut ? t("common.signing_out") : t("common.sign_out")}
                </Button>
              </>
            ) : (
              <>
                <SignInLink
                  label={t("common.sign_in")}
                  className="w-full [&_span]:w-full"
                  onNavigate={() => setMobileOpen(false)}
                />
                <GetStartedLink
                  label={t("common.get_started")}
                  className="w-full [&_span]:w-full"
                  onNavigate={() => setMobileOpen(false)}
                />
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
