"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { BadgeCheck } from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination";
import { CategoryExploreGrid } from "@/components/marketplace/category-explore-grid";
import { CategoryStoriesRail } from "@/components/marketplace/category-stories-rail";
import { MarketplaceFeedHero } from "@/components/marketplace/marketplace-feed-hero";
import { MarketplaceMatchBoard } from "@/components/marketplace/marketplace-match-board";
import { SocialVendorPost } from "@/components/marketplace/social-vendor-post";
import type { VendorCardData } from "@/components/vendor-os/vendor-card";
import { useLocale } from "@/components/i18n/locale-provider";
import { usePagination } from "@/hooks/use-pagination";
import { PUBLIC_GRID_LIMIT } from "@/lib/pagination";
import { mergeStoryCategories, type StoryCategory } from "@/lib/vendor-os/category-visuals";
import { cn } from "@/lib/utils";

type FeedTab = "foryou" | "nearby" | "verified" | "featured";

export function MarketplaceClient() {
  const { t } = useLocale();
  const { data: session } = useSession();
  const { page, setPage, resetPage, appendToParams } = usePagination(PUBLIC_GRID_LIMIT * 2);
  const [vendors, setVendors] = useState<VendorCardData[]>([]);
  const [categories, setCategories] = useState<StoryCategory[]>(() => mergeStoryCategories([]));
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [debouncedCity, setDebouncedCity] = useState("");
  const [feedTab, setFeedTab] = useState<FeedTab>("foryou");
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listHref = session?.user
    ? "/vendor/onboarding"
    : "/auth/register?intent=vendor";

  const verified = feedTab === "verified";
  const sort =
    feedTab === "featured" ? "featured" : feedTab === "verified" ? "rating" : "recommended";

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedCity(city.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [city]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = appendToParams(new URLSearchParams());
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (category) params.set("category", category);
    if (debouncedCity) params.set("city", debouncedCity);
    if (verified) params.set("verified", "true");
    if (feedTab === "featured") params.set("featured", "true");
    params.set("sort", sort);
    const res = await fetch(`/api/vendor-os/directory?${params}`);
    const d = await res.json();
    if (d.success) {
      setVendors(d.data.vendors ?? d.data.items ?? []);
      setTotal(d.data.total ?? 0);
      setPages(d.data.pages ?? 1);
      setCategories(mergeStoryCategories(d.data.categories ?? []));
    }
    setLoading(false);
  }, [debouncedSearch, category, debouncedCity, verified, feedTab, sort, appendToParams]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    resetPage();
  }, [debouncedSearch, category, debouncedCity, feedTab, resetPage]);

  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;
    fetch("/api/vendor-os/favorites?limit=100")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d.success) return;
        const items = Array.isArray(d.data) ? d.data : d.data?.items ?? [];
        const ids = items
          .map((row: { vendorId?: string; vendor?: { id?: string } }) => row.vendor?.id ?? row.vendorId)
          .filter(Boolean) as string[];
        setSavedIds(new Set(ids));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const tabs = useMemo(
    () =>
      [
        { id: "foryou" as const, label: t("marketplace.tab_foryou") },
        { id: "nearby" as const, label: t("marketplace.tab_nearby") },
        { id: "verified" as const, label: t("marketplace.tab_verified") },
        { id: "featured" as const, label: t("marketplace.tab_featured") },
      ],
    [t]
  );

  const selectTab = (id: FeedTab) => {
    setFeedTab(id);
    if (id === "nearby") {
      window.requestAnimationFrame(() => cityRef.current?.focus());
    }
  };

  const toggleSave = async (vendorId: string) => {
    if (!session?.user) {
      window.location.href = `/auth/login?callbackUrl=${encodeURIComponent("/marketplace")}`;
      return;
    }
    const wasSaved = savedIds.has(vendorId);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (wasSaved) next.delete(vendorId);
      else next.add(vendorId);
      return next;
    });
    try {
      const res = wasSaved
        ? await fetch(`/api/vendor-os/favorites?vendorId=${encodeURIComponent(vendorId)}`, { method: "DELETE" })
        : await fetch("/api/vendor-os/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vendorId }),
          });
      if (!res.ok) throw new Error("save failed");
    } catch {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.add(vendorId);
        else next.delete(vendorId);
        return next;
      });
    }
  };

  const shareVendor = async (vendor: VendorCardData) => {
    const url = `${window.location.origin}/vendors/${vendor.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: vendor.businessName, text: vendor.businessName, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopiedId(vendor.id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      /* user cancelled share sheet */
    }
  };

  return (
    <div className="min-h-app-viewport bg-slate-950 text-white">
      <MarketplaceFeedHero
        badge={t("marketplace.badge")}
        handle={t("marketplace.feed_handle")}
        liveLabel={t("marketplace.feed_live")}
        title={t("marketplace.feed_title")}
        bio={t("marketplace.feed_bio")}
        storiesLabel={t("marketplace.feed_stories_count", { count: categories.length })}
        searchLabel={t("marketplace.search_feed")}
        cityLabel={t("marketplace.city")}
        search={search}
        city={city}
        onSearch={setSearch}
        onCity={setCity}
        cityRef={cityRef}
        searchRef={searchRef}
      />

      <div className="sticky top-[4rem] z-30 border-y border-white/10 bg-slate-950/85 backdrop-blur-xl sm:top-[4.25rem]">
        <div className="mx-auto max-w-6xl px-3 py-3 sm:px-6 lg:px-8">
          <CategoryStoriesRail
            categories={categories}
            selected={category}
            allLabel={t("marketplace.all")}
            onSelect={setCategory}
          />
          <div
            role="tablist"
            aria-label={t("marketplace.feed_tabs")}
            className="mt-2 flex gap-1 overflow-x-auto scrollbar-none"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={feedTab === tab.id}
                onClick={() => selectTab(tab.id)}
                className={cn(
                  "min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold touch-manipulation transition-colors",
                  feedTab === tab.id
                    ? "bg-white text-slate-950"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {feedTab === "nearby" && !debouncedCity && (
          <p className="mb-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75">
            {t("marketplace.nearby_hint")}
          </p>
        )}

        {loading ? (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "mb-4 animate-pulse break-inside-avoid rounded-[1.4rem] bg-white/10",
                  i % 2 === 0 ? "h-72" : "h-56"
                )}
              />
            ))}
          </div>
        ) : vendors.length === 0 ? (
          <div className="space-y-8">
            <MarketplaceMatchBoard
              kicker={t("marketplace.match_kicker")}
              title={
                category
                  ? t("marketplace.match_title_category", { category })
                  : t("marketplace.match_title")
              }
              body={t("marketplace.match_body")}
              hostTitle={t("marketplace.match_host_title")}
              hostBody={t("marketplace.match_host_body")}
              vendorTitle={t("marketplace.match_vendor_title")}
              vendorBody={t("marketplace.match_vendor_body")}
              connectLabel={t("marketplace.match_connect")}
              chips={[
                t("marketplace.match_chip_work"),
                t("marketplace.match_chip_quotes"),
                t("marketplace.match_chip_verified"),
                t("marketplace.match_chip_reviews"),
                t("marketplace.match_chip_rates"),
              ]}
              trust={[
                {
                  kind: "verified",
                  title: t("marketplace.match_trust_verified_title"),
                  body: t("marketplace.match_trust_verified_body"),
                },
                {
                  kind: "reviews",
                  title: t("marketplace.match_trust_reviews_title"),
                  body: t("marketplace.match_trust_reviews_body"),
                },
                {
                  kind: "safety",
                  title: t("marketplace.match_trust_safety_title"),
                  body: t("marketplace.match_trust_safety_body"),
                },
              ]}
              findLabel={t("marketplace.match_find")}
              verifiedFindLabel={t("marketplace.match_find_verified")}
              listLabel={t("marketplace.match_list")}
              listHref={listHref}
              onFind={() => {
                window.setTimeout(() => {
                  searchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                  searchRef.current?.focus();
                }, 0);
              }}
              onFindVerified={() => selectTab("verified")}
            />
            <div>
              <p className="mb-3 text-sm font-semibold text-white/70">{t("marketplace.match_browse")}</p>
              <CategoryExploreGrid
                categories={categories}
                openLabel={t("marketplace.open_story")}
                onSelect={setCategory}
              />
            </div>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-white/55">
              {total.toLocaleString()} {t("marketplace.results")}
              {category ? ` · ${category}` : ""}
            </p>
            <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
              {vendors.map((vendor, index) => (
                <SocialVendorPost
                  key={vendor.id}
                  vendor={vendor}
                  index={index}
                  saved={savedIds.has(vendor.id)}
                  copied={copiedId === vendor.id}
                  saveLabel={t("marketplace.save")}
                  unsaveLabel={t("marketplace.saved")}
                  shareLabel={t("marketplace.share")}
                  copiedLabel={t("marketplace.link_copied")}
                  viewLabel={t("marketplace.view_profile")}
                  fromLabel={t("marketplace.from_price")}
                  unverifiedLabel={t("marketplace.unverified")}
                  noReviewsLabel={t("marketplace.no_reviews")}
                  onSave={toggleSave}
                  onShare={shareVendor}
                />
              ))}
            </div>
            <PaginationBar
              page={page}
              pages={pages}
              total={total}
              limit={PUBLIC_GRID_LIMIT * 2}
              onPageChange={setPage}
              className="text-white/70"
            />
          </>
        )}

        <div className="mt-10 rounded-[1.6rem] border border-white/10 bg-gradient-to-br from-brand-800/40 to-slate-900 px-5 py-8 text-center">
          <BadgeCheck className="mx-auto h-8 w-8 text-gold-400" />
          <p className="mt-3 text-lg font-semibold">{t("marketplace.vendor_cta")}</p>
          <Link
            href={listHref}
            className="mt-4 inline-flex min-h-12 items-center rounded-full bg-white px-6 font-semibold text-slate-950"
          >
            {t("marketplace.join_free")}
          </Link>
        </div>
      </div>
    </div>
  );
}
