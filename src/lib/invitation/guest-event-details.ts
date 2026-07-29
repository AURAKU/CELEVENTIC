import type { InvitationDesignConfig } from "@/types/invitation-design";
import { mergeWeddingBoard } from "@/lib/invitation/wedding-board";

const FOREVER_AFARIS_LAYOUT = "forever-afaris-wedding";

/**
 * Resolve the ceremony instant shown on guest-facing surfaces.
 *
 * Forever Afaris stores its authoritative ceremony time in the merged wedding
 * board. Other templates, and malformed board targets, retain the Event value.
 */
export function resolveGuestFacingEventInstant(
  eventStartDate: Date | string,
  design?: Pick<InvitationDesignConfig, "layout" | "studio"> | null
): Date {
  const fallback = toValidDate(eventStartDate);

  if (design?.layout !== FOREVER_AFARIS_LAYOUT) return fallback;

  const target = mergeWeddingBoard(design.studio?.weddingBoard).countdownTarget.trim();
  const ceremonyInstant = toValidWeddingBoardDate(target);
  return ceremonyInstant ?? fallback;
}

/** Prefer the Forever Afaris wedding-board venue when Event venue is absent. */
export function resolveGuestFacingVenue(
  eventVenueName: string | null | undefined,
  design?: Pick<InvitationDesignConfig, "layout" | "studio"> | null
): string | null {
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
