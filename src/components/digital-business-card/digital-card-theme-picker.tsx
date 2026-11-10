"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DIGITAL_CARD_THEME_FILTERS,
  DIGITAL_CARD_THEMES,
  type DigitalCardTheme,
  type DigitalCardThemeCategory,
  type DigitalCardThemeId,
} from "@/lib/digital-business-card/themes";
import { DigitalCardAtmosphere } from "@/components/digital-business-card/digital-card-atmosphere";
import { celecardTypeVoice } from "@/lib/digital-business-card/type-voice";

function isDarkInk(color: string) {
  const hex = color.replace("#", "");
  if (hex.length < 6) return true;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 148;
}

function ThemeArtTile({
  theme,
  selected,
  onSelect,
}: {
  theme: DigitalCardTheme;
  selected: boolean;
  onSelect: (id: DigitalCardThemeId) => void;
}) {
  const light = isDarkInk(theme.text);
  const voice = celecardTypeVoice(theme);
  return (
    <button
      type="button"
      onClick={() => onSelect(theme.id)}
      aria-pressed={selected}
      className={cn(
        "group overflow-hidden rounded-2xl border text-left transition",
        selected
          ? "border-[#0B8A83] ring-2 ring-[#0B8A83]/30"
          : "border-slate-200 hover:border-slate-300 hover:shadow-[0_16px_36px_rgba(15,23,42,0.12)]"
      )}
    >
      <div className="relative aspect-[5/4] overflow-hidden" style={{ background: theme.stageBackground }}>
        <DigitalCardAtmosphere atmosphere={theme.atmosphere ?? "none"} theme={theme} compact />
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 h-24",
            light
              ? "bg-gradient-to-t from-white via-white/80 to-transparent"
              : "bg-gradient-to-t from-black/90 via-black/55 to-transparent"
          )}
        />
        <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2 pt-6">
          <p
            className="truncate text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: light ? "#0f172a" : "#f8fafc", fontFamily: voice.origin, opacity: 0.86 }}
          >
            {theme.artLabel || theme.previewLabel}
          </p>
          <p
            className="truncate text-[13px] font-semibold leading-tight"
            style={{
              color: light ? "#0f172a" : "#ffffff",
              fontFamily: voice.heading,
              letterSpacing: voice.nameTracking,
            }}
          >
            {theme.previewLabel}
          </p>
        </div>
        {theme.premium ? (
          <span
            className={cn(
              "absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
              light ? "bg-white text-amber-900 shadow-sm" : "bg-black/70 text-amber-100"
            )}
          >
            Premium
          </span>
        ) : null}
      </div>
      <div className="px-2.5 py-2">
        <p className="line-clamp-2 text-[10px] leading-snug text-slate-500">{theme.tagline}</p>
      </div>
    </button>
  );
}

export function DigitalCardThemePicker({
  value,
  onChange,
}: {
  value: DigitalCardThemeId;
  onChange: (id: DigitalCardThemeId) => void;
}) {
  const [filter, setFilter] = useState<"all" | DigitalCardThemeCategory>("all");
  const themes = useMemo(
    () =>
      filter === "all"
        ? DIGITAL_CARD_THEMES
        : DIGITAL_CARD_THEMES.filter((t) => t.category === filter),
    [filter]
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {DIGITAL_CARD_THEME_FILTERS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setFilter(chip.id)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium",
              filter === chip.id
                ? "bg-[#0B8A83] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>
      <div className="grid max-h-[36rem] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
        {themes.map((theme) => (
          <ThemeArtTile
            key={theme.id}
            theme={theme}
            selected={value === theme.id}
            onSelect={onChange}
          />
        ))}
      </div>
    </div>
  );
}
