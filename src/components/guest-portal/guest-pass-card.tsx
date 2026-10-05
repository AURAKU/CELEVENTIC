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
    nameGlow: string;
    namePlate: string;
    nameGiven: string;
    nameFamily: string;
    flourish: string;
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
    nameGlow:
      "bg-[radial-gradient(ellipse_at_center,rgba(182,154,99,0.2)_0%,transparent_72%)]",
    namePlate:
      "rounded-[1.15rem] bg-[linear-gradient(180deg,rgba(255,254,250,0.92),rgba(248,244,234,0.78))] shadow-[inset_0_0_0_1px_rgba(182,154,99,0.9),0_0_0_5px_rgba(255,252,246,0.95),0_0_0_6px_rgba(182,154,99,0.72)]",
    nameGiven: "text-[#5A453C]",
    nameFamily: "text-[#352019]",
    flourish: "text-[#B69A63]",
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
    nameGlow:
      "bg-[radial-gradient(ellipse_at_center,rgba(197,180,138,0.22)_0%,transparent_70%)]",
    namePlate:
      "rounded-[1.15rem] bg-[linear-gradient(180deg,rgba(255,254,250,0.96),rgba(245,240,228,0.82))] shadow-[inset_0_0_0_1px_#c5b48a,0_0_0_5px_rgba(250,250,245,0.96),0_0_0_6px_#c5b48a]",
    nameGiven: "text-[#2C3A2E]",
    nameFamily: "text-[#1E2A22]",
    flourish: "text-[#C5B48A]",
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
    nameGlow:
      "bg-[radial-gradient(ellipse_at_center,rgba(212,166,58,0.18)_0%,transparent_72%)]",
    namePlate:
      "rounded-[1.15rem] bg-[linear-gradient(180deg,#fff,#fffdf7)] shadow-[inset_0_0_0_1px_rgba(212,166,58,0.85),0_0_0_5px_#fff,0_0_0_6px_rgba(212,166,58,0.7)]",
    nameGiven: "text-[#0F172A]",
    nameFamily: "text-[#0F172A]",
    flourish: "text-[#D4A63A]",
    admits: "text-slate-600",
    badge: "border-[#D4A63A]/40 bg-[#FFFCF5] text-[#8A6A1A]",
  },
};

function splitGuestPlaceName(name: string): { given: string; family: string | null } {
  const cleaned = name.replace(/\s+/g, " ").trim();
  if (!cleaned) return { given: "", family: null };
  const parts = cleaned.split(" ");
  if (parts.length < 2) return { given: cleaned, family: null };
  return { given: parts.slice(0, -1).join(" "), family: parts[parts.length - 1] ?? null };
}

function NameFlourish({ className }: { className: string }) {
  return (
    <span
      className={cn("mx-auto flex w-[min(16.5rem,82%)] items-center gap-2", className)}
      aria-hidden
    >
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-current opacity-80" />
      <span className="h-[6px] w-[6px] rotate-45 border border-current opacity-90" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-current opacity-80" />
    </span>
  );
}

function GuestPlaceName({
  name,
  palette,
}: {
  name: string;
  palette: (typeof TONE)[PassTone];
}) {
  const { given, family } = splitGuestPlaceName(name);
  const label = family ? `${given} ${family}` : given;
  const longFamily = Boolean(family && family.length > 11);

  return (
    <div
      className={cn(
        "relative mx-auto mt-3 w-full max-w-[22.5rem] px-3 py-4",
        palette.nameGlow,
        palette.namePlate
      )}
    >
      <NameFlourish className={cn("mb-2.5", palette.flourish)} />
      <h2 className={cn("grid justify-items-center gap-[0.2rem] leading-none", palette.name)} aria-label={label}>
        {family ? (
          <>
            <span
              className={cn("max-w-full px-1 break-words font-normal italic", palette.nameGiven)}
              style={{
                fontFamily: "var(--font-cormorant), var(--font-playfair), serif",
                fontSize: "clamp(1.62rem, 5.9vw, 2.28rem)",
                letterSpacing: "0.06em",
              }}
            >
              {given}
            </span>
            <span
              className={cn(
                "max-w-full px-1 break-words font-semibold uppercase",
                palette.nameFamily
              )}
              style={{
                fontFamily: "var(--font-cormorant), var(--font-playfair), serif",
                fontSize: longFamily
                  ? "clamp(1.7rem, 6.4vw, 2.45rem)"
                  : "clamp(2.2rem, 8.4vw, 3.2rem)",
                letterSpacing: longFamily ? "0.08em" : "0.2em",
                textShadow: "0 1px 0 rgba(255,252,246,0.85), 0 10px 22px rgba(44,58,46,0.08)",
              }}
            >
              {family}
            </span>
          </>
        ) : (
          <span
            className={cn("max-w-full px-1 break-words font-semibold italic", palette.nameFamily)}
            style={{
              fontFamily: "var(--font-cormorant), var(--font-playfair), serif",
              fontSize: "clamp(2.2rem, 8.4vw, 3.25rem)",
              letterSpacing: "0.06em",
            }}
          >
            {given}
          </span>
        )}
      </h2>
      <NameFlourish className={cn("mt-3", palette.flourish)} />
    </div>
  );
}

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
            <GuestPlaceName
              name={greeting.name || greeting.honorific}
              palette={palette}
            />
          </>
        ) : (
          <h2 className={cn("font-display mt-3 text-lg font-bold", palette.name)}>Your Pass</h2>
        )}

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
