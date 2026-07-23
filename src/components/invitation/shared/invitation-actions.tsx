"use client";

import { MapPin, Phone, Share2, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ButtonStyle } from "@/lib/invitation-studio/studio-types";
import { styledInvitationButton } from "@/lib/invitation/invitation-button-styles";
import { buildDirectionsUrl } from "@/lib/invitation/maps-utils";
import { SetReminderButton } from "@/components/guest-portal/set-reminder-button";
import type { CalendarEventInput } from "@/lib/invitation/calendar-utils";
import { useInvitationStaticPreview } from "@/components/invitation/invitation-static-preview";

interface InvitationActionsProps {
  event: {
    title: string;
    startDate: string;
    startDateRaw?: string;
    mapsLink: string | null;
    contactPhone: string | null;
    venueName?: string | null;
    landmark?: string | null;
  };
  pdfUrl?: string;
  variant?: "light" | "dark";
  buttonStyle?: ButtonStyle | string;
  onShare?: () => void | Promise<void>;
  /** Hide tel Contact when contact lives in a merged RSVP section */
  omitContact?: boolean;
}

export function InvitationActions({
  event,
  pdfUrl,
  variant = "light",
  buttonStyle,
  onShare,
  omitContact = false,
}: InvitationActionsProps) {
  const staticPreview = useInvitationStaticPreview();
  const btnClass = buttonStyle
    ? styledInvitationButton(buttonStyle, variant, "text-xs")
    : variant === "dark"
      ? "border-white/30 text-white hover:bg-white/10"
      : "";

  const calendarEvent: CalendarEventInput = {
    title: event.title,
    startDateRaw: event.startDateRaw ?? event.startDate,
    venue: [event.venueName, event.landmark].filter(Boolean).join(" · ") || undefined,
  };

  const directionsUrl = buildDirectionsUrl({
    mapsLink: event.mapsLink,
    venueName: event.venueName,
    landmark: event.landmark,
  });

  async function shareInvitation() {
    if (onShare) {
      await onShare();
      return;
    }
    if (navigator.share) {
      await navigator.share({ title: event.title, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(window.location.href);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {directionsUrl && !staticPreview ? (
        <Button variant="outline" asChild className={btnClass}>
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
            <MapPin className="h-4 w-4" /> Maps
          </a>
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={!directionsUrl || staticPreview}
          className={btnClass}
          title={staticPreview ? "Preview" : "Location not added yet"}
        >
          <MapPin className="h-4 w-4" /> Maps
        </Button>
      )}
      <div className="col-span-2">
        {staticPreview ? (
          <Button type="button" variant="outline" disabled className={`w-full ${btnClass}`}>
            Set a Reminder
          </Button>
        ) : (
          <SetReminderButton event={calendarEvent} variant="minimal" fullWidth />
        )}
      </div>
      {!omitContact &&
        event.contactPhone &&
        (staticPreview ? (
          <Button type="button" variant="outline" disabled className={btnClass}>
            <Phone className="h-4 w-4" /> Contact
          </Button>
        ) : (
          <Button variant="outline" asChild className={btnClass}>
            <a href={`tel:${event.contactPhone}`}>
              <Phone className="h-4 w-4" /> Contact
            </a>
          </Button>
        ))}
      {pdfUrl &&
        (staticPreview ? (
          <Button type="button" variant="outline" disabled className={btnClass}>
            <FileDown className="h-4 w-4" /> Download PDF
          </Button>
        ) : (
          <Button variant="outline" asChild className={btnClass}>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download>
              <FileDown className="h-4 w-4" /> Download PDF
            </a>
          </Button>
        ))}
      <Button
        type="button"
        variant="outline"
        disabled={staticPreview}
        onClick={() => void shareInvitation()}
        className={btnClass}
      >
        <Share2 className="h-4 w-4" /> Share
      </Button>
    </div>
  );
}
