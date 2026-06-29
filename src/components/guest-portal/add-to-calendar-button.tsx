"use client";

import { CalendarActionsMenu } from "@/components/guest-portal/calendar-actions-menu";
import type { CalendarEventInput } from "@/lib/invitation/calendar-utils";

/** @deprecated Use CalendarActionsMenu — kept for backward compatibility */
export function AddToCalendarButton({
  title,
  startDateRaw,
  venue,
  description,
}: {
  title: string;
  startDateRaw: string;
  venue?: string;
  description?: string;
}) {
  const event: CalendarEventInput = { title, startDateRaw, venue, description };
  return <CalendarActionsMenu event={event} />;
}
