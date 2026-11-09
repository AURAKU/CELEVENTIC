"use client";

import type { RefObject } from "react";
import { MapPin, Search, Store } from "lucide-react";

interface MarketplaceFeedHeroProps {
  badge: string;
  handle: string;
  liveLabel: string;
  title: string;
  bio: string;
  storiesLabel: string;
  searchLabel: string;
  cityLabel: string;
  search: string;
  city: string;
  onSearch: (value: string) => void;
  onCity: (value: string) => void;
  cityRef: RefObject<HTMLInputElement | null>;
  searchRef?: RefObject<HTMLInputElement | null>;
}

export function MarketplaceFeedHero({
  badge,
  handle,
  liveLabel,
  title,
  bio,
  storiesLabel,
  searchLabel,
  cityLabel,
  search,
  city,
  onSearch,
  onCity,
  cityRef,
  searchRef,
}: MarketplaceFeedHeroProps) {
  return (
    <section className="relative overflow-hidden px-4 pb-4 pt-6 sm:px-6 sm:pt-8 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-gradient-hero opacity-80" />
      <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-brand-500/30 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-8 h-44 w-44 rounded-full bg-gold-400/20 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        <div className="flex items-start gap-4 sm:gap-5">
          <div
            className="marketplace-story-ring-active grid h-[4.5rem] w-[4.5rem] shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 via-gold-400 to-accent-400 p-[3px] sm:h-[5.25rem] sm:w-[5.25rem]"
            aria-hidden
          >
            <div className="grid h-full w-full place-items-center rounded-full bg-slate-950 p-[3px]">
              <div className="grid h-full w-full place-items-center rounded-full bg-gradient-to-br from-brand-700 to-slate-950">
                <Store className="h-7 w-7 text-gold-300 sm:h-8 sm:w-8" strokeWidth={1.6} />
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-brand-200">
                {badge}
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                {liveLabel}
              </span>
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold leading-tight tracking-tight [overflow-wrap:normal] [word-break:normal] sm:text-4xl">
              {title}
            </h1>
            <p className="mt-0.5 text-sm text-white/55">{handle}</p>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">
              {bio}
            </p>
            <p className="mt-3 text-sm font-semibold text-white/80">{storiesLabel}</p>
          </div>
        </div>

        <div className="mt-5 flex h-12 items-center overflow-hidden rounded-full border border-white/12 bg-slate-950/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/5 focus-within:ring-2 focus-within:ring-brand-400/60">
          <label className="flex min-w-0 flex-1 items-center gap-2.5 pl-4 pr-2">
            <span className="sr-only">{searchLabel}</span>
            <Search className="h-4 w-4 shrink-0 text-white/55" aria-hidden />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={searchLabel}
              className="h-12 min-w-0 flex-1 bg-transparent text-white placeholder:text-white/40 outline-none"
            />
          </label>
          <span className="h-6 w-px shrink-0 bg-white/20" aria-hidden />
          <label className="flex h-12 w-[8.75rem] shrink-0 items-center gap-2 px-3 sm:w-44 sm:px-4">
            <span className="sr-only">{cityLabel}</span>
            <MapPin className="h-4 w-4 shrink-0 text-white/55" aria-hidden />
            <input
              ref={cityRef}
              value={city}
              onChange={(e) => onCity(e.target.value)}
              placeholder={cityLabel}
              className="h-12 min-w-0 flex-1 bg-transparent text-white placeholder:text-white/40 outline-none"
            />
          </label>
        </div>
      </div>
    </section>
  );
}
