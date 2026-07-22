/**
 * Preview / published parity helpers.
 * Preview must use the same renderer but suppress mutating side effects.
 */
import { isPreviewInvitationId as legacyIsPreviewInvitationId } from "@/lib/invitation/guest-portal-actions";

export interface PreviewModeInput {
  invitationId?: string | null;
  previewMode?: boolean;
  embedded?: boolean;
  skipAnalytics?: boolean;
  /** Explicit studio / catalog / live-preview flags */
  surface?: "live" | "studio" | "catalog" | "thumbnail" | "admin";
}

export interface PreviewModeState {
  isPreview: boolean;
  suppressSideEffects: boolean;
  suppressAnalytics: boolean;
  suppressRsvpSubmit: boolean;
  suppressMemoryUpload: boolean;
  suppressContribution: boolean;
  allowAudioPreview: boolean;
  allowCalendarDownload: boolean;
}

const PREVIEW_ID_PATTERNS = [
  /^preview/i,
  /preview-/i,
  /^studio-preview$/i,
  /^demo-/i,
  /^sample-/i,
  /^catalog-/i,
  /^thumb-/i,
];

/** Strengthened preview id detection (keeps legacy behavior + more surfaces). */
export function isPreviewInvitationId(id?: string | null): boolean {
  if (!id) return false;
  if (legacyIsPreviewInvitationId(id)) return true;
  return PREVIEW_ID_PATTERNS.some((re) => re.test(id));
}

export function resolvePreviewMode(input: PreviewModeInput): PreviewModeState {
  const byId = isPreviewInvitationId(input.invitationId);
  const byFlag = input.previewMode === true;
  const bySurface =
    input.surface === "studio" ||
    input.surface === "catalog" ||
    input.surface === "thumbnail" ||
    input.surface === "admin";

  const isPreview = byId || byFlag || bySurface;
  const suppressSideEffects = isPreview || input.skipAnalytics === true;

  return {
    isPreview,
    suppressSideEffects,
    suppressAnalytics: suppressSideEffects,
    suppressRsvpSubmit: isPreview,
    suppressMemoryUpload: isPreview,
    suppressContribution: isPreview,
    // Audio preview is intentional in studio/catalog; muted autoplay still allowed.
    allowAudioPreview: true,
    // Calendar ICS download is safe (no server mutation).
    allowCalendarDownload: true,
  };
}

export function shouldSuppressGuestSideEffect(
  invitationId: string | undefined,
  effect: "analytics" | "rsvp" | "memory" | "contribution" | "mutation"
): boolean {
  const mode = resolvePreviewMode({ invitationId });
  if (!mode.suppressSideEffects && effect === "mutation") return false;
  switch (effect) {
    case "analytics":
      return mode.suppressAnalytics;
    case "rsvp":
      return mode.suppressRsvpSubmit;
    case "memory":
      return mode.suppressMemoryUpload;
    case "contribution":
      return mode.suppressContribution;
    case "mutation":
      return mode.suppressSideEffects;
    default:
      return false;
  }
}
