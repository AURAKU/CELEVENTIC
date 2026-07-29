"use client";

import { MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toMapsEmbedUrl } from "@/lib/invitation/calendar-utils";
import { buildDirectionsUrl } from "@/lib/invitation/maps-utils";
import { cn } from "@/lib/utils";

export interface VenueMapHeritageChrome {
  surface: string;
  border: string;
  ink: string;
  muted: string;
  accent: string;
  radius: string;
}

interface VenueMapEmbedProps {
  mapsLink?: string | null;
  venueName?: string | null;
  landmark?: string | null;
  accentColor?: string;
  compact?: boolean;
  /**
   * Invitation stationery glimpse: venue name sits on top of a live map preview,
   * with directions as the clear next step.
   */
  presentation?: "card" | "glimpse";
  heritage?: VenueMapHeritageChrome | null;
  directionsLabel?: string;
}

export function VenueMapEmbed({
  mapsLink,
  venueName,
  landmark,
  accentColor = "#0B8A83",
  compact,
  presentation = "card",
  heritage,
  directionsLabel = "Get Directions",
}: VenueMapEmbedProps) {
  const label = [venueName, landmark].filter(Boolean).join(" · ");
  const title = venueName?.trim() || landmark?.trim() || "Venue";
  const embedUrl = toMapsEmbedUrl(mapsLink, label || title);
  const directionsUrl = buildDirectionsUrl({ mapsLink, venueName, landmark });
  if (!embedUrl && !directionsUrl) return null;

  if (compact) {
    return (
      <a
        href={directionsUrl ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="inv-3d-card flex items-center gap-3 p-4 rounded-2xl border border-white/20 bg-white/95 shadow-lg hover:shadow-xl transition-all touch-manipulation"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
          style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}
        >
          <MapPin className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-slate-900">{directionsLabel}</p>
          <p className="text-xs text-slate-500 truncate">{label || "Open in Google Maps"}</p>
        </div>
        <ExternalLink className="h-4 w-4 text-slate-400 shrink-0" />
      </a>
    );
  }

  if (presentation === "glimpse") {
    const accent = heritage?.accent ?? accentColor;
    const ink = heritage?.ink ?? "#0F172A";
    const muted = heritage?.muted ?? "#64748B";
    const border = heritage?.border ?? "rgba(15, 23, 42, 0.12)";
    const surface = heritage?.surface ?? "#FFFFFF";
    const radius = heritage?.radius ?? "1rem";

    return (
      <div className="w-full space-y-4">
        <div
          className="relative overflow-hidden"
          style={{
            borderRadius: radius,
            border: `1px solid ${border}`,
            background: surface,
            boxShadow: heritage
              ? `0 18px 40px -28px ${accent}88`
              : "0 18px 40px -24px rgba(15,23,42,0.28)",
          }}
        >
          {/* Venue title sits on top of the map glimpse */}
          <div
            className="relative z-20 px-4 pt-4 pb-3 text-center"
            style={{
              background: heritage
                ? `linear-gradient(180deg, ${surface} 0%, ${surface}f2 72%, transparent 100%)`
                : "linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.88) 70%, transparent 100%)",
            }}
          >
            <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full"
              style={{
                background: heritage ? `${accent}18` : `${accentColor}18`,
                color: accent,
              }}
            >
              <MapPin className="h-4 w-4" aria-hidden />
            </div>
            <p
              className={cn(
                "leading-snug",
                heritage
                  ? "font-[family-name:var(--font-cinzel)] text-[15px] sm:text-base font-semibold tracking-[0.08em] uppercase"
                  : "font-display text-base font-semibold tracking-wide"
              )}
              style={{ color: ink }}
            >
              {title}
            </p>
            {landmark && venueName && (
              <p
                className={cn(
                  "mt-1",
                  heritage
                    ? "font-[family-name:var(--font-cormorant)] text-[13px] italic"
                    : "text-xs text-slate-500"
                )}
                style={heritage ? { color: muted } : undefined}
              >
                {landmark}
              </p>
            )}
          </div>

          {embedUrl ? (
            <div className="relative aspect-[16/11] min-h-[180px] bg-slate-100 -mt-6">
              <iframe
                title={`Map preview for ${title}`}
                src={embedUrl}
                className="absolute inset-0 h-full w-full border-0 grayscale-[0.15] contrast-[1.02]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
              {/* Soft top fade so the title reads over the map */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-16"
                style={{
                  background: heritage
                    ? `linear-gradient(180deg, ${surface}cc, transparent)`
                    : "linear-gradient(180deg, rgba(255,255,255,0.55), transparent)",
                }}
              />
              {/* Bottom CTA strip over the map */}
              {directionsUrl && (
                <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center px-4 pb-3 pt-10"
                  style={{
                    background: heritage
                      ? `linear-gradient(0deg, ${surface}f5 0%, ${surface}88 45%, transparent 100%)`
                      : "linear-gradient(0deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.55) 55%, transparent 100%)",
                  }}
                >
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 touch-manipulation",
                      !heritage && "bg-[#0F172A] text-white"
                    )}
                    style={
                      heritage
                        ? {
                            color: ink,
                            background: `linear-gradient(135deg, ${surface}, ${accent}33)`,
                            border: `1px solid ${border}`,
                            boxShadow: `0 10px 22px -14px ${accent}`,
                          }
                        : undefined
                    }
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    {directionsLabel}
                  </a>
                </div>
              )}
            </div>
          ) : (
            directionsUrl && (
              <div className="px-4 pb-4 pt-2 text-center">
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
                  style={{ color: accent }}
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  {directionsLabel}
                </a>
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="inv-3d-scene rounded-2xl overflow-hidden border border-slate-200/80 bg-white shadow-xl">
      <div className="px-4 py-3 flex items-center justify-between gap-2 border-b bg-slate-50">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="h-4 w-4 shrink-0" style={{ color: accentColor }} />
          <div className="min-w-0">
            <p className="font-semibold text-sm text-slate-900 truncate">{venueName ?? "Venue"}</p>
            {landmark && <p className="text-xs text-slate-500 truncate">{landmark}</p>}
          </div>
        </div>
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <a href={directionsUrl ?? undefined} target="_blank" rel="noopener noreferrer">
            Directions <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        </Button>
      </div>
      {embedUrl && (
        <div className="relative aspect-[16/10] bg-slate-100">
          <iframe
            title="Venue map"
            src={embedUrl}
            className="absolute inset-0 w-full h-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}
