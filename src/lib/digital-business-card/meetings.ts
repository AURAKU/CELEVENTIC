export const MEETING_DURATIONS = [15, 30, 45, 60] as const;
export const MEETING_PLACES = ["Video", "Call", "In person", "WhatsApp"] as const;
export const MEETING_WEEKDAYS = [
  { id: 0, label: "Sun" },
  { id: 1, label: "Mon" },
  { id: 2, label: "Tue" },
  { id: 3, label: "Wed" },
  { id: 4, label: "Thu" },
  { id: 5, label: "Fri" },
  { id: 6, label: "Sat" },
] as const;

export const MEETING_TIMEZONES = [
  "Africa/Accra",
  "Africa/Lagos",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Toronto",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Australia/Sydney",
  "UTC",
] as const;

export type CeleCardMeetingDesk = {
  enabled: boolean;
  title: string;
  durationMin: (typeof MEETING_DURATIONS)[number];
  timezone: string;
  weekdays: number[];
  startHour: number;
  endHour: number;
  bufferMin: number;
  noticeHours: number;
  horizonDays: number;
  place: (typeof MEETING_PLACES)[number] | string;
  note: string;
};

export type CeleCardMeetingSlot = {
  start: string;
  end: string;
  dayKey: string;
  weekday: string;
  dayLabel: string;
  timeLabel: string;
};

export type CeleCardMeetingBooking = {
  start: string;
  end: string;
  timezone: string;
  title: string;
  place: string;
  note: string;
};

const PREFIX = "meetv1:";
const TITLE_MAX = 80;
const NOTE_MAX = 160;
const TZ_MAX = 60;

export function defaultMeetingDesk(partial?: Partial<CeleCardMeetingDesk>): CeleCardMeetingDesk {
  return compactMeetingDesk({
    enabled: false,
    title: "Book a meeting",
    durationMin: 30,
    timezone: guessMeetingTimezone(),
    weekdays: [1, 2, 3, 4, 5],
    startHour: 9,
    endHour: 17,
    bufferMin: 15,
    noticeHours: 2,
    horizonDays: 14,
    place: "Video",
    note: "",
    ...partial,
  })!;
}

export function guessMeetingTimezone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone && zone.length <= TZ_MAX) return zone;
  } catch {
    /* keep Accra */
  }
  return "Africa/Accra";
}

function clampHour(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(23, Math.max(0, Math.round(n)));
}

export function compactMeetingDesk(raw: unknown): CeleCardMeetingDesk | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const record = raw as Record<string, unknown>;
  const enabled = Boolean(record.enabled);
  const title = String(record.title ?? "Book a meeting")
    .trim()
    .slice(0, TITLE_MAX) || "Book a meeting";
  const durationRaw = Number(record.durationMin);
  const durationMin = (MEETING_DURATIONS as readonly number[]).includes(durationRaw)
    ? (durationRaw as CeleCardMeetingDesk["durationMin"])
    : 30;
  const timezone = String(record.timezone ?? "")
    .trim()
    .slice(0, TZ_MAX) || "Africa/Accra";
  const weekdays = Array.isArray(record.weekdays)
    ? [...new Set(record.weekdays.map((day) => Number(day)).filter((day) => day >= 0 && day <= 6))]
        .sort((a, b) => a - b)
    : [1, 2, 3, 4, 5];
  const startHour = clampHour(record.startHour, 9);
  let endHour = clampHour(record.endHour, 17);
  if (endHour <= startHour) endHour = Math.min(23, startHour + 1);
  const bufferMin = [0, 5, 10, 15, 30].includes(Number(record.bufferMin))
    ? Number(record.bufferMin)
    : 15;
  const noticeHours = Math.min(72, Math.max(0, Number(record.noticeHours) || 0));
  const horizonDays = Math.min(28, Math.max(3, Number(record.horizonDays) || 14));
  const placeRaw = String(record.place ?? "Video").trim().slice(0, 40);
  const place = placeRaw || "Video";
  const note = String(record.note ?? "").trim().slice(0, NOTE_MAX);
  return {
    enabled,
    title,
    durationMin,
    timezone,
    weekdays: weekdays.length ? weekdays : [1, 2, 3, 4, 5],
    startHour,
    endHour,
    bufferMin,
    noticeHours,
    horizonDays,
    place,
    note,
  };
}

export function persistMeetingDesk(raw: unknown): CeleCardMeetingDesk | undefined {
  const desk = compactMeetingDesk(raw);
  if (!desk?.enabled) return undefined;
  return desk;
}

function tzOffsetMs(date: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) === 24 ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - date.getTime();
}

export function zonedWallTime(timeZone: string, year: number, month: number, day: number, hour: number, minute: number): Date {
  const utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const first = new Date(utc - tzOffsetMs(new Date(utc), timeZone));
  return new Date(utc - tzOffsetMs(first, timeZone));
}

function zonedParts(date: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday ?? "");
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: weekday >= 0 ? weekday : 0,
    weekdayLabel: parts.weekday ?? "",
  };
}

