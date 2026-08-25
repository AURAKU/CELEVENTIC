"use client";

import Link from "next/link";
import {
  Building2,
  CreditCard,
  KeyRound,
  Palette,
  Plug,
  Shield,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SettingsTab =
  | "account"
  | "organization"
  | "team"
  | "permissions"
  | "branding"
  | "integrations"
  | "privacy"
  | "security"
  | "billing";

const TABS: {
  id: SettingsTab;
  label: string;
  icon: typeof User;
  hint: string;
  adminOnly?: boolean;
}[] = [
  { id: "account", label: "Account", icon: User, hint: "Profile & contact" },
  { id: "organization", label: "Organization", icon: Building2, hint: "Workspace" },
  { id: "team", label: "Team", icon: Users, hint: "Collaborators" },
  { id: "permissions", label: "Permissions", icon: KeyRound, hint: "Role access" },
  { id: "branding", label: "Branding", icon: Palette, hint: "Avatar & logo" },
  { id: "integrations", label: "Integrations", icon: Plug, hint: "APIs & services", adminOnly: true },
  { id: "privacy", label: "Privacy", icon: Shield, hint: "Data & consent" },
  { id: "security", label: "Security", icon: ShieldCheck, hint: "2FA & sessions" },
  { id: "billing", label: "Billing", icon: CreditCard, hint: "Plan & wallet" },
];

export function SettingsTabs({
  active,
  isAdmin = false,
}: {
  active: SettingsTab;
  isAdmin?: boolean;
}) {
  const visibleTabs = TABS.filter((tab) => isAdmin || !tab.adminOnly);

  return (
    <nav
      aria-label="Settings sections"
      className="rounded-2xl border border-slate-200/80 bg-white/90 p-1.5 shadow-[0_4px_24px_rgba(15,23,42,0.04)]"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const href =
            tab.id === "account"
              ? "/dashboard/settings"
              : `/dashboard/settings?tab=${tab.id}`;
          const isActive = active === tab.id;

          return (
            <Link
              key={tab.id}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all touch-manipulation",
                isActive
                  ? "bg-[#0B8A83] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  isActive ? "bg-white/15" : "bg-slate-100 text-slate-500"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-tight">{tab.label}</span>
                <span
                  className={cn(
                    "block text-[11px] leading-tight mt-0.5 truncate",
                    isActive ? "text-white/75" : "text-slate-400"
                  )}
                >
                  {tab.hint}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
