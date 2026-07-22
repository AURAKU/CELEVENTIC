/**
 * Legacy compatibility adapters — map old reveal / motion / action ids
 * onto Experience Engine contracts without breaking published invitations.
 */
import type { OpeningExperienceId, SceneTransitionId } from "@/lib/experience/experience-types";
import { mapLegacyRevealMode } from "@/lib/experience/opening-experiences";
import type { RevealMode } from "@/lib/invitation-studio/studio-types";
import type { MotionProfileId } from "@/lib/invitation-theme/theme-types";
import type { MotionLanguage } from "@/lib/invitation/template-creative-registry";
import { canonicalizeActionKey } from "@/lib/experience-engine/action-registry";
import {
  getRevealContractForOpening,
  revealMechanicFromOpening,
} from "@/lib/experience-engine/interactive-reveal-contract";
import type { RevealMechanicId } from "@/lib/experience-engine/types";
import { motionLanguageToThemeProfile } from "@/lib/experience-engine/motion-language-profiles";

/** Studio RevealMode → OpeningExperienceId (existing mapLegacyRevealMode). */
export function adaptLegacyRevealMode(mode: RevealMode | string | undefined): OpeningExperienceId {
  return mapLegacyRevealMode((mode as RevealMode) ?? "envelope");
}

export function adaptLegacyRevealToMechanic(
  mode: RevealMode | string | undefined
): RevealMechanicId {
  return revealMechanicFromOpening(adaptLegacyRevealMode(mode));
}

/** Theme MotionProfileId → creative MotionLanguage (best-effort). */
export function adaptThemeMotionToLanguage(id: MotionProfileId | undefined): MotionLanguage {
  switch (id) {
    case "solemn":
      return "solemn";
    case "layered-drift":
      return "cinematic";
    case "gentle-drift":
      return "romantic";
    case "still":
    default:
      return "minimal";
  }
}

/** Creative MotionLanguage → theme MotionProfileId for DriftLayer / useParallax. */
export function adaptLanguageToThemeMotion(language: MotionLanguage | string | undefined): MotionProfileId {
  return motionLanguageToThemeProfile(language);
}

/** Unknown transition strings fall back to fade. */
export function adaptSceneTransition(id: string | undefined): SceneTransitionId {
  const allowed: SceneTransitionId[] = ["fade", "slide", "curtain", "door", "book", "sparkle"];
  if (id && (allowed as string[]).includes(id)) return id as SceneTransitionId;
  return "fade";
}

/** Button / CTA labels from older templates → canonical action keys. */
export function adaptLegacyActionLabel(label: string): string | null {
  const normalized = label.trim().toLowerCase();
  const map: Record<string, string> = {
    rsvp: "RSVP",
    "save the date": "SAVE_DATE",
    "save date": "SAVE_DATE",
    "add to calendar": "ADD_TO_CALENDAR",
    directions: "LOCATION",
    location: "LOCATION",
    map: "LOCATION",
    share: "SHARE",
    "copy link": "COPY_LINK",
    "qr pass": "QR_PASS",
    ticket: "TICKET",
    "my seat": "FIND_SEAT",
    seating: "FIND_SEAT",
    "find seat": "FIND_SEAT",
    menu: "MENU",
    gallery: "GALLERY",
    gift: "CONTRIBUTION",
    registry: "CONTRIBUTION",
    memories: "MEMORY_UPLOAD",
    call: "CALL",
    email: "EMAIL",
    whatsapp: "WHATSAPP",
    replay: "REPLAY",
    mute: "AUDIO_TOGGLE",
    unmute: "AUDIO_TOGGLE",
  };
  const aliased = map[normalized];
  if (!aliased) return null;
  return canonicalizeActionKey(aliased);
}

export function adaptOpeningToRevealContract(opening: OpeningExperienceId | string | undefined) {
  return getRevealContractForOpening(opening);
}
