"use client";

import { MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toMapsEmbedUrl } from "@/lib/invitation/calendar-utils";

interface VenueMapEmbedProps {
  mapsLink?: string | null;
  venueName?: string | null;
  landmark?: string | null;
  accentColor?: string;
  compact?: boolean;
}

export function VenueMapEmbed({ mapsLink, venueName, landmark, accentColor = "#0B8A83", compact }: VenueMapEmbedProps) {
  const label = [venueName, landmark].filter(Boolean).join(" · ");
  const embedUrl = toMapsEmbedUrl(mapsLink, label);
  if (!embedUrl && !mapsLink) return null;

  const directionsUrl = mapsLink ?? `https://maps.google.com/maps?q=${encodeURIComponent(label)}`;

  if (compact) {
    return (
      <a
        href={directionsUrl}
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
          <p className="font-semibold text-sm text-slate-900">Get Directions</p>
          <p className="text-xs text-slate-500 truncate">{label || "Open in Google Maps"}</p>
        </div>
        <ExternalLink className="h-4 w-4 text-slate-400 shrink-0" />
      </a>
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
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
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
