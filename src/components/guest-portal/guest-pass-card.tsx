"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatAllowanceCopy } from "@/lib/invitation-features/place-card";
import { parseAssignedGuestGreeting } from "@/lib/social/social-guest";
import {
  isAureliaEditorialLayout,
  SERAPHINE_LAYOUT_SLUG,
} from "@/lib/experience/aurelia-editorial";

type PassTone = "aurelia" | "seraphine" | "classic";

function toneFor(layout?: string | null): PassTone {
  if (layout === SERAPHINE_LAYOUT_SLUG) return "seraphine";
  if (isAureliaEditorialLayout(layout)) return "aurelia";
  return "classic";
}

const TONE: Record<
  PassTone,
  {
    plate: string;
    rule: string;
    eyebrow: string;
    dear: string;
    honorific: string;
    name: string;
    admits: string;
    badge: string;
  }
> = {
  aurelia: {
    plate: "border-[#D8C09C]/70 bg-[linear-gradient(180deg,#FFFEFA_0%,#F8F4EA_100%)]",
    rule: "bg-[#B69A63]/70",
    eyebrow: "text-[#B65A37]",
    dear: "text-[#5A453C]",
    honorific: "text-[#B69A63]",
    name: "text-[#352019]",
    admits: "text-[#5A453C]",
    badge: "border-[#B69A63]/45 bg-[#FFFCF6] text-[#7A5E32]",
  },
  seraphine: {
    plate: "border-[#C5B48A]/70 bg-[linear-gradient(180deg,#FFFEFA_0%,#FAFAF5_100%)]",
    rule: "bg-[#C5B48A]/80",
    eyebrow: "text-[#4A6350]",
    dear: "text-[#3F5344]",
    honorific: "text-[#C5B48A]",
    name: "text-[#2C3A2E]",
    admits: "text-[#3F5344]",
    badge: "border-[#C5B48A]/50 bg-[#FFFEFA] text-[#3F5344]",
  },
  classic: {
    plate: "border-[#D4A63A]/30 bg-white",
    rule: "bg-[#D4A63A]/70",
    eyebrow: "text-[#0B8A83]",
    dear: "text-[#334155]",
    honorific: "text-[#D4A63A]",
    name: "text-[#0F172A]",
    admits: "text-slate-600",
    badge: "border-[#D4A63A]/40 bg-[#FFFCF5] text-[#8A6A1A]",
  },
};

const COUNT_WORDS = [
  "",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
] as const;

export function formatPassAdmitCount(partySize: number): { capacity: number; label: string } {
  const capacity = Math.max(1, Math.trunc(partySize || 1));
  const word = capacity <= 10 ? COUNT_WORDS[capacity] : String(capacity);
  const unit = capacity === 1 ? "guest" : "guests";
  return { capacity, label: `Admits ${word} ${unit}` };
}

export function GuestPassCard({
  guestName,
  partyAllowance,
  layout,
  help,
  children,
}: {
  guestName?: string | null;
  partyAllowance?: number | null;
  layout?: string | null;
  help?: ReactNode;
  children: ReactNode;
}) {
  const greeting = parseAssignedGuestGreeting(guestName);
  const assigned = Boolean(greeting);
  const capacity = Math.max(1, Math.trunc(partyAllowance || 1));
  const admits = formatAllowanceCopy("", capacity, { assigned });
  const count = assigned ? formatPassAdmitCount(capacity) : null;
  const palette = TONE[toneFor(layout)];
  const dearLine = greeting
    ? greeting.honorific
      ? `${greeting.salutation} ${greeting.honorific}`
      : greeting.salutation
    : null;

  return (
    <div
      className={cn("rounded-2xl border p-6 text-center shadow-sm", palette.plate)}
      data-testid="guest-pass-card"
    >
      <header className="mb-6">
        <p
          className={cn(
            "text-[10px] font-medium uppercase tracking-[0.34em]",
            palette.eyebrow
          )}
        >
          {assigned ? "Your personal invitation" : "Your pass"}
        </p>

        {greeting && dearLine ? (
          <>
            <p
              className={cn("mt-4 leading-none", palette.dear)}
              style={{
                fontFamily: "var(--font-parisienne), var(--font-great-vibes), cursive",
                fontSize: "clamp(1.9rem, 6.4vw, 2.65rem)",
              }}
            >
              {dearLine}
            </p>
            <h2
              className={cn("mt-2 font-normal leading-[1.12] tracking-[0.03em]", palette.name)}
              style={{
                fontFamily: "var(--font-cormorant), var(--font-playfair), serif",
                fontSize: greeting.name
                  ? "clamp(1.9rem, 7.4vw, 2.85rem)"
                  : "clamp(1.5rem, 5vw, 2rem)",
              }}
            >
              {greeting.name || greeting.honorific}
            </h2>
          </>
        ) : (
          <h2 className={cn("font-display mt-3 text-lg font-bold", palette.name)}>Your Pass</h2>
        )}

        <div className={cn("mx-auto mt-4 h-px w-16", palette.rule)} aria-hidden />

        {count ? (
          <p
            className={cn(
              "mx-auto mt-4 inline-flex items-center rounded-full border px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]",
              palette.badge
            )}
          >
            {count.label}
          </p>
        ) : null}

        {admits ? (
          <p
            className={cn("mx-auto mt-3 max-w-[22rem] text-[1.02rem] leading-relaxed", palette.admits)}
            style={{ fontFamily: "var(--font-eb-garamond), var(--font-cormorant), serif" }}
          >
            {admits}
          </p>
        ) : null}

        {help ? (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{help}</div>
        ) : null}
      </header>

      {children}
    </div>
  );
}