export function formatMeetingWhen(iso: string, timeZone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function formatMeetingClock(iso: string, timeZone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function formatMeetingDay(iso: string, timeZone: string): { key: string; weekday: string; label: string } {
  const parts = zonedParts(new Date(iso), timeZone);
  const month = new Intl.DateTimeFormat("en-GB", { timeZone, month: "short" }).format(new Date(iso));
  return {
    key: `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`,
    weekday: parts.weekdayLabel,
    label: `${parts.day} ${month}`,
  };
}

export function groupMeetingDays(slots: CeleCardMeetingSlot[]) {
  const days: Array<{ key: string; weekday: string; label: string; slots: CeleCardMeetingSlot[] }> = [];
  for (const slot of slots) {
    const current = days[days.length - 1];
    if (!current || current.key !== slot.dayKey) {
      days.push({ key: slot.dayKey, weekday: slot.weekday, label: slot.dayLabel, slots: [slot] });
    } else {
      current.slots.push(slot);
    }
  }
  return days;
}

export function listOpenMeetingSlots(
  desk: CeleCardMeetingDesk,
  takenStarts: string[] = [],
  now: Date = new Date()
): CeleCardMeetingSlot[] {
  if (!desk.enabled || !desk.weekdays.length) return [];
  const taken = new Set(takenStarts.map((value) => new Date(value).getTime()).filter((value) => Number.isFinite(value)));
  const lengthMs = desk.durationMin * 60_000;
  const earliest = new Date(now.getTime() + desk.noticeHours * 3_600_000);
  const slots: CeleCardMeetingSlot[] = [];
  const startParts = zonedParts(now, desk.timezone);

  for (let offset = 0; offset <= desk.horizonDays; offset += 1) {
    const probe = zonedWallTime(
      desk.timezone,
      startParts.year,
      startParts.month,
      startParts.day + offset,
      12,
      0
    );
    const day = zonedParts(probe, desk.timezone);
    if (!desk.weekdays.includes(day.weekday)) continue;
    for (let minute = desk.startHour * 60; minute + desk.durationMin <= desk.endHour * 60; minute += desk.durationMin + desk.bufferMin) {
      const hour = Math.floor(minute / 60);
      const min = minute % 60;
      const start = zonedWallTime(desk.timezone, day.year, day.month, day.day, hour, min);
      if (start.getTime() < earliest.getTime()) continue;
      if (taken.has(start.getTime())) continue;
      const end = new Date(start.getTime() + lengthMs);
      const dayMeta = formatMeetingDay(start.toISOString(), desk.timezone);
      slots.push({
        start: start.toISOString(),
        end: end.toISOString(),
        dayKey: dayMeta.key,
        weekday: dayMeta.weekday,
        dayLabel: dayMeta.label,
        timeLabel: formatMeetingClock(start.toISOString(), desk.timezone),
      });
    }
  }
  return slots;
}

export function serializeMeetingBooking(booking: CeleCardMeetingBooking): string {
  return `${PREFIX}${JSON.stringify({
    start: booking.start,
    end: booking.end,
    timezone: booking.timezone.slice(0, TZ_MAX),
    title: booking.title.slice(0, TITLE_MAX),
    place: booking.place.slice(0, 40),
    note: booking.note.slice(0, 280),
  })}`;
}

export function parseMeetingBooking(raw: string | null | undefined): CeleCardMeetingBooking | null {
  const value = String(raw ?? "").trim();
  if (!value.startsWith(PREFIX)) return null;
  try {
    const parsed = JSON.parse(value.slice(PREFIX.length)) as Record<string, unknown>;
    const start = String(parsed.start ?? "");
    const end = String(parsed.end ?? "");
    if (!start || Number.isNaN(new Date(start).getTime())) return null;
    return {
      start,
      end,
      timezone: String(parsed.timezone ?? "UTC"),
      title: String(parsed.title ?? "Meeting"),
      place: String(parsed.place ?? ""),
      note: String(parsed.note ?? ""),
    };
  } catch {
    return null;
  }
}

export function meetingDurationCopy(minutes: number): string {
  return minutes === 60 ? "1 hour" : `${minutes} min`;
}

export function meetingSubtitle(desk: CeleCardMeetingDesk): string {
  return [meetingDurationCopy(desk.durationMin), desk.place].filter(Boolean).join(" · ");
}

export function meetingIcs(booking: CeleCardMeetingBooking, ownerName: string, guestName: string): string {
  const stamp = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const summary = `${booking.title} with ${ownerName}`.replace(/\r?\n/g, " ");
  const description = [booking.place, booking.note].filter(Boolean).join(" · ").replace(/\r?\n/g, " ");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CeleYou//Meeting//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(booking.start)}`,
    `DTEND:${stamp(booking.end)}`,
    `SUMMARY:${summary}`,
    description ? `DESCRIPTION:${description}` : "",
    `ORGANIZER;CN=${ownerName}:MAILTO:noreply@celeventic.com`,
    `ATTENDEE;CN=${guestName}:MAILTO:guest@celeventic.com`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export function downloadMeetingIcs(filename: string, ics: string) {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 800);
}

export function firstGivenName(value: string | null | undefined, fallback = "there"): string {
  const first = String(value ?? "")
    .trim()
    .split(/\s+/)[0];
  return first || fallback;
}

export function meetingReplyCopy(input: {
  kind: "confirm" | "decline";
  ownerName: string;
  guestName: string;
  booking: CeleCardMeetingBooking;
}): { subject: string; body: string } {
  const owner = firstGivenName(input.ownerName, "They");
  const guest = firstGivenName(input.guestName);
  const when = formatMeetingWhen(input.booking.start, input.booking.timezone);
  const place = input.booking.place ? ` ${input.booking.place}.` : ".";
  if (input.kind === "confirm") {
    return {
      subject: `${owner} confirmed your time`,
      body: `Hello ${guest}, ${owner} confirmed ${input.booking.title} on ${when}.${place} See you then.`,
    };
  }
  return {
    subject: `${owner} asked you to pick another time`,
    body: `Hello ${guest}, ${owner} cannot make ${when}. Open the card and pick another time.`,
  };
}

export function whatsappComposeHref(phone: string | null | undefined, text: string): string | null {
  const digits = String(phone ?? "").replace(/[^\d]/g, "");
  if (digits.length < 7) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
