import { extractMapsQuery, normalizeExternalHref } from "@/lib/invitation/maps-utils";

export interface CalendarEventInput {
  title: string;
  startDateRaw: string;
  endDateRaw?: string;
  venue?: string;
  description?: string;
  /** IANA zone so Google/Apple show the house's wall-clock hours (e.g. Africa/Nairobi). */
  timeZone?: string;
  /**
   * Reminder offsets in minutes before start (e.g. `[1440, 60]` = 1 day + 1 hour).
   * Applied in .ics VALARM blocks for Apple / Outlook / most calendar apps.
   */
  reminderMinutesBefore?: number[];
  /** Date-only save-the-date when the clock time is still to be announced. */
  allDay?: boolean;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Escape text for ICS property values. */
function icsEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** Fold long ICS lines at 75 octets (approx chars) per RFC 5545. */
function icsFold(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let remaining = line;
  chunks.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  while (remaining.length > 0) {
    chunks.push(` ${remaining.slice(0, 74)}`);
    remaining = remaining.slice(74);
  }
  return chunks.join("\r\n");
}

function utcYmdCompact(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function utcYmdDashed(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Google Calendar `dates` param (UTC). Empty when the window cannot be parsed. */
export function toGoogleCalendarDates(
  startIso: string,
  endIso?: string,
  options?: { allDay?: boolean }
): string {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return "";
  const fallbackMs = options?.allDay ? 24 * 60 * 60 * 1000 : 4 * 60 * 60 * 1000;
  const end = endIso ? new Date(endIso) : new Date(start.getTime() + fallbackMs);
  if (Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) return "";
  if (options?.allDay) {
    return `${utcYmdCompact(start)}/${utcYmdCompact(end)}`;
  }
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  return `${fmt(start)}/${fmt(end)}`;
}

/** Calendar LOCATION — venue name plus the street line shown on the invitation. */
export function calendarEventLocation(
  venueName?: string | null,
  address?: string | null
): string {
  return [venueName?.trim(), address?.trim()].filter(Boolean).join(", ");
}

export function hasValidCalendarWindow(event: CalendarEventInput): boolean {
  const start = Date.parse(event.startDateRaw);
  if (!Number.isFinite(start)) return false;
  if (!event.endDateRaw) return true;
  const end = Date.parse(event.endDateRaw);
  return Number.isFinite(end) && end > start;
}

export function resolveEventWindow(event: CalendarEventInput): { start: Date; end: Date } {
  const start = new Date(event.startDateRaw);
  const fallbackMs = event.allDay ? 24 * 60 * 60 * 1000 : 4 * 60 * 60 * 1000;
  const end = event.endDateRaw
    ? new Date(event.endDateRaw)
    : new Date(start.getTime() + fallbackMs);
  return { start, end };
}

export function defaultReminderMinutes(event: CalendarEventInput): number[] {
  if (event.reminderMinutesBefore?.length) {
    return event.reminderMinutesBefore.filter((m) => Number.isFinite(m) && m > 0);
  }
  if (event.allDay) return [24 * 60];
  // Day before + morning-of so guests do not miss the service.
  return [24 * 60, 60];
}

function reminderDescription(minutes: number[]): string {
  const parts = minutes.map((m) => {
    if (m >= 1440 && m % 1440 === 0) {
      const days = m / 1440;
      return days === 1 ? "1 day before" : `${days} days before`;
    }
    if (m >= 60 && m % 60 === 0) {
      const hours = m / 60;
      return hours === 1 ? "1 hour before" : `${hours} hours before`;
    }
    return `${m} minutes before`;
  });
  return `Reminders: ${parts.join(" · ")}.`;
}

export function buildGoogleCalendarUrl(event: CalendarEventInput): string {
  const dates = toGoogleCalendarDates(event.startDateRaw, event.endDateRaw, {
    allDay: event.allDay,
  });
  if (!dates || !hasValidCalendarWindow(event)) return "";
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", event.title);
  url.searchParams.set("dates", dates);
  if (event.venue) url.searchParams.set("location", event.venue);
  const tz = event.timeZone?.trim();
  if (tz) url.searchParams.set("ctz", tz);
  const reminders = defaultReminderMinutes(event);
  const details = [event.description?.trim(), reminderDescription(reminders)]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 500);
  if (details) url.searchParams.set("details", details);
  return url.toString();
}

export function buildOutlookCalendarUrl(event: CalendarEventInput): string {
  if (!hasValidCalendarWindow(event)) return "";
  const { start, end } = resolveEventWindow(event);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  const url = new URL("https://outlook.live.com/calendar/0/deeplink/compose");
  url.searchParams.set("path", "/calendar/action/compose");
  url.searchParams.set("rru", "addevent");
  url.searchParams.set("subject", event.title);
  if (event.allDay) {
    url.searchParams.set("startdt", utcYmdDashed(start));
    url.searchParams.set("enddt", utcYmdDashed(end));
    url.searchParams.set("allday", "true");
  } else {
    url.searchParams.set("startdt", start.toISOString());
    url.searchParams.set("enddt", end.toISOString());
  }
  if (event.venue) url.searchParams.set("location", event.venue);
  const reminders = defaultReminderMinutes(event);
  const body = [event.description?.trim(), reminderDescription(reminders)]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 500);
  if (body) url.searchParams.set("body", body);
  return url.toString();
}

function formatIcsUtc(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}

function buildValarmBlocks(minutesBefore: number[]): string[] {
  const lines: string[] = [];
  for (const minutes of minutesBefore) {
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsEscape("Event reminder")}`,
      `TRIGGER:-PT${Math.round(minutes)}M`,
      "END:VALARM"
    );
  }
  return lines;
}

function veventLines(event: CalendarEventInput, stamp: string, index: number): string[] {
  const { start, end } = resolveEventWindow(event);
  const uid = `${stamp}-${index}-${Math.random().toString(36).slice(2, 10)}@celeventic.com`;
  const reminders = defaultReminderMinutes(event);
  const descriptionParts = [event.description?.trim(), reminderDescription(reminders)].filter(
    Boolean
  );
  const lines = [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    event.allDay
      ? `DTSTART;VALUE=DATE:${utcYmdCompact(start)}`
      : `DTSTART:${formatIcsUtc(start.toISOString())}`,
    event.allDay
      ? `DTEND;VALUE=DATE:${utcYmdCompact(end)}`
      : `DTEND:${formatIcsUtc(end.toISOString())}`,
    `SUMMARY:${icsEscape(event.title)}`,
  ];
  if (event.venue) lines.push(`LOCATION:${icsEscape(event.venue)}`);
  if (descriptionParts.length) {
    lines.push(`DESCRIPTION:${icsEscape(descriptionParts.join("\n\n").slice(0, 800))}`);
  }
  lines.push(...buildValarmBlocks(reminders));
  lines.push("END:VEVENT");
  return lines;
}

function wrapCalendar(eventLines: string[]): string {
  const rawLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Celeventic//Invitation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...eventLines,
    "END:VCALENDAR",
  ];
  return rawLines.map(icsFold).join("\r\n");
}

export function buildIcsContent(event: CalendarEventInput): string {
  if (!hasValidCalendarWindow(event)) return "";
  const stamp = formatIcsUtc(new Date().toISOString());
  return wrapCalendar(veventLines(event, stamp, 0));
}

/** One calendar file with a separate entry for each celebration. */
export function buildIcsCalendar(events: CalendarEventInput[]): string {
  const ready = events.filter(hasValidCalendarWindow);
  if (!ready.length) return "";
  const stamp = formatIcsUtc(new Date().toISOString());
  return wrapCalendar(ready.flatMap((event, index) => veventLines(event, stamp, index)));
}

export function buildIcsBlob(event: CalendarEventInput): Blob {
  return new Blob([buildIcsContent(event)], { type: "text/calendar;charset=utf-8" });
}

function downloadIcsText(ics: string, filename: string) {
  if (!ics) return;
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Delay revoke so Safari can finish handing off to Calendar.
  window.setTimeout(() => URL.revokeObjectURL(url), 2500);
}

export function downloadIcsFile(event: CalendarEventInput, filename = "event.ics") {
  downloadIcsText(buildIcsContent(event), filename);
}

export function downloadIcsCalendar(events: CalendarEventInput[], filename = "celebration.ics") {
  downloadIcsText(buildIcsCalendar(events), filename);
}

/**
 * Prefer the OS share sheet (any calendar app) when the browser supports file shares.
 * Falls back to a classic .ics download.
 */
export async function shareOrDownloadIcs(
  event: CalendarEventInput,
  filename = "event.ics"
): Promise<"shared" | "downloaded"> {
  const blob = buildIcsBlob(event);
  const file = new File([blob], filename, { type: "text/calendar" });

  const nav = typeof navigator !== "undefined" ? navigator : null;
  if (nav && typeof nav.canShare === "function" && nav.canShare({ files: [file] })) {
    try {
      await nav.share({
        files: [file],
        title: event.title,
        text: `Save “${event.title}” to your calendar`,
      });
      return "shared";
    } catch (err) {
      // User cancelled share — don't force a download.
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
    }
  }

  downloadIcsFile(event, filename);
  return "downloaded";
}

/** Embed-friendly Google Maps URL (no API key). Pins coordinates when the link has them. */
export function toMapsEmbedUrl(
  mapsLink?: string | null,
  venueLabel?: string | null,
  zoom = 16
): string | null {
  const link = normalizeExternalHref(mapsLink);
  if (link.includes("output=embed") || link.includes("/maps/embed")) {
    return link;
  }
  const query = extractMapsQuery(link, venueLabel?.trim() || "");
  const level = Math.min(20, Math.max(12, Math.round(zoom)));
  if (query) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&hl=en&z=${level}&output=embed`;
  }
  if (link && /google\./i.test(link) && link.includes("/maps")) {
    const sep = link.includes("?") ? "&" : "?";
    return `${link}${sep}output=embed`;
  }
  return null;
}
