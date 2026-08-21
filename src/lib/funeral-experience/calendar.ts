/** Calendar helpers for funeral programme items — ICS + Google Calendar */

export type CalendarEventInput = {
  title: string;
  description?: string | null;
  location?: string | null;
  /** ISO date or datetime; if date-only, treated as all-day */
  start: string | Date;
  end?: string | Date | null;
  durationMinutes?: number;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIcsUtc(d: Date) {
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function escapeIcs(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function buildIcsCalendar(events: CalendarEventInput[], calName = "Funeral Programme"): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Celeventic//Funeral Experience//EN",
    `X-WR-CALNAME:${escapeIcs(calName)}`,
  ];

  for (const ev of events) {
    const start = new Date(ev.start);
    if (Number.isNaN(start.getTime())) continue;
    const end = ev.end
      ? new Date(ev.end)
      : new Date(start.getTime() + (ev.durationMinutes ?? 90) * 60_000);
    const uid = `funeral-${start.getTime()}-${Math.abs(hash(ev.title))}@celeventic`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${toIcsUtc(new Date())}`,
      `DTSTART:${toIcsUtc(start)}`,
      `DTEND:${toIcsUtc(end)}`,
      `SUMMARY:${escapeIcs(ev.title)}`
    );
    if (ev.description) lines.push(`DESCRIPTION:${escapeIcs(ev.description)}`);
    if (ev.location) lines.push(`LOCATION:${escapeIcs(ev.location)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

export function googleCalendarUrl(ev: CalendarEventInput): string {
  const start = new Date(ev.start);
  const end = ev.end
    ? new Date(ev.end)
    : new Date(start.getTime() + (ev.durationMinutes ?? 90) * 60_000);
  const fmt = (d: Date) =>
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${fmt(start)}/${fmt(end)}`,
  });
  if (ev.description) params.set("details", ev.description);
  if (ev.location) params.set("location", ev.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadIcsFile(filename: string, ics: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Heuristic: attach event.startDate + programme startTime ("9:00 AM") */
export function combineEventDateAndTime(eventStart: string | Date, timeLabel?: string | null): Date {
  const base = new Date(eventStart);
  if (Number.isNaN(base.getTime())) return new Date();
  if (!timeLabel?.trim()) return base;
  const m = timeLabel.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return base;
  let hours = parseInt(m[1]!, 10);
  const minutes = parseInt(m[2]!, 10);
  const ap = m[3]?.toUpperCase();
  if (ap === "PM" && hours < 12) hours += 12;
  if (ap === "AM" && hours === 12) hours = 0;
  const out = new Date(base);
  out.setHours(hours, minutes, 0, 0);
  return out;
}
