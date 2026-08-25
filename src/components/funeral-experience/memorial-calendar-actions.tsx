"use client";

import { CalendarPlus } from "lucide-react";
import {
  buildIcsCalendar,
  combineEventDateAndTime,
  downloadIcsFile,
  googleCalendarUrl,
  type CalendarEventInput,
} from "@/lib/funeral-experience/calendar";
import styles from "./funeral-experience.module.css";

export function MemorialCalendarActions({
  deceasedName,
  eventStart,
  items,
}: {
  deceasedName: string;
  eventStart: string;
  items: { title: string; description?: string | null; startTime?: string | null; venue?: string | null }[];
}) {
  if (!items.length) return null;

  const events: CalendarEventInput[] = items.map((item) => ({
    title: `${item.title} — ${deceasedName}`,
    description: item.description,
    location: item.venue,
    start: combineEventDateAndTime(eventStart, item.startTime),
  }));

  const first = events[0]!;

  return (
    <div className="flex flex-wrap gap-2 px-4 max-w-lg mx-auto w-full">
      <a
        className={styles.btnGhost}
        href={googleCalendarUrl(first)}
        target="_blank"
        rel="noopener noreferrer"
      >
        <CalendarPlus className="h-4 w-4" aria-hidden />
        Google Calendar
      </a>
      <button
        type="button"
        className={styles.btnGhost}
        onClick={() =>
          downloadIcsFile(
            `funeral-${deceasedName.replace(/\s+/g, "-").toLowerCase()}`,
            buildIcsCalendar(events, `Funeral — ${deceasedName}`)
          )
        }
      >
        <CalendarPlus className="h-4 w-4" aria-hidden />
        Apple / Outlook (.ics)
      </button>
    </div>
  );
}
