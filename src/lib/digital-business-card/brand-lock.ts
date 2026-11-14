/**
 * CeleYou brand lock. The live plate, official teal orb, gold edge, and
 * classic landscape layout are the product identity. Optional looks may be
 * chosen by the owner. They must never replace the official mark or silently
 * rewrite an existing card.
 *
 * Major brand changes need explicit approval.
 */

export const CELEYOU_ORIGINAL_THEME_ID = "elegant-frost";
export const CELEYOU_ORIGINAL_COMPOSITION = "classic";
export const CELEYOU_ORIGINAL_ATMOSPHERE = "salon";
export const CELEYOU_ORIGINAL_ACCENT = "#0B8A83";
export const CELEYOU_ORIGINAL_BORDER = "#d4a63a";
export const CELEYOU_ORIGINAL_QR_INK = "#0B8A83";
export const CELEYOU_ORIGINAL_LAYOUT = "id-1";

export const CELEYOU_MARK_PATH = "/digital-cards/brands/celeyou-mark.png";
export const CELEYOU_WORDMARK_PATH = "/digital-cards/brands/celeyou-wordmark.png";
export const CELEYOU_LOCKUP_PATH = "/digital-cards/brands/celeyou-lockup.png";

/** Conceptual mockup inks. Never use these for the official CeleYou mark. */
export const CELEYOU_FORBIDDEN_MARK_INKS = ["#7c3aed", "#6d28d9", "#8b5cf6", "#a855f7", "#4c1d95"];

export const CELEYOU_IDENTITY_KEYS = [
  "displayName",
  "title",
  "company",
  "bio",
  "avatarUrl",
  "companyLogoUrl",
  "email",
  "phone",
  "website",
  "slug",
  "publicToken",
] as const;

export type CeleYouIdentityKey = (typeof CELEYOU_IDENTITY_KEYS)[number];

export function celeCardDesignOmitsIdentity(design: object | null | undefined): boolean {
  if (!design) return true;
  const record = design as Record<string, unknown>;
  return CELEYOU_IDENTITY_KEYS.every((key) => record[key] === undefined);
}

export function stripIdentityFromDesign<T extends object>(design: T): T {
  const next = { ...design } as T & Record<string, unknown>;
  for (const key of CELEYOU_IDENTITY_KEYS) {
    delete next[key];
  }
  return next;
}

