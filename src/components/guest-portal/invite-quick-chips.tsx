"use client";

import { MapPin, CheckCircle, Armchair, Calendar } from "lucide-react";

interface InviteQuickChipsProps {
  mapsLink?: string | null;
  seatLookupUrl?: string | null;
  onRsvp?: () => void;
  showRsvp?: boolean;
  onCalendar?: () => void;
}

export function InviteQuickChips({ mapsLink, seatLookupUrl, onRsvp, showRsvp, onCalendar }: InviteQuickChipsProps) {
  const chips = [
    showRsvp && onRsvp && {
      key: "rsvp",
      label: "RSVP",
      icon: CheckCircle,
      onClick: onRsvp,
    },
    mapsLink && {
      key: "map",
      label: "Directions",
      icon: MapPin,
      href: mapsLink,
    },
    seatLookupUrl && {
      key: "seat",
      label: "My seat",
      icon: Armchair,
      href: seatLookupUrl,
    },
    onCalendar && {
      key: "cal",
      label: "Calendar",
      icon: Calendar,
      onClick: onCalendar,
    },
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    icon: typeof MapPin;
    href?: string;
    onClick?: () => void;
  }>;

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-2 inv-fade-in">
      {chips.map((chip) => {
        const Icon = chip.icon;
        const className =
          "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border border-[#0B8A83]/25 bg-white/90 text-[#0B8A83] shadow-sm hover:bg-[#0B8A83] hover:text-white transition-colors touch-manipulation";
        if (chip.href) {
          return (
            <a key={chip.key} href={chip.href} target="_blank" rel="noopener noreferrer" className={className}>
              <Icon className="h-3.5 w-3.5" /> {chip.label}
            </a>
          );
        }
        return (
          <button key={chip.key} type="button" onClick={chip.onClick} className={className}>
            <Icon className="h-3.5 w-3.5" /> {chip.label}
          </button>
        );
      })}
    </div>
  );
}
