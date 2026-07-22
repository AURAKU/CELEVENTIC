"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Sparkles, RefreshCw, Calendar, MapPin, Heart } from "lucide-react";
import { TemplateCard } from "@/components/invitation-mvp/template-card";
import { DesignAdvisorBanner } from "@/components/invitation-os/design-advisor-banner";
import { Button } from "@/components/ui/button";
import { PaginationBar } from "@/components/ui/pagination";
import { paginateList } from "@/lib/pagination-client";
import { PUBLIC_GRID_LIMIT } from "@/lib/pagination";
import { matchesCatalogFilters } from "@/lib/invitation-mvp/catalogue-query";
import {
  INVITATION_CATEGORIES,
  INVITATION_STYLES,
  INVITATION_MOODS,
  getCatalogTemplate,
  getBrowseCatalogTemplates,
} from "@/lib/invitation-mvp/catalogue";
import { weddingBrowseCategoriesForEventType } from "@/lib/invitation/wedding-families";

const EVENT_TYPE_TO_CATEGORY: Record<string, string> = {
  WEDDING: "Wedding",
  ENGAGEMENT: "Engagement",
  FUNERAL: "Funeral",
  BIRTHDAY: "Birthday",
  CORPORATE_EVENT: "Corporate",
  CHURCH_PROGRAM: "Church",
  PRIVATE_EVENT: "Private Event",
};

const MOBILE_BATCH = 12;
const AUTO_BATCHES_BEFORE_BUTTON = 3;

const TIER_CHIPS = [
  { value: "all", label: "All tiers" },
  { value: "free", label: "Free" },
  { value: "premium", label: "Premium" },
];

/**
 * Gallery state lives entirely in the URL (?eventType=&tier=&style=&q=&page=…)
 * — shareable, back-button safe. Mobile: infinite scroll in batches of 12 with
 * an explicit "Load more" gate after 3 auto-batches. Desktop: numbered pages.
 */
