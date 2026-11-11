"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DIGITAL_CARD_SOCIAL_NETWORKS,
  isReachChannelOpenOnDesk,
  type DigitalCardSocialForm,
  type DigitalCardSocialGroup,
  type DigitalCardSocialKey,
  type DigitalCardSocialNetwork,
} from "@/lib/digital-business-card/socials";
import { otherLinkSeed, parseOtherLink } from "@/lib/digital-business-card/other-links";
import { DigitalCardBrandMark } from "@/components/digital-business-card/digital-card-brand-mark";

const SKIP_KEYS = new Set(["website", "location"]);
const OTHER_NETWORK = DIGITAL_CARD_SOCIAL_NETWORKS.find((network) => network.key === "other") ?? null;

function chipPreview(values: string[] | undefined, key?: string): string {
  const first = (values ?? []).map((value) => value.trim()).find(Boolean);
  if (!first) return "Tap to fill";
  if (key === "other") {
    const link = parseOtherLink(first);
    return link.label || link.href || "Tap to fill";
  }
  return first;
}

export function DigitalCardReachCatalog({
  groupId,
  keys,
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
  groupId: DigitalCardSocialGroup;
  keys?: readonly string[];
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
    (network) =>
      network.group === groupId &&
      !SKIP_KEYS.has(network.key) &&
      (!keys || keys.includes(network.key))
  );
  const open = networks.filter(
    (network) =>
      network.key !== "other" && isReachChannelOpenOnDesk(socials[network.key], payQr, network.key)
  );
  const otherNetwork = OTHER_NETWORK;
  const [query, setQuery] = useState("");
  const [activeKey, setActiveKey] = useState<DigitalCardSocialKey | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const needle = query.trim().toLowerCase();
  const matches = useMemo(() => {
    const pool = needle
      ? networks.filter(
          (network) =>
            network.label.toLowerCase().includes(needle) ||
            network.key.toLowerCase().includes(needle) ||
            network.placeholder.toLowerCase().includes(needle)
        )
      : networks;
    if (groupId === "social" && otherNetwork && !pool.some((network) => network.key === "other")) {
      return [...pool, otherNetwork];
    }
    return pool;
  }, [networks, needle, otherNetwork, groupId]);
  const namedOpenHit = open.some(
    (network) =>
      network.key !== "other" &&
      (network.label.toLowerCase().includes(needle) || network.key.toLowerCase().includes(needle))
  );
  const unmatched = Boolean(needle) && !namedOpenHit && !matches.some((network) => network.key !== "other");
  const active =
    networks.find((network) => network.key === activeKey) ??
    (activeKey === "other" ? otherNetwork : null);
  const ink = accent || "#0B8A83";

  useEffect(() => {
    if (!activeKey) return;
    editorRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeKey]);

  function flip(direction: -1 | 1) {
    const node = scrollerRef.current;
    if (!node) return;
    const step = Math.min(220, Math.max(96, node.clientWidth * 0.55));
    node.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  function focusOtherReservation() {
    document.getElementById("celecard-other-links")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function selectNetwork(network: DigitalCardSocialNetwork) {
    if (network.key === "other") {
      onAdd("other", otherLinkSeed(query));
      setQuery("");
      focusOtherReservation();
      return;
    }
    const already = open.some((row) => row.key === network.key);
    if (!already) onAdd(network.key);
    setActiveKey(network.key);
    setQuery("");
  }

  function addOtherPage() {
    onAdd("other", otherLinkSeed(query));
    setQuery("");
    focusOtherReservation();
  }

  return (
    <div className="min-w-0">
      {intro}
      <div className="celecard-reach-picker min-w-0 overflow-hidden rounded-2xl border border-black/10 bg-white/70 p-3">
        <label className="block min-w-0">
          <span className="sr-only">Search a network</span>
          <span className="relative block min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a network or paste any link"
              className={cn(
                "h-11 w-full min-w-0 rounded-xl border border-black/10 bg-white pl-10 pr-3 text-sm outline-none ring-offset-white focus-visible:ring-2 focus-visible:ring-stone-400",
                searchClassName
              )}
              style={searchStyle}
            />
          </span>
        </label>
        <div className="mt-2.5 flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">
            Tap a network to add or edit
          </p>
          {matches.length > 3 ? (
            <span className="flex shrink-0 gap-1">
              <button
                type="button"
                aria-label="Previous networks"
                onClick={() => flip(-1)}
                className="grid h-11 w-11 place-items-center rounded-full border border-black/10 bg-white text-stone-600 transition hover:border-black/20"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Next networks"
                onClick={() => flip(1)}
                className="grid h-11 w-11 place-items-center rounded-full border border-black/10 bg-white text-stone-600 transition hover:border-black/20"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </span>
          ) : null}
        </div>
        {matches.length ? (
          <div
            ref={scrollerRef}
            className="fit-scroller mt-2.5 flex snap-x snap-mandatory gap-2 pb-1 [scrollbar-width:thin]"
          >
            {matches.map((network) => {
              const onCard = open.some((row) => row.key === network.key);
              const editing = activeKey === network.key;
              return (
                <button
                  key={network.key}
                  type="button"
                  onClick={() => selectNetwork(network)}
                  aria-pressed={editing}
                  className={cn(
                    "relative flex w-[5.15rem] shrink-0 snap-start flex-col items-center gap-1.5 overflow-visible rounded-2xl border bg-white px-1 py-3 text-center shadow-[0_4px_12px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(15,23,42,0.1)] sm:w-[5.85rem] sm:px-1.5",
                    editing ? "border-transparent" : "border-black/10 hover:border-black/20"
                  )}
                  style={editing ? { boxShadow: `0 0 0 2px ${ink}` } : undefined}
                >
                  {onCard ? (
                    <span
                      className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full text-white"
                      style={{ background: ink }}
                      aria-hidden
                    >
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                  ) : null}
                  <DigitalCardBrandMark id={network.key} className="h-11 w-11 rounded-[13px]" />
                  <span
                    className="w-full whitespace-pre-line text-[9px] font-semibold uppercase leading-[1.15] tracking-[0.04em]"
                    style={{ color: ink }}
                  >
                    {network.label.replace(" ", "\n")}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
        {unmatched && otherNetwork ? (
          <div className={cn("rounded-xl bg-white px-3 py-3", matches.length ? "mt-3" : "mt-2.5")}>
            <p className="text-xs leading-relaxed text-stone-600">
              That app is not in the list. Save it as another page so guests can still open it.
            </p>
            <button
              type="button"
              onClick={addOtherPage}
              className="mt-2 inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white"
              style={{ background: ink }}
            >
              Add this page
            </button>
          </div>
        ) : groupId === "social" && otherNetwork ? (
          <div className={cn("rounded-xl bg-white/90 px-3 py-3", matches.length ? "mt-3" : "mt-2.5")}>
            <p className="text-xs leading-relaxed text-stone-600">
              App or category not listed? Reserve any page, shop, booking link, or profile. Guests see the name you give it.
            </p>
            <button
              type="button"
              onClick={addOtherPage}
              className="mt-2 inline-flex items-center rounded-full border border-black/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: ink }}
            >
              Add a page that is not listed
            </button>
          </div>
        ) : null}
      </div>

      {open.length ? (
        <div className="celecard-reach-chips mt-3">
          {open.map((network) => {
            const editing = activeKey === network.key;
            return (
              <button
                key={network.key}
                type="button"
                onClick={() => setActiveKey(editing ? null : network.key)}
                aria-pressed={editing}
                className={cn(
                  "celecard-reach-chip",
                  editing ? "celecard-reach-chip-active" : ""
                )}
                style={editing ? { borderColor: ink, color: ink } : undefined}
              >
                <DigitalCardBrandMark id={network.key} className="h-7 w-7 rounded-[9px]" />
                <span className="min-w-0 text-left">
                  <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.12em]">
                    {network.label}
                  </span>
                  <span className="block truncate text-[11px] text-stone-500">
                    {chipPreview(socials[network.key], network.key)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {active ? (
        <div ref={editorRef} className="celecard-reach-open mt-3">
          <div className="celecard-reach-card">
            <button
              type="button"
              onClick={() => {
                onRemove(active.key);
                setActiveKey(null);
              }}
              aria-label={`Remove ${active.label}`}
              className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full border border-black/10 bg-white text-stone-500 shadow-sm transition hover:text-stone-800"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            {children(active)}
          </div>
        </div>
      ) : open.length ? (
        <p className="mt-2 text-xs leading-relaxed text-stone-500">Tap a network on this card to edit it.</p>
      ) : null}
    </div>
  );
}
