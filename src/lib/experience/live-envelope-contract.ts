/**
 * Live envelope ceremony contract.
 *
 * Normal LIVE guest invitations must wait indefinitely on a sealed envelope
 * until the guest explicitly taps/clicks. Auto-open is reserved for
 * catalogue / studio / demo preview mounts that opt in.
 */

import { isPreviewInvitationId } from "@/lib/invitation/guest-portal-actions";
import { SKU_CREATIVE_OVERRIDES } from "@/lib/invitation/template-creative-sku-overrides";
import { mapLegacyRevealMode } from "@/lib/experience/opening-experiences";
import {
  MEMORIAL_ENVELOPE_LAYOUT,
  resolveEffectiveCatalogSlug,
  shouldUseMandatoryMemorialEnvelope,
} from "@/lib/experience/memorial-envelope-family";
import type { OpeningExperienceId } from "@/lib/experience/experience-types";
import type { RevealMode } from "@/lib/invitation-studio/studio-types";

export interface LiveGuestMountInput {
  /** Framed catalogue / studio / template preview shell. */
  embedded?: boolean;
  /** Analytics skipped on preview / demo mounts. */
  skipAnalytics?: boolean;
  invitationId?: string | null;
  uniqueLink?: string | null;
}

/**
 * True for a production `/invite/[link]` guest mount (and equivalents).
 * Preview / studio / embedded catalogue mounts are never live guests.
 */
export function isLiveGuestInviteMount(input: LiveGuestMountInput): boolean {
  if (input.embedded) return false;
  if (input.skipAnalytics) return false;
  const id = input.invitationId?.trim() ?? "";
  const link = input.uniqueLink?.trim() ?? "";
  if (id && isPreviewInvitationId(id)) return false;
  if (link === "preview" || link.startsWith("preview-")) return false;
  return true;
}

/**
 * Resolve whether the envelope may auto-open after mount.
 * LIVE guests: always false — even if a stale caller passes autoOpenReveal=true.
 * Preview/demo: honors explicit autoOpenReveal.
 */
export function resolveEnvelopeAutoOpen(input: {
  isLiveGuest: boolean;
  autoOpenReveal?: boolean;
}): boolean {
  if (input.isLiveGuest) return false;
  return Boolean(input.autoOpenReveal);
}

/**
 * EnvelopeCollectionReveal gate: auto-open only when explicitly requested
 * and not a static sealed preview tile.
 */
export function shouldEnvelopeAutoOpen(input: {
  autoOpen?: boolean;
  staticPreview?: boolean;
}): boolean {
  return Boolean(input.autoOpen) && !input.staticPreview;
}

export interface ShowRevealInput {
  isFuneralCollection: boolean;
  skipReveal?: boolean;
  revealEnabled?: boolean;
  openingExperience?: string | null;
  /** studio.revealMode */
  revealMode?: string | null;
}

/**
 * Whether the opening reveal ceremony (envelope/curtain/…) should run.
 * Funeral/memorial always keeps the ceremony unless skipReveal or revealMode=none.
 */
export function resolveShowReveal(input: ShowRevealInput): boolean {
  if (input.skipReveal) return false;
  if (input.revealMode === "none") return false;

  if (input.isFuneralCollection) {
    return true;
  }

  return Boolean(input.revealEnabled) && input.openingExperience !== "none";
}

/** Phase after the guest completes Tap to Begin (gesture #1). */
export function resolvePhaseAfterTapBegin(showReveal: boolean): "reveal" | "portal" {
  return showReveal ? "reveal" : "portal";
}

/**
 * Catalog SKUs whose creative contract mandates the memorial envelope ceremony.
 * Uses explicit memorial-envelope markers — not generic wedding envelope SKUs.
 */
export function isCanonicalMemorialEnvelopeSku(catalogSlug: string | null | undefined): boolean {
  if (!catalogSlug) return false;
  if (catalogSlug === MEMORIAL_ENVELOPE_LAYOUT) return true;
  const override = SKU_CREATIVE_OVERRIDES[catalogSlug];
  if (!override) return false;
  const sequence = String(override.openingSequence ?? "");
  if (/memorial envelope/i.test(sequence)) return true;
  const universe = String(override.creativeUniverse ?? "");
  return universe === "memorial-candle" && /envelope/i.test(sequence);
}

