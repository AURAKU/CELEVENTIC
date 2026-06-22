"use client";

import { Sparkles, MapPin, Armchair } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EventDayBannerProps {
  eventTitle: string;
  venueName?: string | null;
  seatLookupUrl?: string | null;
  mapsLink?: string | null;
  accentColor?: string;
}

export function EventDayBanner({
  eventTitle,
  venueName,
  seatLookupUrl,
  mapsLink,
  accentColor = "#0B8A83",
}: EventDayBannerProps) {
  return (
    <div
      className="rounded-2xl p-6 text-white shadow-lg border border-white/20 overflow-hidden relative"
      style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #0F172A 100%)` }}
    >
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="celeventic-intro-spark absolute"
            style={{
              left: `${(i * 23) % 100}%`,
              top: `${(i * 31) % 100}%`,
              background: "#D4A63A",
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      <div className="relative z-10">
        <p className="text-[10px] uppercase tracking-[0.35em] text-white/70 flex items-center gap-1.5 mb-2">
          <Sparkles className="h-3.5 w-3.5" /> Today is the day
        </p>
        <h2 className="font-display text-xl sm:text-2xl font-bold mb-2">{eventTitle}</h2>
        {venueName && (
          <p className="text-sm text-white/80 flex items-center gap-1.5 mb-4">
            <MapPin className="h-4 w-4 shrink-0" /> {venueName}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {mapsLink && (
            <Button size="sm" variant="secondary" className="bg-white/15 text-white border-white/25 hover:bg-white/25" asChild>
              <a href={mapsLink} target="_blank" rel="noopener noreferrer">
                <MapPin className="h-4 w-4" /> Directions
              </a>
            </Button>
          )}
          {seatLookupUrl && (
            <Button size="sm" variant="secondary" className="bg-white/15 text-white border-white/25 hover:bg-white/25" asChild>
              <a href={seatLookupUrl} target="_blank" rel="noopener noreferrer">
                <Armchair className="h-4 w-4" /> Find my seat
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
