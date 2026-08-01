"use client";

import type { ReactNode } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bath,
  Camera,
  ClipboardList,
  Disc3,
  DoorOpen,
  Gift,
  Martini,
  Sparkles,
  UtensilsCrossed,
  Wine,
} from "lucide-react";
import type { VenueElementKind } from "@/lib/seating/studio-types";
import { venueFeaturePreset } from "@/lib/seating/venue-feature-presets";
import { cn } from "@/lib/utils";

export type VenueFeatureVisualVariant = "palette" | "canvas" | "inspector";

type VenueFeatureVisualProps = {
  kind: VenueElementKind;
  label?: string;
  color?: string;
  variant?: VenueFeatureVisualVariant;
  showLabel?: boolean;
  className?: string;
};

function CakeGlyph({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
      <ellipse cx="32" cy="54" rx="22" ry="4" fill={color} opacity="0.2" />
      <rect x="14" y="38" width="36" height="14" rx="3" fill={color} opacity="0.85" />
      <rect x="18" y="26" width="28" height="12" rx="3" fill={color} />
      <rect x="24" y="16" width="16" height="10" rx="3" fill={color} opacity="0.9" />
      <circle cx="32" cy="13" r="3" fill="#F59E0B" />
      <path d="M32 10 v-4" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      <circle cx="22" cy="44" r="1.5" fill="white" opacity="0.8" />
      <circle cx="32" cy="46" r="1.5" fill="white" opacity="0.8" />
      <circle cx="42" cy="44" r="1.5" fill="white" opacity="0.8" />
    </svg>
  );
}

function StageGlyph({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 56" className="h-full w-full" aria-hidden>
      <rect x="8" y="18" width="104" height="28" rx="4" fill={color} opacity="0.18" />
      <rect x="14" y="22" width="92" height="18" rx="3" fill={color} opacity="0.55" />
      <rect x="18" y="14" width="84" height="8" rx="2" fill={color} />
      <path d="M10 14 Q60 2 110 14" fill="none" stroke={color} strokeWidth="3" opacity="0.7" />
      <circle cx="28" cy="10" r="2.5" fill="#FBBF24" />
      <circle cx="60" cy="6" r="2.5" fill="#FBBF24" />
      <circle cx="92" cy="10" r="2.5" fill="#FBBF24" />
      <rect x="4" y="40" width="112" height="8" rx="2" fill={color} opacity="0.9" />
    </svg>
  );
}

function DanceFloorGlyph({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 80 64" className="h-full w-full" aria-hidden>
      <rect
        x="6"
        y="6"
        width="68"
        height="52"
        rx="6"
        fill={color}
        opacity="0.12"
        stroke={color}
        strokeWidth="2"
      />
      {[0, 1, 2, 3].map((row) =>
        [0, 1, 2, 3].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={12 + col * 14}
            y={12 + row * 11}
            width="12"
            height="9"
            rx="1"
            fill={(row + col) % 2 === 0 ? color : "white"}
            opacity={(row + col) % 2 === 0 ? 0.45 : 0.7}
          />
        ))
      )}
      <circle cx="40" cy="34" r="6" fill={color} opacity="0.85" />
      <circle cx="40" cy="34" r="2.5" fill="white" />
    </svg>
  );
}

function BarGlyph({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 96 48" className="h-full w-full" aria-hidden>
      <rect x="8" y="22" width="80" height="18" rx="3" fill={color} opacity="0.25" />
      <rect x="10" y="18" width="76" height="8" rx="2" fill={color} />
      <rect x="18" y="8" width="6" height="12" rx="1" fill={color} opacity="0.8" />
      <rect x="30" y="10" width="5" height="10" rx="1" fill={color} opacity="0.65" />
      <rect x="42" y="7" width="6" height="13" rx="1" fill={color} opacity="0.8" />
      <path d="M58 20 c0-8 8-8 8 0 v6 h-8z" fill={color} opacity="0.7" />
      <path d="M72 20 c0-10 10-10 10 0 v6 h-10z" fill={color} opacity="0.55" />
    </svg>
  );
}

function BuffetGlyph({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 110 48" className="h-full w-full" aria-hidden>
      <rect x="6" y="24" width="98" height="14" rx="3" fill={color} opacity="0.3" />
      <rect x="8" y="20" width="94" height="6" rx="2" fill={color} />
      <ellipse cx="28" cy="16" rx="10" ry="5" fill={color} opacity="0.7" />
      <ellipse cx="55" cy="14" rx="12" ry="6" fill={color} opacity="0.55" />
      <ellipse cx="82" cy="16" rx="10" ry="5" fill={color} opacity="0.7" />
      <rect x="20" y="36" width="4" height="6" fill={color} opacity="0.5" />
      <rect x="86" y="36" width="4" height="6" fill={color} opacity="0.5" />
    </svg>
  );
}