export function resolveCatalogSlugForLiveReveal(input: {
  catalogSlug?: string | null;
  layout?: string | null;
}): string | null {
  return resolveEffectiveCatalogSlug(input);
}

export function resolveIsFuneralCollection(input: {
  collectionId?: string | null;
  layout?: string | null;
  eventTitle?: string | null;
}): boolean {
  return (
    input.collectionId === "funeral" ||
    input.layout === MEMORIAL_ENVELOPE_LAYOUT ||
    /funeral|memorial|homegoing|tribute/i.test(
      `${input.eventTitle ?? ""} ${input.layout ?? ""} ${input.collectionId ?? ""}`
    )
  );
}

export interface LiveRevealConfigurationInput {
  catalogSlug?: string | null;
  layout?: string | null;
  eventTitle?: string | null;
  studio?: { revealMode?: RevealMode | string | null } | null;
  experience?: {
    openingExperience?: OpeningExperienceId | string | null;
    collectionId?: string | null;
  } | null;
  revealModeProp?: RevealMode | string | null;
  openingExperienceProp?: OpeningExperienceId | null;
  revealEnabledProp?: boolean;
  skipReveal?: boolean;
}

export interface LiveRevealConfiguration {
  layout: string | null;
  catalogSlug: string | null;
  effectiveCatalogSlug: string | null;
  rawRevealMode: RevealMode | string | null;
  resolvedRevealMode: RevealMode;
  rawOpeningExperience: OpeningExperienceId;
  resolvedOpeningExperience: OpeningExperienceId;
  isFuneralCollection: boolean;
  isMemorialEnvelopeSku: boolean;
  mandatoryMemorialEnvelope: boolean;
  revealEnabled: boolean;
  showReveal: boolean;
  curtainOwnsTap: boolean;
}

function isMemorialEnvelopeInvariantEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.CELEVENTIC_MEMORIAL_ENVELOPE_INVARIANT === "1"
  );
}

/**
 * Hard runtime guard: mandatory memorial envelope live invites must never
 * silently bypass the sealed envelope ceremony.
 */
export function assertMandatoryMemorialEnvelopeInvariant(input: {
  mandatoryMemorialEnvelope: boolean;
  isLiveGuest?: boolean;
  config: LiveRevealConfiguration;
  envelopeAutoOpen?: boolean;
  needsTapGate?: boolean;
}): void {
  if (!isMemorialEnvelopeInvariantEnabled()) return;
  if (!input.mandatoryMemorialEnvelope) return;
  if (input.isLiveGuest === false) return;

  const { config } = input;
  if (config.resolvedRevealMode !== "envelope") {
    throw new Error(
      `[memorial-envelope-invariant] resolvedRevealMode=${config.resolvedRevealMode}`
    );
  }
  if (config.resolvedOpeningExperience !== "wax-seal-black") {
    throw new Error(
      `[memorial-envelope-invariant] resolvedOpeningExperience=${config.resolvedOpeningExperience}`
    );
  }
  if (!config.showReveal) {
    throw new Error("[memorial-envelope-invariant] showReveal must be true");
  }
  if (config.curtainOwnsTap) {
    throw new Error("[memorial-envelope-invariant] curtainOwnsTap must be false");
  }
  if (input.envelopeAutoOpen) {
    throw new Error("[memorial-envelope-invariant] envelopeAutoOpen must be false on live");
  }
  if (input.needsTapGate === false) {
    throw new Error("[memorial-envelope-invariant] needsTapGate must be true");
  }
}

/**
 * Single source of truth for live guest opening ceremony resolution.
 * Normalizes legacy memorial-candle-tribute persisted JSON before showReveal /
 * curtainOwnsTap gates. Other funeral SKUs keep their deliberate ceremonies.
 */
