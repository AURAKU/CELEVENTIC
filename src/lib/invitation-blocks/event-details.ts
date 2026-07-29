import { EVENT_TIME_ZONE } from "@/lib/constants";
import type { BlockContentJson, BlockRenderContext } from "./block-types";

type EventDetailItem = NonNullable<BlockContentJson["items"]>[number];

function validDate(value?: string): Date | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hasExplicitClock(value?: string): boolean {
  return Boolean(
    value &&
      (/[T\s]\d{1,2}:\d{2}(?::\d{2})?/.test(value) ||
        /\d{1,2}(?::\d{2})?\s*(?:AM|PM)\b/i.test(value))
  );
}

/** Format the authoritative event date without leaking its clock into DATE. */
export function formatEventDetailsDate(
  eventDateRaw?: string,
  eventDate?: string
): string | undefined {
  const source = eventDateRaw?.trim() || eventDate?.trim();
  if (!source) return undefined;

  const date = validDate(source);
  if (date) {
    return new Intl.DateTimeFormat("en-GH", {
      timeZone: EVENT_TIME_ZONE,
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  // Preserve an unparseable host-entered date, but remove a recognizable
  // trailing clock so DATE and TIME can never repeat the same information.
  return source
    .replace(
      /(?:,\s*|\s+at\s+)\d{1,2}(?::\d{2})?(?:\s*(?:AM|PM))?(?:\s+[A-Z]{2,5})?$/i,
      ""
    )
    .trim();
}

/** Normalize an order/vision-board time or derive it from event.startDate. */
export function formatEventDetailsTime(
  eventTime?: string,
  eventDateRaw?: string,
  eventDate?: string
): string | undefined {
  const configured = eventTime?.trim();
  if (configured) {
    const twelveHour = configured.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (twelveHour) {
      const minutes = twelveHour[2] ?? "00";
      return `${Number(twelveHour[1])}:${minutes} ${twelveHour[3].toUpperCase()}`;
    }

    const twentyFourHour = configured.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
    if (twentyFourHour) {
      const anchor = new Date(Date.UTC(2000, 0, 1, Number(twentyFourHour[1]), Number(twentyFourHour[2])));
      return new Intl.DateTimeFormat("en-US", {
        timeZone: "UTC",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(anchor);
    }

    return configured;
  }

  const source = eventDateRaw?.trim() || eventDate?.trim();
  if (!source || !hasExplicitClock(source)) return undefined;
  const date = validDate(source);
  if (!date) return undefined;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: EVENT_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/**
 * Keep custom rows, but authoritative event data owns the standard
 * DATE/TIME/VENUE rows so stale generated block JSON cannot blank them.
 */
export function resolveEventDetailsItems(
  items: EventDetailItem[] | undefined,
  ctx: BlockRenderContext
): EventDetailItem[] {
  const date = formatEventDetailsDate(ctx.eventDateRaw, ctx.eventDate);
  const time = formatEventDetailsTime(ctx.eventTime, ctx.eventDateRaw, ctx.eventDate);
  const venue = ctx.venueName?.trim() || ctx.landmark?.trim() || undefined;
  const source =
    items?.length
      ? items
      : [
          { label: "Date", value: date },
          { label: "Time", value: time },
          { label: "Venue", value: venue },
        ];

  return source.map((item) => {
    switch (item.label.trim().toLowerCase()) {
      case "date":
        return { ...item, value: date ?? item.value };
      case "time":
        return { ...item, value: time ?? item.value };
      case "venue":
        return { ...item, value: venue ?? item.value };
      default:
        return item;
    }
  });
}
