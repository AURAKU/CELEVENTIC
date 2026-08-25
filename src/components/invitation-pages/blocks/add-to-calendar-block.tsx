"use client";

import { useMemo, useState } from "react";
import { CalendarPlus, Check, Loader2 } from "lucide-react";
import { setSmartCalendarReminder } from "@/lib/invitation/smart-calendar";
import { trackInviteEvent } from "@/lib/analytics/invite-events";
import { resolveDeceasedName } from "@/lib/invite-blueprints/funeral-invitation-copy";
import type { PageRenderContext } from "@/lib/invite-blueprints/blueprint-types";
import type { CalendarEventInput } from "@/lib/invitation/calendar-utils";

function buildCalendarEvent(context: PageRenderContext): CalendarEventInput | null {
  const { event, category } = context;
  if (!event.startDateRaw) return null;

  const isFuneral = category === "funeral";
  const deceased = isFuneral ? resolveDeceasedName(event) : null;
  const title = isFuneral
    ? `Funeral service — ${deceased || event.title}`
    : event.title;

  const descriptionParts = [
    isFuneral
      ? `Memorial service for ${deceased || event.title}. Please arrive with time for the programme.`
      : event.description?.trim() || undefined,
    event.venueName ? `Venue: ${event.venueName}` : null,
    event.landmark ? `Landmark: ${event.landmark}` : null,
  ].filter(Boolean) as string[];

  // Remind the day before, 2h before, and 30m before for funerals.
  const start = new Date(event.startDateRaw);
  const end = Number.isNaN(start.getTime())
    ? undefined
    : new Date(start.getTime() + (isFuneral ? 6 : 4) * 60 * 60 * 1000).toISOString();

  return {
    title,
    startDateRaw: event.startDateRaw,
    endDateRaw: end,
    venue: event.venueName ?? undefined,
    description: descriptionParts.join("\n"),
    reminderMinutesBefore: isFuneral ? [24 * 60, 2 * 60, 30] : [24 * 60, 60],
  };
}

/** One-tap Apple / Google / Outlook reminder (auto-detected platform). */
export function AddToCalendarBlock({ context }: { context: PageRenderContext }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const { invitation, guestId, category } = context;

  const calendarEvent = useMemo(() => buildCalendarEvent(context), [context]);

  if (!calendarEvent) return null;

  async function handleClick() {
    if (status === "loading") return;
    setStatus("loading");

    trackInviteEvent({
      eventType: "INVITE_ACTION_CLICK",
      invitationId: invitation.id,
      guestId,
      metadata: { action: "add_to_calendar" },
    });

    const result = await setSmartCalendarReminder(calendarEvent);
    setStatus(result.success ? "done" : "error");
    if (result.success) {
      window.setTimeout(() => setStatus("idle"), 4200);
    } else {
      window.setTimeout(() => setStatus("idle"), 2500);
    }
  }

  const label = category === "funeral" ? "Save service date" : "Add to calendar";

  return (
    <div className="flex flex-col items-center w-full">
      <button
        type="button"
        className="inv-btn inv-btn-secondary"
        onClick={() => void handleClick()}
        disabled={status === "loading"}
        aria-busy={status === "loading"}
      >
        {status === "loading" ? (
          <Loader2 size={17} className="animate-spin" aria-hidden />
        ) : status === "done" ? (
          <Check size={17} aria-hidden />
        ) : (
          <CalendarPlus size={17} aria-hidden />
        )}
        {status === "loading"
          ? "Saving reminder…"
          : status === "done"
            ? "Reminder saved"
            : status === "error"
              ? "Try again"
              : label}
      </button>
    </div>
  );
}
