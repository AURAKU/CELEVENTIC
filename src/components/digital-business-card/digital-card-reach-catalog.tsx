"use client";

import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DIGITAL_CARD_SOCIAL_NETWORKS,
  isReachChannelOpenOnDesk,
  type DigitalCardSocialForm,
  type DigitalCardSocialGroup,
  type DigitalCardSocialKey,
  type DigitalCardSocialNetwork,
} from "@/lib/digital-business-card/socials";
import { otherLinkSeed } from "@/lib/digital-business-card/other-links";
import { DigitalCardBrandMark } from "@/components/digital-business-card/digital-card-brand-mark";

const SKIP_KEYS = new Set(["website", "location"]);

export function DigitalCardReachCatalog({
  groupId,
  socials,
  payQr,
  onAdd,
  onRemove,
  accent,
  intro,
  searchClassName,
  searchStyle,
  children,
}: {
  groupId: Exclude<DigitalCardSocialGroup, "pay">;
  socials: DigitalCardSocialForm;
  payQr?: Record<string, string>;
  onAdd: (key: DigitalCardSocialKey, seed?: string) => void;
  onRemove: (key: DigitalCardSocialKey) => void;
  accent?: string;
  intro?: ReactNode;
  searchClassName?: string;
  searchStyle?: CSSProperties;
  children: (network: DigitalCardSocialNetwork) => ReactNode;
}) {
  const networks = DIGITAL_CARD_SOCIAL_NETWORKS.filter(
    (network) => network.group === groupId && !SKIP_KEYS.has(network.key)
  );
  const open = networks.filter((network) => isReachChannelOpenOnDesk(socials[network.key], payQr, network.key));
  const hidden = networks.filter((network) => !open.some((row) => row.key === network.key));
  const namedHidden = hidden.filter((network) => network.key !== "other");
  const otherNetwork = networks.find((network) => network.key === "other") ?? null;
  const otherHidden = Boolean(otherNetwork && hidden.some((network) => network.key === "other"));
  const [query, setQuery] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const needle = query.trim().toLowerCase();
  const namedMatches = useMemo(() => {
    if (!needle) return namedHidden;
    return namedHidden.filter(
      (network) =>
        network.label.toLowerCase().includes(needle) ||
        network.key.toLowerCase().includes(needle) ||
        network.placeholder.toLowerCase().includes(needle)
    );
  }, [namedHidden, needle]);
  const namedOpenHit = open.some(
    (network) =>
      network.key !== "other" &&
      (network.label.toLowerCase().includes(needle) || network.key.toLowerCase().includes(needle))
  );
  const showOtherTile =
    otherHidden &&
    Boolean(otherNetwork) &&
    (!needle ||
      namedMatches.length === 0 ||
      otherNetwork!.label.toLowerCase().includes(needle) ||
      needle.includes("other") ||
      needle.includes("link") ||
      needle.includes("page"));
  const matches = [...namedMatches, ...(showOtherTile && otherNetwork ? [otherNetwork] : [])];
  const unmatched =
    groupId === "social" && Boolean(needle) && namedMatches.length === 0 && !namedOpenHit;
  const emptySearch = Boolean(needle) && namedMatches.length === 0 && !namedOpenHit && !unmatched;
  const showPicker = hidden.length > 0 || unmatched || emptySearch;

  function flip(direction: -1 | 1) {
    const node = scrollerRef.current;
    if (!node) return;
    const step = Math.min(220, Math.max(96, node.clientWidth * 0.55));
    node.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  function addOtherPage() {
    onAdd("other", otherLinkSeed(query));
    setQuery("");
  }

  return (
    <div>
      {intro}
      {open.length ? (
        <div className="grid grid-cols-1 gap-4">
          {open.map((network) => (
            <div key={network.key} className="relative min-w-0">
              <button
                type="button"
                onClick={() => onRemove(network.key)}
                aria-label={`Remove ${network.label}`}
                className="absolute -right-1 -top-1 z-10 grid h-7 w-7 place-items-center rounded-full border border-black/10 bg-white text-stone-500 shadow-sm transition hover:text-stone-800"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {children(network)}
            </div>
          ))}
        </div>
      ) : null}

      {showPicker ? (
        <div className={cn("rounded-2xl border border-black/10 bg-white/70 p-3", open.length ? "mt-3" : "")}>
          <label className="block">
            <span className="sr-only">Search a network</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search WhatsApp, or any page"
                className={cn(
                  "h-11 w-full rounded-xl border border-black/10 bg-white pl-10 pr-3 text-sm outline-none ring-offset-white focus-visible:ring-2 focus-visible:ring-stone-400",
                  searchClassName
                )}
                style={searchStyle}
              />
            </span>
          </label>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
              Flip through, then tap to add
            </p>
            {matches.length > 3 ? (
              <span className="flex shrink-0 gap-1">
                <button
                  type="button"
                  aria-label="Previous networks"
                  onClick={() => flip(-1)}
                  className="grid h-8 w-8 place-items-center rounded-full border border-black/10 bg-white text-stone-600 transition hover:border-black/20"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next networks"
                  onClick={() => flip(1)}
                  className="grid h-8 w-8 place-items-center rounded-full border border-black/10 bg-white text-stone-600 transition hover:border-black/20"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </span>
            ) : null}
          </div>
          {matches.length ? (
            <div
              ref={scrollerRef}
              className="mt-2.5 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]"
            >
              {matches.map((network) => (
                <button
                  key={network.key}
                  type="button"
                  onClick={() => {
                    onAdd(network.key);
                    setQuery("");
                  }}
                  className="flex w-[5.5rem] shrink-0 snap-start flex-col items-center gap-1.5 rounded-2xl border border-black/10 bg-white px-2 py-3 text-center shadow-[0_4px_12px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-black/20 hover:shadow-[0_8px_18px_rgba(15,23,42,0.1)]"
                >
                  <DigitalCardBrandMark id={network.key} className="h-11 w-11 rounded-[13px]" />
                  <span
                    className="text-[10px] font-semibold uppercase leading-tight tracking-[0.08em]"
                    style={{ color: accent }}
                  >
                    {network.label}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
          {unmatched ? (
            <div className={cn("rounded-xl bg-white px-3 py-3", matches.length ? "mt-3" : "mt-2.5")}>
              <p className="text-xs leading-relaxed text-stone-600">
                That app is not in the list. Add it as a page so guests can still open it.
              </p>
              <button
                type="button"
                onClick={addOtherPage}
                className="mt-2 inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white"
                style={{ background: accent || "#0B8A83" }}
              >
                Add this page
              </button>
            </div>
          ) : null}
          {emptySearch ? (
            <p className="mt-3 text-xs text-stone-500">
              No network matches that search. Missing apps can be added as a page under Social.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
