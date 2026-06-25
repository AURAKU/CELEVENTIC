"use client";

import Link from "next/link";
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

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "organization", label: "Organization" },
  { id: "team", label: "Team" },
  { id: "permissions", label: "Permissions" },
  { id: "branding", label: "Branding" },
  { id: "integrations", label: "Integrations" },
  { id: "privacy", label: "Privacy" },
  { id: "security", label: "Security" },
  { id: "billing", label: "Billing" },
];

export function SettingsTabs({ active }: { active: SettingsTab }) {
  return (
    <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-slate-100/80 border border-slate-200/60">
      {TABS.map((tab) => {
        const href =
          tab.id === "privacy"
            ? "/dashboard/privacy-center"
            : tab.id === "account"
              ? "/dashboard/settings"
              : `/dashboard/settings?tab=${tab.id}`;

        return (
          <Link
            key={tab.id}
            href={href}
            className={cn(
              "px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation",
              active === tab.id
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
