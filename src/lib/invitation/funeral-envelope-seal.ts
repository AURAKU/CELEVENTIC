import type { SealDesignId } from "@/lib/invitation/seal-design";

/**
 * Funeral envelopes use a poured wax seal + memorial emblem — never wedding-style
 * couple initials ("C | J" / "A | B"). Each catalogue SKU gets a unique wax material
 * and a unique emblem so browse cards never look duplicated.
 */
export type FuneralEnvelopeSeal = {
  design: SealDesignId;
  /** Short memorial mark shown in the wax (not a couple monogram). */
  emblem: string;
};

export const FUNERAL_ENVELOPE_SEAL_BY_SLUG: Record<string, FuneralEnvelopeSeal> = {
  "memorial-candle-tribute": { design: "soft-candle", emblem: "✝" },
  "candlelight-farewell": { design: "charcoal", emblem: "◈" },
  "candlelight-elegy-pages": { design: "ivory-dove", emblem: "❦" },
  "white-lily-rest": { design: "cream-linen", emblem: "✿" },
  "white-lily-memorial-pages": { design: "soft-slate", emblem: "✶" },
  "royal-mourning-lite": { design: "burgundy-wax", emblem: "◆" },
  "royal-mourning-pages": { design: "gold-foil-rim", emblem: "✠" },
  "black-red-cloth-rite": { design: "garnet-cloth", emblem: "✦" },
  "white-cloth-homegoing": { design: "silver-vigil", emblem: "✧" },
  "kente-border-farewell": { design: "heritage-bronze", emblem: "★" },
  "one-week-vigil-notice": { design: "obsidian-gold", emblem: "☽" },
};

export const DEFAULT_FUNERAL_ENVELOPE_SEAL: FuneralEnvelopeSeal = {
  design: "charcoal",
  emblem: "✝",
};

export function resolveFuneralEnvelopeSeal(
  catalogSlug?: string | null
): FuneralEnvelopeSeal {
  if (catalogSlug && FUNERAL_ENVELOPE_SEAL_BY_SLUG[catalogSlug]) {
    return FUNERAL_ENVELOPE_SEAL_BY_SLUG[catalogSlug];
  }
  return DEFAULT_FUNERAL_ENVELOPE_SEAL;
}

/** True when a seal label is a wedding-style pipe monogram (e.g. "C | J"). */
export function isWeddingStyleSealMonogram(label?: string | null): boolean {
  if (!label) return false;
  return /^[A-ZÀ-ÿ]\s*\|\s*[A-ZÀ-ÿ]$/i.test(label.trim());
}