function LoungeGlyph({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 96 56" className="h-full w-full" aria-hidden>
      <rect x="14" y="22" width="68" height="20" rx="6" fill={color} opacity="0.35" />
      <rect x="18" y="16" width="60" height="14" rx="5" fill={color} />
      <rect x="10" y="28" width="10" height="16" rx="3" fill={color} opacity="0.8" />
      <rect x="76" y="28" width="10" height="16" rx="3" fill={color} opacity="0.8" />
      <rect x="24" y="40" width="8" height="6" rx="1" fill={color} opacity="0.55" />
      <rect x="64" y="40" width="8" height="6" rx="1" fill={color} opacity="0.55" />
      <path
        d="M40 12 l4 4 8-8"
        fill="none"
        stroke="#FBBF24"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBadge({
  color,
  children,
  className,
}: {
  color: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex h-full w-full items-center justify-center rounded-[inherit]", className)}
      style={{
        background: `radial-gradient(circle at 30% 20%, ${color}33, ${color}14 55%, transparent 70%), linear-gradient(160deg, white, ${color}18)`,
      }}
    >
      <div
        className="flex items-center justify-center rounded-xl shadow-sm ring-1 ring-black/5"
        style={{ background: `${color}22`, color }}
      >
        {children}
      </div>
    </div>
  );
}

export function VenueFeatureVisual({
  kind,
  label,
  color,
  variant = "canvas",
  showLabel = true,
  className,
}: VenueFeatureVisualProps) {
  const preset = venueFeaturePreset(kind);
  const accent = color?.trim() || preset.color;
  const title = label?.trim() || preset.label;
  const isPalette = variant === "palette";
  const isInspector = variant === "inspector";
  const iconSize = isPalette ? "h-4 w-4" : isInspector ? "h-6 w-6" : "h-5 w-5 sm:h-6 sm:w-6";

  let artwork: ReactNode;
  switch (kind) {
    case "stage":
      artwork = <StageGlyph color={accent} />;
      break;
    case "dance_floor":
      artwork = <DanceFloorGlyph color={accent} />;
      break;
    case "cake":
      artwork = <CakeGlyph color={accent} />;
      break;
    case "bar":
      artwork = <BarGlyph color={accent} />;
      break;
    case "buffet":
      artwork = <BuffetGlyph color={accent} />;
      break;
    case "vip_lounge":
      artwork = <LoungeGlyph color={accent} />;
      break;
    case "dj":
      artwork = (
        <IconBadge color={accent}>
          <Disc3 className={cn(iconSize, "m-2")} />
        </IconBadge>
      );
      break;
    case "gift":
      artwork = (
        <IconBadge color={accent}>
          <Gift className={cn(iconSize, "m-2")} />
        </IconBadge>
      );
      break;
    case "photo_booth":
      artwork = (
        <IconBadge color={accent}>
          <Camera className={cn(iconSize, "m-2")} />
        </IconBadge>
      );
      break;
    case "entrance":
      artwork = (
        <IconBadge color={accent}>
          <span className="flex items-center gap-0.5 p-2">
            <DoorOpen className={iconSize} />
            <ArrowDownToLine className="h-3.5 w-3.5" />
          </span>
        </IconBadge>
      );
      break;
    case "exit":
      artwork = (
        <IconBadge color={accent}>
          <span className="flex items-center gap-0.5 p-2">
            <DoorOpen className={iconSize} />
            <ArrowUpFromLine className="h-3.5 w-3.5" />
          </span>
        </IconBadge>
      );
      break;
    case "restroom":
      artwork = (
        <IconBadge color={accent}>
          <span className="flex items-center gap-1 p-2 text-[10px] font-bold tracking-wide">
            <Bath className={iconSize} />
            WC
          </span>
        </IconBadge>
      );
      break;
    case "registration":
      artwork = (
        <IconBadge color={accent}>
          <ClipboardList className={cn(iconSize, "m-2")} />
        </IconBadge>
      );
      break;
    case "pillar":
      artwork = (
        <div
          className="flex h-full w-full items-end justify-center pb-1"
          style={{ background: `linear-gradient(180deg, ${accent}22, ${accent}55)` }}
        >
          <div className="h-[85%] w-1/3 rounded-t-md" style={{ background: accent }} />
        </div>
      );
      break;
    default:
      artwork = (
        <IconBadge color={accent}>
          <Sparkles className={cn(iconSize, "m-2")} />
        </IconBadge>
      );
  }

  if (isPalette && (kind === "buffet" || kind === "bar")) {
    artwork = (
      <IconBadge color={accent}>
        {kind === "buffet" ? (
          <UtensilsCrossed className={cn(iconSize, "m-1.5")} />
        ) : (
          <span className="flex items-center gap-0.5 p-1.5">
            <Wine className="h-3.5 w-3.5" />
            <Martini className="h-3.5 w-3.5" />
          </span>
        )}
      </IconBadge>
    );
  }

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden rounded-[inherit]",
        className
      )}
      style={{
        background:
          kind === "dance_floor"
            ? `linear-gradient(145deg, ${accent}10, white 40%, ${accent}18)`
            : kind === "stage"
              ? `linear-gradient(180deg, ${accent}12, white 50%, ${accent}20)`
              : undefined,
      }}
    >
      <div
        className={cn(
          "min-h-0 flex-1 px-1.5",
          isPalette ? "pt-1.5" : "pt-2",
          !showLabel && "pb-1.5"
        )}
      >
        {artwork}
      </div>
      {showLabel && (
        <div
          className={cn(
            "shrink-0 border-t px-1.5 py-1 text-center",
            isPalette ? "border-black/5" : "border-black/5 bg-white/70 backdrop-blur-[2px]"
          )}
        >
          <p
            className={cn(
              "truncate font-semibold leading-tight",
              isPalette
                ? "text-[10px] text-slate-700"
                : "text-[10px] uppercase tracking-[0.12em] text-slate-600"
            )}
            style={!isPalette ? { color: accent } : undefined}
          >
            {title}
          </p>
        </div>
      )}
    </div>
  );
}
