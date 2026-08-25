/**
 * Memorial envelope family detection — which live funeral invitations MUST
 * run the wax-seal-black envelope ceremony regardless of stale persisted DNA.
 */
import {
  getCatalogTemplate,
  LEGACY_CATALOG_SLUG_MAP,
  resolveCatalogSlug,
} from "@/lib/invitation-mvp/catalogue";

export const MEMORIAL_ENVELOPE_LAYOUT = "memorial-candle-tribute";

/** Funeral SKUs that share the memorial layout but declare a different ceremony. */
export const ALTERNATE_FUNERAL_CEREMONY_OPENINGS = new Set([
  "curtain-award",
  "light-beam",
  "press-hold",
  "envelope-floral",
]);

export function resolveEffectiveCatalogSlug(input: {
  catalogSlug?: string | null;
  layout?: string | null;
}): string | null {
  const slug = input.catalogSlug?.trim();
  if (slug) return resolveCatalogSlug(slug);
  const layout = input.layout?.trim();
  if (layout === MEMORIAL_ENVELOPE_LAYOUT) return MEMORIAL_ENVELOPE_LAYOUT;
  return layout ?? null;
}

export function isLegacyMemorialEnvelopeSlug(catalogSlug: string | null | undefined): boolean {
  if (!catalogSlug) return false;
  return LEGACY_CATALOG_SLUG_MAP[catalogSlug.trim()] === MEMORIAL_ENVELOPE_LAYOUT;
}

export function catalogDeclaresAlternateFuneralCeremony(
  catalogSlug: string | null | undefined
): boolean {
  if (!catalogSlug) return false;
  const template = getCatalogTemplate(catalogSlug);
  const opening = template?.experienceOverrides?.openingExperience;
  if (!opening) return false;
  return ALTERNATE_FUNERAL_CEREMONY_OPENINGS.has(opening);
}

export function isLegacyMemorialOpeningDNA(
  openingExperience?: string | null,
  revealMode?: string | null
): boolean {
  if (revealMode === "none" || revealMode === "curtain") return true;
  if (openingExperience === "candle-light" || openingExperience === "none") return true;
  if (openingExperience?.startsWith("curtain-")) return true;
  return false;
}

export interface MandatoryMemorialEnvelopeInput {
  catalogSlug?: string | null;
  layout?: string | null;
  collectionId?: string | null;
  rawOpeningExperience?: string | null;
  rawRevealMode?: string | null;
}

/**
 * True when a live guest invitation must run the memorial wax-seal envelope,
 * even if persisted design JSON still says curtain / candle-light / none.
 */
export function shouldUseMandatoryMemorialEnvelope(
  input: MandatoryMemorialEnvelopeInput
): boolean {
  const rawSlug = input.catalogSlug?.trim() ?? null;
  const layout = input.layout?.trim() ?? null;
  const effectiveSlug = resolveEffectiveCatalogSlug({ catalogSlug: rawSlug, layout });

  if (effectiveSlug === MEMORIAL_ENVELOPE_LAYOUT) {
    if (rawSlug && catalogDeclaresAlternateFuneralCeremony(rawSlug)) return false;
    return true;
  }

  if (layout === MEMORIAL_ENVELOPE_LAYOUT) {
    if (rawSlug && catalogDeclaresAlternateFuneralCeremony(rawSlug)) return false;
    if (effectiveSlug && catalogDeclaresAlternateFuneralCeremony(effectiveSlug)) return false;
    if (input.collectionId === "funeral") return true;
    if (isLegacyMemorialEnvelopeSlug(rawSlug)) return true;
    if (isLegacyMemorialOpeningDNA(input.rawOpeningExperience, input.rawRevealMode)) {
      return true;
    }
  }

  if (isLegacyMemorialEnvelopeSlug(rawSlug)) return true;

  return false;
}
