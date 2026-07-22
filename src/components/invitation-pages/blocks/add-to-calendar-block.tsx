"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { setSmartCalendarReminder } from "@/lib/invitation/smart-calendar";
import { trackInviteEvent } from "@/lib/analytics/invite-events";
import type { PageRenderContext } from "@/lib/invite-blueprints/blueprint-types";

/** One-tap Apple / Google / Outlook reminder (auto-detected platform). */
export function AddToCalendarBlock({ context }: { context: PageRenderContext }) {
  const [message, setMessage] = useState<string | null>(null);
  const { event, invitation, guestId } = context;

  if (!event.startDateRaw) return null;

  async function handleClick() {
    trackInviteEvent({
      eventType: "INVITE_ACTION_CLICK",
      invitationId: invitation.id,
      guestId,
      metadata: { action: "add_to_calendar" },
    });
    const result = await setSmartCalendarReminder({
      title: event.title,
      startDateRaw: event.startDateRaw!,
      venue: event.venueName ?? undefined,
      description: event.description ?? undefined,
    });
    setMessage(result.message);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button type="button" className="inv-btn inv-btn-secondary" onClick={handleClick}>
        <CalendarPlus size={17} aria-hidden />
        Add to calendar
      </button>
      {message && <p className="inv-body inv-muted text-sm">{message}</p>}
    </div>
  );
}
