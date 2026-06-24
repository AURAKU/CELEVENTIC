"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";

export type InvitationsTab = "studio" | "store" | "analytics";

const TABS: { id: InvitationsTab; labelKey: string }[] = [
  { id: "studio", labelKey: "dashboard.invitations_tab_studio" },
  { id: "store", labelKey: "dashboard.invitations_tab_store" },
  { id: "analytics", labelKey: "dashboard.invitations_tab_analytics" },
];

export function InvitationsTabs({ active }: { active: InvitationsTab }) {
  const { t } = useLocale();

  return (
    <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-slate-100/80 border border-slate-200/60">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.id === "studio" ? "/dashboard/invitations" : `/dashboard/invitations?tab=${tab.id}`}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation",
            active === tab.id
              ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          )}
        >
          {t(tab.labelKey)}
        </Link>
      ))}
    </div>
  );
}
