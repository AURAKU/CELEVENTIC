import type { InvitationDesignConfig } from "@/types/invitation-design";
import { mergeWeddingBoard } from "@/lib/invitation/wedding-board";
import { isAureliaEditorialLayout } from "@/lib/experience/aurelia-editorial";
import { AURELIA_TRADITIONAL_ISO } from "@/lib/experience/aurelia-editorial/preset";

const FOREVER_AFARIS_LAYOUT = "forever-afaris-wedding";

/**
 * Resolve the ceremony instant shown on guest-facing surfaces.
 *
 * Forever Afaris stores its authoritative ceremony time in the merged wedding
 * board. Other templates, and malformed board targets, retain the Event value.
 */
export function resolveGuestFacingEventInstant(
  eventStartDate: Date | string,
  design?: Pick<InvitationDesignConfig, "layout" | "studio" | "experience"> | null
): Date {
  const fallback = toValidDate(eventStartDate);

  if (isAureliaEditorialLayout(design?.layout)) {
    const iso =
      design?.experience?.aureliaWedding?.ceremonies?.find((item) => item.startAtIso)?.startAtIso?.trim() ||
      AURELIA_TRADITIONAL_ISO;
    return toValidDateOrNull(iso) ?? fallback;
  }

  if (design?.layout !== FOREVER_AFARIS_LAYOUT) return fallback;

  const target = mergeWeddingBoard(design.studio?.weddingBoard).countdownTarget.trim();
  const ceremonyInstant = toValidWeddingBoardDate(target);
  return ceremonyInstant ?? fallback;
}

/** Prefer the Forever Afaris wedding-board venue when Event venue is absent. */
export function resolveGuestFacingVenue(
  eventVenueName: string | null | undefined,
  design?: Pick<InvitationDesignConfig, "layout" | "studio" | "experience"> | null
): string | null {
  if (isAureliaEditorialLayout(design?.layout)) {
    const ceremonyVenue = design?.experience?.aureliaWedding?.ceremonies
      ?.find((item) => item.venueName?.trim())
      ?.venueName?.trim();
    if (ceremonyVenue) return ceremonyVenue;
  }
  const eventVenue = eventVenueName?.trim();
  if (eventVenue) return eventVenue;
  if (design?.layout !== FOREVER_AFARIS_LAYOUT) return null;

  return mergeWeddingBoard(design.studio?.weddingBoard).venueName.trim() || null;
}

function toValidDate(value: Date | string): Date {
  const date = toValidDateOrNull(value);
  if (!date) {
    throw new RangeError("Guest-facing event start date must be a valid date");
  }
  return date;
}

function toValidDateOrNull(value: Date | string): Date | null {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toValidWeddingBoardDate(value: string): Date | null {
  // Wedding-board values are entered as Ghana ceremony wall time. Ghana is
  // UTC year-round; make offset-less ISO values deterministic across servers.
  const hasExplicitOffset = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
  const isOffsetlessIsoDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(
    value
  );
  return toValidDateOrNull(
    isOffsetlessIsoDateTime && !hasExplicitOffset ? `${value}Z` : value
  );
}
