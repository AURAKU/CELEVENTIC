export interface CalendarEventInput {
  title: string;
  startDateRaw: string;
  endDateRaw?: string;
  venue?: string;
  description?: string;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Google Calendar `dates` param (UTC). */
export function toGoogleCalendarDates(startIso: string, endIso?: string) {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : new Date(start.getTime() + 4 * 60 * 60 * 1000);
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  return `${fmt(start)}/${fmt(end)}`;
}

export function buildGoogleCalendarUrl(event: CalendarEventInput): string {
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", event.title);
  url.searchParams.set("dates", toGoogleCalendarDates(event.startDateRaw, event.endDateRaw));
  if (event.venue) url.searchParams.set("location", event.venue);
  if (event.description) url.searchParams.set("details", event.description.slice(0, 500));
  return url.toString();
}

export function buildOutlookCalendarUrl(event: CalendarEventInput): string {
  const start = new Date(event.startDateRaw);
  const end = event.endDateRaw
    ? new Date(event.endDateRaw)
    : new Date(start.getTime() + 4 * 60 * 60 * 1000);
  const url = new URL("https://outlook.live.com/calendar/0/deeplink/compose");
  url.searchParams.set("path", "/calendar/action/compose");
  url.searchParams.set("rru", "addevent");
  url.searchParams.set("subject", event.title);
  url.searchParams.set("startdt", start.toISOString());
  url.searchParams.set("enddt", end.toISOString());
  if (event.venue) url.searchParams.set("location", event.venue);
  if (event.description) url.searchParams.set("body", event.description.slice(0, 500));
  return url.toString();
}

function formatIcsUtc(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}

export function buildIcsContent(event: CalendarEventInput): string {
  const start = new Date(event.startDateRaw);
  const end = event.endDateRaw
    ? new Date(event.endDateRaw)
    : new Date(start.getTime() + 4 * 60 * 60 * 1000);
  const uid = `${Date.now()}@celeventic.com`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Celeventic//Invitation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsUtc(new Date().toISOString())}`,
    `DTSTART:${formatIcsUtc(event.startDateRaw)}`,
    `DTEND:${formatIcsUtc(end.toISOString())}`,
    `SUMMARY:${event.title.replace(/[,;\\]/g, "")}`,
  ];
  if (event.venue) lines.push(`LOCATION:${event.venue.replace(/[,;\\]/g, " ")}`);
  if (event.description) {
    lines.push(`DESCRIPTION:${event.description.replace(/\n/g, "\\n").slice(0, 500)}`);
  }
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcsFile(event: CalendarEventInput, filename = "event.ics") {
  const blob = new Blob([buildIcsContent(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Embed-friendly Google Maps URL (no API key). */
export function toMapsEmbedUrl(mapsLink?: string | null, venueLabel?: string | null): string | null {
  const query = venueLabel?.trim() || mapsLink?.trim();
  if (!query) return null;
  if (mapsLink?.includes("output=embed") || mapsLink?.includes("/maps/embed")) {
    return mapsLink;
  }
  if (mapsLink && mapsLink.includes("google.") && mapsLink.includes("/maps")) {
    const sep = mapsLink.includes("?") ? "&" : "?";
    return `${mapsLink}${sep}output=embed`;
  }
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&hl=en&z=15&output=embed`;
}
