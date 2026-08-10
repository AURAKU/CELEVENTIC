import { DEFAULT_WEDDING_BOARD } from "@/lib/invitation/wedding-board";
import type { InvitationDesignConfig } from "@/types/invitation-design";

/**
 * Second segment of the gift status/receipt line: `HOSTS · BRAND`.
 *
 * Prefer a real event/campaign hashtag when present. Never invent
 * THEFOREVERAFARIS for every Celeventic event — only Forever Afaris template
 * (or an explicit hashtag / forever-afaris slug) may resolve to that brand.
 */

const FOREVER_AFARIS_TEMPLATE = "forever-afaris-wedding";
const FOREVER_AFARIS_SLUG = /forever-?afaris/i;

/** Uppercase hashtag without `#` or separators — e.g. `#TheForeverAfaris` → `THEFOREVERAFARIS`. */
export function normalizeGiftBrandHashtag(raw: string): string {
  return raw
    .trim()
    .replace(/^#+/, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toUpperCase();
}

/** Host-authored hashtag on the invitation board, if set (no template defaults). */
export function extractInvitationHashtag(
  design: InvitationDesignConfig | null | undefined
): string | null {
  const raw = design?.studio?.weddingBoard?.hashtag;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export interface GiftStatusBrandInput {
  eventTitle: string;
  eventHashtag?: string | null;
  invitationHashtag?: string | null;
  templateSlug?: string | null;
  eventSlug?: string | null;
}

/**
 * Resolve the second segment after `·` on the gift success card.
 * Hashtag sources win; otherwise the event title (CSS uppercases it).
 */
export function resolveGiftStatusBrandSegment(input: GiftStatusBrandInput): string {
  const explicit =
    trimOrNull(input.eventHashtag) ??
    trimOrNull(input.invitationHashtag) ??
    foreverAfarisHashtagFallback(input.templateSlug, input.eventSlug);

  if (explicit) return normalizeGiftBrandHashtag(explicit);
  return input.eventTitle;
}

function foreverAfarisHashtagFallback(
  templateSlug?: string | null,
  eventSlug?: string | null
): string | null {
  if (templateSlug === FOREVER_AFARIS_TEMPLATE) {
    return DEFAULT_WEDDING_BOARD.hashtag;
  }
  if (eventSlug && FOREVER_AFARIS_SLUG.test(eventSlug)) {
    return DEFAULT_WEDDING_BOARD.hashtag;
  }
  return null;
}

function trimOrNull(value?: string | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
