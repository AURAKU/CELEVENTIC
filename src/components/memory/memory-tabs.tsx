"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type MemoryTab = "vault" | "guestbook" | "gallery" | "uploads" | "legacy";

const TABS: { id: MemoryTab; label: string }[] = [
  { id: "vault", label: "Memory Vault" },
  { id: "guestbook", label: "Guestbook" },
  { id: "gallery", label: "Gallery" },
  { id: "uploads", label: "Media Uploads" },
  { id: "legacy", label: "Legacy Archive" },
];

export function MemoryTabs({ active }: { active: MemoryTab }) {
  return (
    <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-slate-100/80 border border-slate-200/60">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.id === "vault" ? "/dashboard/memory" : `/dashboard/memory?tab=${tab.id}`}
          className={cn(
            "px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation",
            active === tab.id
              ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
