"use client";

import { MapPin, Calendar, Phone, Share2, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ButtonStyle } from "@/lib/invitation-studio/studio-types";
import { styledInvitationButton } from "@/lib/invitation/invitation-button-styles";

interface InvitationActionsProps {
  event: {
    title: string;
    startDate: string;
    mapsLink: string | null;
    contactPhone: string | null;
  };
  pdfUrl?: string;
  variant?: "light" | "dark";
  buttonStyle?: ButtonStyle | string;
}

export function InvitationActions({ event, pdfUrl, variant = "light", buttonStyle }: InvitationActionsProps) {
  const btnClass = buttonStyle
    ? styledInvitationButton(buttonStyle, variant, "text-xs")
    : variant === "dark"
      ? "border-white/30 text-white hover:bg-white/10"
      : "";

  function addToCalendar() {
    const start = event.startDate.replace(/[^0-9TZ:-]/g, "");
    window.open(
      `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${start}/${start}`,
      "_blank"
    );
  }

  function shareInvitation() {
    if (navigator.share) navigator.share({ title: event.title, url: window.location.href });
    else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied!");
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {event.mapsLink && (
        <Button variant="outline" asChild className={btnClass}>
          <a href={event.mapsLink} target="_blank" rel="noopener noreferrer">
            <MapPin className="h-4 w-4" /> Maps
          </a>
        </Button>
      )}
      <Button variant="outline" onClick={addToCalendar} className={btnClass}>
        <Calendar className="h-4 w-4" /> Calendar
      </Button>
      {event.contactPhone && (
        <Button variant="outline" asChild className={btnClass}>
          <a href={`tel:${event.contactPhone}`}>
            <Phone className="h-4 w-4" /> Contact
          </a>
        </Button>
      )}
      {pdfUrl && (
        <Button variant="outline" asChild className={btnClass}>
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download>
            <FileDown className="h-4 w-4" /> Download PDF
          </a>
        </Button>
      )}
      <Button variant="outline" onClick={shareInvitation} className={btnClass}>
        <Share2 className="h-4 w-4" /> Share
      </Button>
    </div>
  );
}
