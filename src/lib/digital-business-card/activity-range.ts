export const ACTIVITY_RANGE_PRESETS = ["today", "7d", "30d", "month", "all"] as const;
export type ActivityRangePreset = (typeof ACTIVITY_RANGE_PRESETS)[number];

export type ActivityDateRange = {
  preset: ActivityRangePreset | "custom";
  from: string | null;
  to: string | null;
};

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDayKey(value: string | null | undefined): Date | null {
  const match = DAY.exec((value || "").trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const next = new Date(year, month - 1, day);
  if (next.getFullYear() !== year || next.getMonth() !== month - 1 || next.getDate() !== day) return null;
  return next;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

export function shiftMonth(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function defaultActivityRange(): ActivityDateRange {
  return { preset: "all", from: null, to: null };
}

export function activityRangeFromPreset(preset: ActivityRangePreset, now = new Date()): ActivityDateRange {
  if (preset === "all") return defaultActivityRange();
  const today = startOfDay(now);
  if (preset === "today") {
    const key = toDayKey(today);
    return { preset, from: key, to: key };
  }
  if (preset === "7d") {
    return { preset, from: toDayKey(addDays(today, -6)), to: toDayKey(today) };
  }
  if (preset === "30d") {
    return { preset, from: toDayKey(addDays(today, -29)), to: toDayKey(today) };
  }
  return { preset: "month", from: toDayKey(startOfMonth(today)), to: toDayKey(today) };
}

export function activityRangeFromDays(fromKey: string, toKey: string): ActivityDateRange | null {
  const from = parseDayKey(fromKey);
  const to = parseDayKey(toKey);
  if (!from || !to) return null;
  const start = from.getTime() <= to.getTime() ? from : to;
  const end = from.getTime() <= to.getTime() ? to : from;
  return { preset: "custom", from: toDayKey(start), to: toDayKey(end) };
}

export function activityRangeBounds(range: ActivityDateRange): { from: Date | null; to: Date | null } {
  if (range.preset === "all" || !range.from || !range.to) return { from: null, to: null };
  const from = parseDayKey(range.from);
  const to = parseDayKey(range.to);
  if (!from || !to) return { from: null, to: null };
  return { from: startOfDay(from), to: endOfDay(to) };
}

export function activityRangeQuery(range: ActivityDateRange): string {
  const bounds = activityRangeBounds(range);
  if (!bounds.from || !bounds.to) return "";
  const params = new URLSearchParams({
    from: range.from || toDayKey(bounds.from),
    to: range.to || toDayKey(bounds.to),
  });
  return `?${params.toString()}`;
}

export function formatActivityRangeLabel(range: ActivityDateRange, now = new Date()): string {
  if (range.preset === "all" || !range.from || !range.to) return "All time";
  if (range.preset === "today") return "Today";
  if (range.preset === "7d") return "Last 7 days";
  if (range.preset === "30d") return "Last 30 days";
  if (range.preset === "month") return "This month";
  const from = parseDayKey(range.from);
  const to = parseDayKey(range.to);
  if (!from || !to) return "All time";
  const sameYear = from.getFullYear() === to.getFullYear();
  const hideYear = sameYear && from.getFullYear() === now.getFullYear();
  const sameMonth = sameYear && from.getMonth() === to.getMonth();
  if (range.from === range.to) {
    return from.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: hideYear ? undefined : "numeric",
    });
  }
  if (sameMonth) {
    const monthText = from.toLocaleDateString("en-GB", {
      month: "short",
      year: hideYear ? undefined : "numeric",
    });
    return `${from.getDate()} to ${to.getDate()} ${monthText}`;
  }
  const fromText = from.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: hideYear ? undefined : "numeric",
  });
  const toText = to.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: hideYear ? undefined : "numeric",
  });
  return `${fromText} to ${toText}`;
}

export function formatActivityHeroCaption(range: ActivityDateRange): string {
  if (range.preset === "all" || !range.from || !range.to) {
    return "People opened this public profile.";
  }
  if (range.preset === "today") return "People who opened this public profile today.";
  if (range.preset === "7d") return "People who opened this public profile in the last 7 days.";
  if (range.preset === "30d") return "People who opened this public profile in the last 30 days.";
  if (range.preset === "month") return "People who opened this public profile this month.";
  return `People who opened this public profile from ${formatActivityRangeLabel(range)}.`;
}

export function monthGrid(anchor: Date): Array<{ key: string; date: Date; inMonth: boolean }> {
  const first = startOfMonth(anchor);
  const pad = (first.getDay() + 6) % 7;
  const start = addDays(first, -pad);
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index);
    return { key: toDayKey(date), date, inMonth: date.getMonth() === first.getMonth() };
  });
}
