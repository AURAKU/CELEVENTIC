"use client";

import { MapPin, Calendar, Clock, Heart, Armchair } from "lucide-react";
import type { CalendarEventInput } from "@/lib/invitation/calendar-utils";

export interface InvitationFeatureDockProps {
  calendarEvent: CalendarEventInput;
  mapsLink?: string | null;
  venueName?: string | null;
  accentColor?: string;
  onRsvp?: () => void;
  onCalendar?: () => void;
  onCountdown?: () => void;
  onMap?: () => void;
  showRsvp?: boolean;
  seatLookupUrl?: string | null;
}

export function InvitationFeatureDock({
  accentColor = "#0B8A83",
  onRsvp,
  onCalendar,
  onCountdown,
  onMap,
  showRsvp = true,
  seatLookupUrl,
  mapsLink,
  venueName,
}: InvitationFeatureDockProps) {
  const tiles = [
    showRsvp && onRsvp && { key: "rsvp", icon: Heart, label: "RSVP", sub: "Respond", onClick: onRsvp },
    onCalendar && { key: "calendar", icon: Calendar, label: "Calendar", sub: "Save date", onClick: onCalendar },
    onCountdown && { key: "countdown", icon: Clock, label: "Countdown", sub: "Time left", onClick: onCountdown },
    (mapsLink || venueName) && onMap && { key: "map", icon: MapPin, label: "Map", sub: "Directions", onClick: onMap },
    seatLookupUrl && { key: "seat", icon: Armchair, label: "Seating", sub: "My seat", href: seatLookupUrl },
  ].filter(Boolean) as Array<{
    key: string;
    icon: typeof MapPin;
    label: string;
    sub: string;
    onClick?: () => void;
    href?: string;
  }>;

  if (tiles.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-center text-xs uppercase tracking-[0.35em] text-slate-500">Quick actions</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          const className =
            "inv-3d-card group flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-slate-200/80 bg-white/95 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all touch-manipulation min-h-[96px]";
          const inner = (
            <>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform"
                style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)` }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm text-slate-900">{tile.label}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{tile.sub}</p>
              </div>
            </>
          );
          if (tile.href) {
            return (
              <a key={tile.key} href={tile.href} target="_blank" rel="noopener noreferrer" className={className}>
                {inner}
              </a>
            );
          }
          return (
            <button key={tile.key} type="button" onClick={tile.onClick} className={className}>
              {inner}
            </button>
          );
        })}
      </div>
    </div>
  );
}
