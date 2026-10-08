/**
 * Programme lines that already name a weekday, day, and clock
 * ("THU 24 DEC · 9:00 AM") become one celebration each.
 * Lines that are only a clock, or a label such as "RECEPTION", stay out.
 */

export interface CelebrationProgrammeLine {
  id: string;
  time: string;
  title: string;
  description?: string;
  mapUrl?: string;
}

function placeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** True when two venue lines name the same place, ignoring case and punctuation. */
export function placesMatch(a: string, b: string): boolean {
  const left = placeKey(a);
  const right = placeKey(b);
  if (!left || !right) return false;
  return left.includes(right) || right.includes(left);
}

/**
 * Map URL for one celebration. A stop's own link wins. Otherwise the invitation
 * venue link is used only when this stop is that venue.
 */
export function programmeMapUrl(
  item: { mapUrl?: string } | undefined,
  place: string,
  venueName: string,
  venueMapUrl: string
): string {
  const own = item?.mapUrl?.trim() ?? "";
  if (own) return own;
  const shared = venueMapUrl.trim();
  if (shared && placesMatch(place, venueName)) return shared;
  return "";
}

export interface CelebrationMoment {
  id: string;
  weekday: string;
  day: number;
  month: string;
  year: number;
  timeLabel: string;
  title: string;
  place: string;
  startIso: string;
  endIso: string;
}

export interface CelebrationDay {
  key: string;
  weekday: string;
  day: number;
  month: string;
  year: number;
  moments: CelebrationMoment[];
}

const WEEKDAY: Record<string, string> = {
  SUN: "Sunday",
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
};

const MONTH: Record<string, { index: number; name: string }> = {
  JAN: { index: 1, name: "January" },
  FEB: { index: 2, name: "February" },
  MAR: { index: 3, name: "March" },
  APR: { index: 4, name: "April" },
  MAY: { index: 5, name: "May" },
  JUN: { index: 6, name: "June" },
  JUL: { index: 7, name: "July" },
  AUG: { index: 8, name: "August" },
  SEP: { index: 9, name: "September" },
  OCT: { index: 10, name: "October" },
  NOV: { index: 11, name: "November" },
  DEC: { index: 12, name: "December" },
};

const STAMP =
  /^(SUN|MON|TUE|WED|THU|FRI|SAT)\s+(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*[·•]\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*$/i;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function to24(hour: number, ampm: string): number {
  const base = hour % 12;
  return /pm/i.test(ampm) ? base + 12 : base;
}

function referenceOffset(referenceIso: string): string {
  const match = referenceIso.trim().match(/(Z|[+-]\d{2}:\d{2})$/);
  return match?.[1] ?? "Z";
}

function wallClockIso(
  year: number,
  month: number,
  day: number,
  hour24: number,
  minute: number,
  offset: string
): string {
  const zone = offset === "Z" ? "Z" : offset;
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour24)}:${pad(minute)}:00.000${zone}`;
}

export function celebrationMomentsFromProgramme(
  items: CelebrationProgrammeLine[],
  year: number,
  referenceIso = ""
): CelebrationMoment[] {
  if (!Number.isFinite(year) || year < 2000 || year > 2100) return [];
  const offset = referenceOffset(referenceIso);
  const parsed: Omit<CelebrationMoment, "endIso">[] = [];

  for (const item of items) {
    const match = item.time.trim().match(STAMP);
    if (!match) continue;
    const weekdayKey = match[1].toUpperCase();
    const monthKey = match[3].toUpperCase();
    const month = MONTH[monthKey];
    const day = Number(match[2]);
    if (!month || day < 1 || day > 31) continue;
    const minute = Number(match[5]);
    const hour24 = to24(Number(match[4]), match[6]);
    parsed.push({
      id: item.id,
      weekday: WEEKDAY[weekdayKey] ?? weekdayKey,
      day,
      month: month.name,
      year,
      timeLabel: `${Number(match[4])}:${pad(minute)} ${match[6].toUpperCase()}`,
      title: item.title.trim(),
      place: (item.description ?? "").split("\n")[0]?.trim() ?? "",
      startIso: wallClockIso(year, month.index, day, hour24, minute, offset),
    });
  }

  return parsed.map((moment, index) => {
    const next = parsed[index + 1];
    const sameDay =
      next && next.year === moment.year && next.month === moment.month && next.day === moment.day;
    const startMs = Date.parse(moment.startIso);
    const nextMs = next ? Date.parse(next.startIso) : Number.NaN;
    const hours = /reception/i.test(moment.title) ? 5 : 3;
    const endMs =
      sameDay && Number.isFinite(nextMs) && nextMs > startMs
        ? nextMs
        : startMs + hours * 60 * 60 * 1000;
    return { ...moment, endIso: new Date(endMs).toISOString() };
  });
}

export function celebrationDayGroups(moments: CelebrationMoment[]): CelebrationDay[] {
  const groups: CelebrationDay[] = [];
  for (const moment of moments) {
    const key = `${moment.year}-${moment.month}-${moment.day}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.moments.push(moment);
    else {
      groups.push({
        key,
        weekday: moment.weekday,
        day: moment.day,
        month: moment.month,
        year: moment.year,
        moments: [moment],
      });
    }
  }
  return groups;
}
