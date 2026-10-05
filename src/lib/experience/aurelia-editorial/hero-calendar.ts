import { EVENT_TIME_ZONE } from "@/lib/constants";
import type { AureliaCeremony } from "./types";

export type CivilDate = { year: number; month: number; day: number };

export type MonthCell = {
  day: number | null;
  key: string | null;
};

export type HighlightedCeremonyDay = {
  key: string;
  day: number;
  title: string;
  weekday: string;
  dateLabel: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function civilKey(date: CivilDate): string {
  return `${date.year}-${pad(date.month + 1)}-${pad(date.day)}`;
}

/** Accra wall-clock date from an ISO instant. */
export function civilDateInZone(iso: string, timeZone = EVENT_TIME_ZONE): CivilDate | null {
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(instant);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  if (!year || !month || !day) return null;
  return { year, month: month - 1, day };
}

/** Sunday-start month grid with leading blanks. */
export function buildMonthCells(year: number, month: number): MonthCell[] {
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: MonthCell[] = [];
  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push({ day: null, key: null });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, key: civilKey({ year, month, day }) });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, key: null });
  }
  return cells;
}

export function highlightedCeremonyDays(
  ceremonies: readonly AureliaCeremony[],
  timeZone = EVENT_TIME_ZONE
): HighlightedCeremonyDay[] {
  const seen = new Set<string>();
  const days: HighlightedCeremonyDay[] = [];
  for (const ceremony of ceremonies) {
    if (!ceremony.startAtIso) continue;
    const civil = civilDateInZone(ceremony.startAtIso, timeZone);
    if (!civil) continue;
    const key = civilKey(civil);
    if (seen.has(key)) continue;
    seen.add(key);
    days.push({
      key,
      day: civil.day,
      title: ceremony.title,
      weekday: ceremony.weekday,
      dateLabel: ceremony.dateLabel,
    });
  }
  return days;
}

export function calendarMonthFromHighlights(days: readonly HighlightedCeremonyDay[]): CivilDate | null {
  if (!days[0]) return null;
  const [year, month] = days[0].key.split("-").map(Number);
  if (!year || !month) return null;
  return { year, month: month - 1, day: 1 };
}
