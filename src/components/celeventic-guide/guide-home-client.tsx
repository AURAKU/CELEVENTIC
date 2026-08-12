"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GuideCard, type GuideCardData } from "./guide-card";
import { StartHereJourneys } from "./start-here-journeys";
import { FirstTimeHelpBanner } from "./first-time-help-banner";
import { GuestQuickActions } from "./guest-quick-actions";
import { GuestFirstTimeIntro } from "./guest-first-time-intro";
import { PUBLIC_GUIDE_ROLES, GUIDE_ROLE_LABELS, GUIDE_CATEGORY_LABELS } from "@/lib/celeventic-guide/types";
import type { GuideCategory, GuideRole } from "@/lib/celeventic-guide/types";
import { trackGuideEvent } from "@/lib/celeventic-guide/analytics";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

export function GuideHomeClient({
  initialGuides,
  preferredRole,
}: {
  initialGuides: GuideCardData[];
  preferredRole?: GuideRole | null;
}) {
  const [forceGuestTour, setForceGuestTour] = useState(false);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<GuideRole | "ALL">(preferredRole && preferredRole !== "ADMIN" ? preferredRole : "ALL");
  const [category, setCategory] = useState<GuideCategory | "ALL">("ALL");
  const [remote, setRemote] = useState<GuideCardData[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialGuides.length);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const qParam = params.get("q")?.toLowerCase() ?? "";
    setForceGuestTour(qParam.includes("show me around") || params.get("tour") === "1");
  }, []);

  useEffect(() => {
    setPage(1);
  }, [q, role, category]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q.trim() && role === "ALL" && category === "ALL") {
        setRemote(null);
        setTotal(initialGuides.length);
        return;
      }
      setSearching(true);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (role !== "ALL") params.set("role", role);
        if (category !== "ALL") params.set("category", category);
        params.set("page", String(page));
        params.set("pageSize", String(PAGE_SIZE));
        const res = await fetch(`/api/guides/search?${params.toString()}`);
        const data = await res.json();
        const guides = (data.guides ?? []) as GuideCardData[];
        setRemote(guides);
        setTotal(typeof data.total === "number" ? data.total : guides.length);
        trackGuideEvent(guides.length ? "guide_search" : "guide_search_no_result", {
          q: q.trim().slice(0, 80),
          results: typeof data.total === "number" ? data.total : guides.length,
          role,
          page,
        });
      } catch {
        setRemote([]);
        setTotal(0);
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q, role, category, page, initialGuides.length]);

  const categories = useMemo(() => {
    const set = new Set(initialGuides.map((g) => g.category as GuideCategory));
    return [...set];
  }, [initialGuides]);

  const browsing = !q.trim() && role === "ALL" && category === "ALL";
  const pageCount = Math.max(1, Math.ceil((browsing ? initialGuides.length : total) / PAGE_SIZE));
  const guides = browsing
    ? initialGuides.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : remote ?? [];

  return (
    <div className="space-y-8">
      <FirstTimeHelpBanner />
      <StartHereJourneys preferredRole={preferredRole} />
      {(role === "GUEST" || preferredRole === "GUEST") && (
        <div className="space-y-4">
          <GuestFirstTimeIntro
            invitationId="celeventic-guide-hub"
            guestId="guide-visitor"
            forceOpen={forceGuestTour}
          />
          <GuestQuickActions />
        </div>
      )}

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
            {GUIDE_CATEGORY_LABELS[c] ?? c}
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

      {pageCount > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Page {page} of {pageCount}
            {!browsing ? ` · ${total} results` : ` · ${initialGuides.length} guides`}
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
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
