import { formatInvitationDateParts } from "@/lib/invitation-templates";
import { extractHonoureeName } from "@/lib/invitation/vision-board";
import type { InvitationEventData } from "@/types/invitation-design";

export function isGenericFuneralTitle(title: string): boolean {
  const t = title.trim();
  return (
    /^(the\s+)?funeral$/i.test(t) ||
    /^celebration of life$/i.test(t) ||
    /^memorial service$/i.test(t) ||
    /^funeral service$/i.test(t)
  );
}

function isFamilyOrganizerName(name: string): boolean {
  const n = name.trim();
  return /^the\s+.+\s+family$/i.test(n) || /^family\s+of\s+/i.test(n);
}

/** Primary honouree name for funeral invitations. */
export function resolveDeceasedName(
  event: InvitationEventData,
  invitationName?: string | null
): string {
  const host = event.hostName?.trim() ?? "";
  const fromTitle = extractHonoureeName(event.title, invitationName);
  const rawTitle = event.title.replace(/^celebration of life\s*[, –-]\s*/i, "").trim();

  if (host && isFamilyOrganizerName(host) && fromTitle && !isGenericFuneralTitle(fromTitle)) {
    return fromTitle;
  }

  if (fromTitle && fromTitle !== rawTitle && !isGenericFuneralTitle(fromTitle)) {
    return fromTitle;
  }

  if (host && !isFamilyOrganizerName(host)) return host;

  if (rawTitle && !isGenericFuneralTitle(rawTitle)) return rawTitle;
  return host || "Our beloved";
}

export function resolveFuneralCoverCopy(
  event: InvitationEventData,
  introText?: string | null,
  invitationName?: string | null
): { eyebrow: string; headline: string; subtitle: string } {
  const eyebrow = introText?.trim() || "In Loving Memory";
  const headline = resolveDeceasedName(event, invitationName);
  const rawTitle = event.title.replace(/^celebration of life\s*[, –-]\s*/i, "").trim();
  const generic = isGenericFuneralTitle(rawTitle);
  const honoureeFromTitle = extractHonoureeName(event.title, invitationName);

  const subtitle = generic
    ? "Celebration of Life"
    : honoureeFromTitle && honoureeFromTitle !== event.title.trim()
      ? "Celebration of Life"
      : rawTitle && rawTitle !== headline
        ? rawTitle
        : "Celebration of Life";

  return { eyebrow, headline, subtitle };
}

export interface FuneralProgrammeStep {
  id: string;
  step: string;
  title: string;
  detail: string;
}

function dayWithOrdinal(day: number): string {
  const j = day % 10;
  const k = day % 100;
  if (j === 1 && k !== 11) return `${day}st`;
  if (j === 2 && k !== 12) return `${day}nd`;
  if (j === 3 && k !== 13) return `${day}rd`;
  return `${day}th`;
}

function formatFuneralProgrammeDate(
  dateParts: ReturnType<typeof formatInvitationDateParts> | null
): string {
  if (!dateParts) return "Date to be announced";
  return `${dateParts.weekday} ${dayWithOrdinal(dateParts.day)} ${dateParts.month}, ${dateParts.year}`;
}

function resolveIntermentPlace(event: InvitationEventData): string {
  const landmark = event.landmark?.trim();
  if (landmark && /cemetery|burial|grave|interment/i.test(landmark)) return landmark;
  const venue = event.venueName?.trim() ?? "";
  const place = venue
    .replace(/^.*?\bchurch\b\s+/i, "")
    .replace(/^the\s+/i, "")
    .trim();
  if (place) return `${place} Cemetery`;
  return landmark || "Burial ground as announced by the family";
}

function thanksgivingDateLine(
  startRaw: string | undefined,
  serviceDateLine: string
): string {
  if (!startRaw) return "Sunday following the funeral rites";
  const start = new Date(startRaw);
  if (Number.isNaN(start.getTime())) return serviceDateLine;
  const thanks = new Date(start.getTime());
  // Typical Ghanaian programme: thanksgiving on the Sunday after Friday rites.
  const day = thanks.getUTCDay(); // 0 Sun … 5 Fri
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  thanks.setUTCDate(thanks.getUTCDate() + daysUntilSunday);
  const parts = formatInvitationDateParts(thanks.toISOString());
  return formatFuneralProgrammeDate(parts);
}

/**
 * Ghanaian funeral arrangements programme (laying in state → interment →
 * final rites → thanksgiving), filled from the invitation’s venue and dates.
 */
export function buildFuneralProgramme(
  event: InvitationEventData,
  dateParts: ReturnType<typeof formatInvitationDateParts> | null
): FuneralProgrammeStep[] {
  const venue = event.venueName?.trim() || "Service venue";
  const serviceDate = formatFuneralProgrammeDate(dateParts);
  const intermentPlace = resolveIntermentPlace(event);
  const thanksgiving = thanksgivingDateLine(event.startDateRaw, serviceDate);

  return [
    {
      id: "laying-in-state",
      step: "01",
      title: "Laying in state",
      detail: `${serviceDate} at ${venue} from 4:30am – 9:00am`,
    },
    {
      id: "interment",
      step: "02",
      title: "Interment",
      detail: `${serviceDate} at ${intermentPlace}`,
    },
    {
      id: "final-rites",
      step: "03",
      title: "Final funeral rites",
      detail: `${serviceDate} at ${venue} from 1:00pm – 6:00pm`,
    },
    {
      id: "thanksgiving",
      step: "04",
      title: "Thanksgiving service",
      detail: `${thanksgiving} at ${venue} from 9:00am`,
    },
  ];
}

export function formatFuneralDateLine(
  dateParts: ReturnType<typeof formatInvitationDateParts> | null,
  fallback?: string | null
): string | null {
  if (dateParts) {
    return `${dateParts.weekday}, ${dateParts.month} ${dateParts.day}, ${dateParts.year}`;
  }
  return fallback?.trim() || null;
}