export function resolveLiveRevealConfiguration(
  input: LiveRevealConfigurationInput
): LiveRevealConfiguration {
  const layout = input.layout?.trim() ?? null;
  const catalogSlug = input.catalogSlug?.trim() ?? null;
  const effectiveCatalogSlug = resolveEffectiveCatalogSlug({ catalogSlug, layout });

  const rawRevealMode =
    input.revealModeProp ?? input.studio?.revealMode ?? ("envelope" as RevealMode);

  const rawOpeningExperience: OpeningExperienceId =
    input.openingExperienceProp ??
    (input.experience?.openingExperience as OpeningExperienceId | undefined) ??
    mapLegacyRevealMode(rawRevealMode as RevealMode);

  const mandatoryMemorialEnvelope = shouldUseMandatoryMemorialEnvelope({
    catalogSlug,
    layout,
    collectionId: input.experience?.collectionId,
    rawOpeningExperience,
    rawRevealMode,
  });

  const isMemorialEnvelopeSku =
    mandatoryMemorialEnvelope || isCanonicalMemorialEnvelopeSku(effectiveCatalogSlug);

  let resolvedRevealMode = rawRevealMode as RevealMode;
  let resolvedOpeningExperience = rawOpeningExperience;

  if (mandatoryMemorialEnvelope) {
    resolvedRevealMode = "envelope";
    resolvedOpeningExperience = "wax-seal-black";
  } else if (isMemorialEnvelopeSku) {
    resolvedRevealMode = "envelope";
    resolvedOpeningExperience = "wax-seal-black";
  }

  const isFuneralCollection = resolveIsFuneralCollection({
    collectionId: input.experience?.collectionId,
    layout,
    eventTitle: input.eventTitle,
  });

  const revealEnabled = mandatoryMemorialEnvelope
    ? true
    : (input.revealEnabledProp ?? resolvedRevealMode !== "none");

  const showReveal = mandatoryMemorialEnvelope
    ? !input.skipReveal
    : resolveShowReveal({
        isFuneralCollection: isMemorialEnvelopeSku || isFuneralCollection,
        skipReveal: input.skipReveal,
        revealEnabled,
        openingExperience: resolvedOpeningExperience,
        revealMode: resolvedRevealMode,
      });

  const curtainOwnsTap = mandatoryMemorialEnvelope
    ? false
    : resolvedOpeningExperience.startsWith("curtain-");

  return {
    layout,
    catalogSlug,
    effectiveCatalogSlug,
    rawRevealMode,
    resolvedRevealMode,
    rawOpeningExperience,
    resolvedOpeningExperience,
    isFuneralCollection,
    isMemorialEnvelopeSku,
    mandatoryMemorialEnvelope,
    revealEnabled,
    showReveal,
    curtainOwnsTap,
  };
}

const LIVE_REVEAL_DIAG_ENABLED =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_CELEVENTIC_LIVE_REVEAL_DIAG === "1";

/** Dev / flagged diagnostic — no guest PII. */
export function logLiveRevealDiagnostic(
  config: LiveRevealConfiguration,
  extras?: {
    needsTapGate?: boolean;
    envelopeAutoOpen?: boolean;
  }
): void {
  if (!LIVE_REVEAL_DIAG_ENABLED) return;
  console.info("[live-reveal]", {
    layout: config.layout,
    catalogSlug: config.catalogSlug,
    effectiveCatalogSlug: config.effectiveCatalogSlug,
    rawRevealMode: config.rawRevealMode,
    resolvedRevealMode: config.resolvedRevealMode,
    rawOpeningExperience: config.rawOpeningExperience,
    resolvedOpeningExperience: config.resolvedOpeningExperience,
    isFuneralCollection: config.isFuneralCollection,
    isMemorialEnvelopeSku: config.isMemorialEnvelopeSku,
    mandatoryMemorialEnvelope: config.mandatoryMemorialEnvelope,
    showReveal: config.showReveal,
    needsTapGate: extras?.needsTapGate,
    envelopeAutoOpen: extras?.envelopeAutoOpen,
  });
}
