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

/** Default dignified order-of-day when hosts have not supplied a custom programme. */
export function buildFuneralProgramme(
  event: InvitationEventData,
  dateParts: ReturnType<typeof formatInvitationDateParts> | null
): FuneralProgrammeStep[] {
  const serviceTime = dateParts?.time?.trim() || "Time to be confirmed";
  const venue = event.venueName?.trim() || "Service venue";

  return [
    {
      id: "gathering",
      step: "01",
      title: "Gathering",
      detail: "Arrive early to greet the family and find your seat in quiet reflection.",
    },
    {
      id: "service",
      step: "02",
      title: "Funeral service",
      detail: `${venue} · ${serviceTime}`,
    },
    {
      id: "committal",
      step: "03",
      title: "Final committal",
      detail: "Burial or interment as announced by the family following the service.",
    },
    {
      id: "repast",
      step: "04",
      title: "Repast & thanksgiving",
      detail: "Refreshments and fellowship with the family to give thanks for a life well lived.",
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
