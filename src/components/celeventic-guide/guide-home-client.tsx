"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GuideCard, type GuideCardData } from "./guide-card";
import { PUBLIC_GUIDE_ROLES, GUIDE_ROLE_LABELS, GUIDE_CATEGORY_LABELS } from "@/lib/celeventic-guide/types";
import type { GuideCategory, GuideRole } from "@/lib/celeventic-guide/types";
import { trackGuideEvent } from "@/lib/celeventic-guide/analytics";
import { cn } from "@/lib/utils";

export function GuideHomeClient({
  initialGuides,
  preferredRole,
}: {
  initialGuides: GuideCardData[];
  preferredRole?: GuideRole | null;
}) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<GuideRole | "ALL">(preferredRole && preferredRole !== "ADMIN" ? preferredRole : "ALL");
  const [category, setCategory] = useState<GuideCategory | "ALL">("ALL");
  const [remote, setRemote] = useState<GuideCardData[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q.trim() && role === "ALL" && category === "ALL") {
        setRemote(null);
        return;
      }
      setSearching(true);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (role !== "ALL") params.set("role", role);
        if (category !== "ALL") params.set("category", category);
        const res = await fetch(`/api/guides/search?${params.toString()}`);
        const data = await res.json();
        const guides = (data.guides ?? []) as GuideCardData[];
        setRemote(guides);
        trackGuideEvent(guides.length ? "guide_search" : "guide_search_no_result", {
          q: q.trim().slice(0, 80),
          results: guides.length,
          role,
        });
      } catch {
        setRemote([]);
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q, role, category]);

  const guides = remote ?? initialGuides;

  const categories = useMemo(() => {
    const set = new Set(initialGuides.map((g) => g.category as GuideCategory));
    return [...set];
  }, [initialGuides]);

  return (
    <div className="space-y-8">
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search guides — RSVP, seating, QR, Memory Vault…"
          className="pl-10 h-12 rounded-xl bg-white/90 border-slate-200"
          aria-label="Search Celeventic Guide"
        />
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by role">
        <FilterChip active={role === "ALL"} onClick={() => setRole("ALL")}>
          All roles
        </FilterChip>
        {PUBLIC_GUIDE_ROLES.map((r) => (
          <FilterChip key={r} active={role === r} onClick={() => setRole(r)}>
            {GUIDE_ROLE_LABELS[r]}
          </FilterChip>
        ))}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        <FilterChip active={category === "ALL"} onClick={() => setCategory("ALL")}>
          All topics
        </FilterChip>
        {categories.map((c) => (
          <FilterChip key={c} active={category === c} onClick={() => setCategory(c)}>
            {GUIDE_CATEGORY_LABELS[c]}
          </FilterChip>
        ))}
      </div>

      {searching && <p className="text-sm text-slate-500">Searching…</p>}

      {!searching && guides.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
          <p className="font-display text-lg text-slate-800">No guides matched</p>
          <p className="text-sm text-slate-500 mt-2">Try another phrase, or browse by role.</p>
          <a href="/legal/contact" className="inline-block mt-4 text-sm text-brand-700 hover:underline">
            Still need help? Contact support
          </a>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {guides.map((g) => (
          <GuideCard key={g.slug} guide={g} />
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
        active
          ? "bg-brand-700 text-white shadow-sm"
          : "bg-white/80 text-slate-600 border border-slate-200 hover:border-brand-300"
      )}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}
