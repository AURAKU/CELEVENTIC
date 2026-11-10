"use client";

import { useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseCeleCardPlace, type CeleCardPlace } from "@/lib/digital-business-card/maps";
import type { DigitalCardReachItem } from "@/lib/digital-business-card/socials";
import type { DigitalCardTheme } from "@/lib/digital-business-card/themes";

export function DigitalCardLocationDrop({
  items,
  theme,
  compact,
  preview,
}: {
  items: DigitalCardReachItem[];
  theme: DigitalCardTheme;
  compact?: boolean;
  preview?: boolean;
}) {
  return (
    <div className={cn("grid", compact ? "gap-2 p-2" : "gap-2.5 p-2.5")}>
      {items.map((item) => (
        <PlacePreview key={item.id} item={item} theme={theme} compact={compact} preview={preview} />
      ))}
    </div>
  );
}

function PlacePreview({
  item,
  theme,
  compact,
  preview,
}: {
  item: DigitalCardReachItem;
  theme: DigitalCardTheme;
  compact?: boolean;
  preview?: boolean;
}) {
  const place = parseCeleCardPlace(item.copyValue || item.href) || {
    href: item.href,
    embedUrl: null,
    label: item.title,
    provider: item.subtitle || "Maps",
    lat: null,
    lng: null,
    geoHref: null,
  };
  const mapHeight = compact ? "h-36" : "h-44";
  const [mapReady, setMapReady] = useState(false);

  return (
    <article className="overflow-hidden rounded-[1.2rem] ring-1 ring-black/8">
      <div className={cn("relative overflow-hidden", mapHeight)}>
        <MapStage place={place} theme={theme} hidden={mapReady} />
        {place.embedUrl ? (
          <iframe
            title={place.label}
            src={place.embedUrl}
            className={cn(
              "absolute inset-0 h-full w-full border-0 transition-opacity duration-300",
              mapReady ? "opacity-100" : "pointer-events-none opacity-0"
            )}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            onLoad={(event) => {
              try {
                const href = event.currentTarget.contentDocument?.location.href ?? "";
                if (!href || href === "about:blank") return;
              } catch {
                setMapReady(true);
              }
            }}
          />
        ) : null}
      </div>
      <div className={cn("grid gap-2 bg-white/70", compact ? "px-3 py-2.5" : "px-3.5 py-3")}>
        <div className="min-w-0">
          <p className={cn("truncate font-semibold tracking-tight", compact ? "text-[13px]" : "text-[15px]")}>
            {place.label}
          </p>
          <p className={cn("mt-0.5 truncate font-medium opacity-55", compact ? "text-[10px]" : "text-[12px]")}>
            {place.provider}
            {place.lat != null && place.lng != null
              ? ` · ${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}`
              : ""}
          </p>
        </div>
        {preview ? (
          <span
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold",
              compact ? "h-9 px-3 text-[11px]" : "h-10 px-3.5 text-[13px]"
            )}
            style={{ background: theme.accentSoft, color: theme.accent }}
          >
            <Navigation className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
            Open in {place.provider}
          </span>
        ) : (
          <a
            href={place.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition hover:opacity-90",
              compact ? "h-9 px-3 text-[11px]" : "h-10 px-3.5 text-[13px]"
            )}
            style={{ background: theme.accent, color: "#fffef8" }}
          >
            <Navigation className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
            Open in {place.provider}
          </a>
        )}
      </div>
    </article>
  );
}

function MapStage({
  place,
  theme,
  hidden,
}: {
  place: CeleCardPlace;
  theme: DigitalCardTheme;
  hidden?: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 grid place-items-center transition-opacity duration-300",
        hidden ? "opacity-0" : "opacity-100"
      )}
      style={{
        background: `
          radial-gradient(120% 90% at 50% 18%, ${theme.accentSoft} 0%, transparent 58%),
          linear-gradient(180deg, #e8efe8 0%, #d7e4d8 48%, #c9d7c4 100%)
        `,
      }}
      aria-hidden
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(28,25,23,0.08) 1px, transparent 1px),
            linear-gradient(rgba(28,25,23,0.08) 1px, transparent 1px)
          `,
          backgroundSize: "28px 28px",
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-8 top-[42%] h-px opacity-30"
        style={{ background: theme.accent }}
      />
      <div
        className="pointer-events-none absolute inset-y-6 left-1/2 w-px opacity-30"
        style={{ background: theme.accent }}
      />
      <span className="relative grid justify-items-center">
        <span
          className="grid h-12 w-12 place-items-center rounded-full shadow-[0_10px_24px_rgba(28,25,23,0.18)]"
          style={{ background: theme.accent, color: "#fffef8" }}
        >
          <MapPin className="h-6 w-6" />
        </span>
        <span className="mt-2 max-w-[12rem] truncate text-center text-[11px] font-semibold tracking-tight text-stone-800">
          {place.label}
        </span>
      </span>
    </div>
  );
}