export function CatalogueClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // — URL-derived filter state (single source of truth) —
  const eventType = searchParams.get("eventType") ?? "WEDDING";
  const weddingBrowse = weddingBrowseCategoriesForEventType(eventType).length > 0;
  // Wedding/Engagement browse defaults to all wedding-family categories so Engagement SKUs appear
  const category =
    searchParams.get("category") ??
    (weddingBrowse ? "all" : EVENT_TYPE_TO_CATEGORY[eventType] ?? "all");
  const style = searchParams.get("style") ?? "all";
  const mood = searchParams.get("mood") ?? "all";
  const tier = searchParams.get("tier") ?? "all";
  const parallaxOnly = searchParams.get("parallax") === "true";
  const urlSearch = searchParams.get("q") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const highlightSlug = searchParams.get("template");

  const setParams = useCallback(
    (updates: Record<string, string | null>, resetPage = true) => {
      const next = new URLSearchParams(searchParams.toString());
      if (resetPage) next.delete("page");
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === "all") next.delete(key);
        else next.set(key, value);
      }
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // Debounced search input (URL syncs 300ms after typing stops).
  const [searchInput, setSearchInput] = useState(urlSearch);
  useEffect(() => {
    if (searchInput === urlSearch) return;
    const id = setTimeout(() => setParams({ q: searchInput }), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Viral-footer attribution: persist the referring invitation for the funnel.
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref) return;
    try {
      window.sessionStorage.setItem("celeventic:referrer-invite", ref);
    } catch {
      // storage unavailable — attribution silently skipped
    }
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/invitation-os/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "TEMPLATE_VIEW", templateSlug: "catalogue" }),
    }).catch(() => {});
  }, []);

  const highlightTemplate = highlightSlug ? getCatalogTemplate(highlightSlug) : undefined;

  const filtered = useMemo(() => {
    const weddingCategories = weddingBrowseCategoriesForEventType(eventType);
    const eventCategory = EVENT_TYPE_TO_CATEGORY[eventType];
    return getBrowseCatalogTemplates().filter((t) => {
      if (weddingCategories.length > 0) {
        if (!weddingCategories.includes(t.category)) return false;
      } else if (eventCategory && t.category !== eventCategory) {
        return false;
      }
      return matchesCatalogFilters(t, {
        category,
        style,
        mood,
        tier,
        hasParallax: parallaxOnly,
        search: urlSearch,
      });
    });
  }, [category, style, mood, tier, parallaxOnly, urlSearch, eventType]);

  // — Mobile infinite scroll / desktop numbered pagination —
  const [isMobile, setIsMobile] = useState(false);
  const [visibleCount, setVisibleCount] = useState(MOBILE_BATCH);
  const [autoBatches, setAutoBatches] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setVisibleCount(MOBILE_BATCH);
    setAutoBatches(0);
  }, [category, style, mood, tier, parallaxOnly, urlSearch, eventType]);

  const canAutoLoad = isMobile && visibleCount < filtered.length && autoBatches < AUTO_BATCHES_BEFORE_BUTTON;

  useEffect(() => {
    if (!canAutoLoad || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((c) => c + MOBILE_BATCH);
          setAutoBatches((b) => b + 1);
        }
      },
      { rootMargin: "200px 0px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [canAutoLoad, visibleCount]);

  const paged = useMemo(() => paginateList(filtered, page, PUBLIC_GRID_LIMIT), [filtered, page]);
  const mobileItems = filtered.slice(0, visibleCount);
  const gridItems = isMobile ? mobileItems : paged.items;

  return (
    <div>
      <div className="mb-8 rounded-2xl border border-[#0B8A83]/20 bg-gradient-to-br from-[#0B8A83]/5 via-white to-[#D4A63A]/5 p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#0B8A83] mb-2">
              Complete invitation experiences
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0F172A]">
              Handcrafted templates — free to create, switch anytime
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Every design includes RSVP, calendar save, maps, countdown, guest wishes, music, gallery, and gift QR.
              Change templates in the studio without losing your content.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { icon: Calendar, label: "Calendar" },
                { icon: MapPin, label: "Maps" },
                { icon: Heart, label: "Guest wishes" },
                { icon: RefreshCw, label: "Switch anytime" },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/80 border border-slate-200/80 text-slate-700"
                >
                  <Icon className="h-3.5 w-3.5 text-[#0B8A83]" />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <Button asChild className="bg-[#0B8A83] hover:bg-[#097068] shrink-0">
            <Link href="/invitations/create/start">
              <Sparkles className="h-4 w-4 mr-2" />
              Start free trial
            </Link>
          </Button>
        </div>
      </div>

      {highlightTemplate && (
        <div className="mb-8 rounded-2xl border-2 border-[#D4A63A]/60 bg-gradient-to-br from-[#D4A63A]/10 to-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#D4A63A] mb-3">
            The design you just experienced
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <TemplateCard template={highlightTemplate} />
          </div>
        </div>
      )}

      <div className="mb-6 space-y-4">
        <select
          value={eventType}
          onChange={(e) => {
            const next = e.target.value;
            setParams({ eventType: next === "WEDDING" ? null : next, category: null });
          }}
          className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
        >
          <option value="WEDDING">Wedding</option>
          <option value="ENGAGEMENT">Engagement</option>
          <option value="FUNERAL">Funeral</option>
          <option value="BIRTHDAY">Birthday</option>
          <option value="CORPORATE_EVENT">Corporate</option>
          <option value="CHURCH_PROGRAM">Church</option>
          <option value="PRIVATE_EVENT">Private Celebration</option>
        </select>
        <DesignAdvisorBanner eventType={eventType} />
      </div>

      {/* Filter chips: tier + motion */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {TIER_CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => setParams({ tier: chip.value })}
            aria-pressed={tier === chip.value}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              tier === chip.value
                ? "bg-[#0B8A83] text-white border-[#0B8A83]"
                : "bg-white text-slate-600 border-slate-200 hover:border-[#0B8A83]/50"
            }`}
          >
            {chip.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setParams({ parallax: parallaxOnly ? null : "true" })}
          aria-pressed={parallaxOnly}
          className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            parallaxOnly
              ? "bg-[#D4A63A] text-[#0F172A] border-[#D4A63A]"
              : "bg-white text-slate-600 border-slate-200 hover:border-[#D4A63A]/60"
          }`}
        >
          <Sparkles className="h-3 w-3" aria-hidden />
          Has motion
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          type="search"
          placeholder="Search templates..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 h-11 rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:border-[#0B8A83] focus:ring-2 focus:ring-[#0B8A83]/15"
        />
        <select
          value={category}
          onChange={(e) => setParams({ category: e.target.value })}
          className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
        >
          <option value="all">All Categories</option>
          {INVITATION_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={style}
          onChange={(e) => setParams({ style: e.target.value })}
          className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
        >
          <option value="all">All Styles</option>
          {INVITATION_STYLES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={mood}
          onChange={(e) => setParams({ mood: e.target.value })}
          className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
        >
          <option value="all">All Moods</option>
          {INVITATION_MOODS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <p className="text-sm text-slate-500 mb-6">
        {filtered.length} template{filtered.length !== 1 ? "s" : ""} · Preview live demos before you choose
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p>No templates match your filters.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {gridItems.map((t) => <TemplateCard key={t.slug} template={t} />)}
        </div>
      )}

      {isMobile ? (
        <div className="mt-8 flex flex-col items-center gap-3">
          {filtered.length > 0 && (
            <p className="text-xs text-slate-400 tabular-nums sticky bottom-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full border border-slate-200/80">
              {Math.min(visibleCount, filtered.length)} of {filtered.length}
            </p>
          )}
          {canAutoLoad && <div ref={sentinelRef} className="h-1 w-full" aria-hidden />}
          {isMobile && visibleCount < filtered.length && !canAutoLoad && (
            <Button
              variant="outline"
              onClick={() => {
                setVisibleCount((c) => c + MOBILE_BATCH);
                setAutoBatches(0);
              }}
            >
              Load more
            </Button>
          )}
        </div>
      ) : (
        <PaginationBar
          page={paged.page}
          pages={paged.pages}
          total={paged.total}
          limit={PUBLIC_GRID_LIMIT}
          onPageChange={(p) => setParams({ page: p <= 1 ? null : String(p) }, false)}
          className="mt-8"
        />
      )}
    </div>
  );
}
