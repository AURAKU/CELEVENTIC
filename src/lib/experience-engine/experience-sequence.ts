/**
 * Default experience sequence builder from creative profile / DNA.
 */
import type { SceneTransitionId } from "@/lib/experience/experience-types";
import type { TemplateCreativeProfile } from "@/lib/invitation/template-creative-registry";
import type { ExperienceSceneDef, ExperienceSequenceDef } from "@/lib/experience-engine/types";
import { adaptSceneTransition } from "@/lib/experience-engine/legacy-adapters";
import {
  INVITATION_ACTION_KEYS,
  PRIMARY_QUICK_ACTION_KEYS,
  type InvitationActionKey,
} from "@/lib/invitation/guest-portal-actions";

const DEFAULT_SCENES: ExperienceSceneDef[] = [
  { id: "cover", label: "Cover", sectionId: "invitation", order: 0 },
  { id: "countdown", label: "Countdown", sectionId: "countdown", order: 1 },
  { id: "story", label: "Story", sectionId: "story", order: 2 },
  { id: "venue", label: "Venue", sectionId: "venue-map", order: 3 },
  { id: "gallery", label: "Gallery", sectionId: "gallery", order: 4 },
  { id: "rsvp", label: "RSVP", sectionId: "rsvp", order: 5 },
  { id: "outro", label: "Closing", order: 6 },
];

/** Parse "Cover → Seal → Couple → …" style architecture strings into scenes. */
export function parseSceneArchitecture(architecture?: string): ExperienceSceneDef[] {
  if (!architecture?.trim()) return DEFAULT_SCENES;
  const parts = architecture
    .split(/→|->|\|/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return DEFAULT_SCENES;

  return parts.map((label, order) => {
    const id = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const sectionGuess =
      /rsvp/i.test(label)
        ? "rsvp"
        : /venue|map|location/i.test(label)
          ? "venue-map"
          : /galler/i.test(label)
            ? "gallery"
            : /count/i.test(label)
              ? "countdown"
              : /story|letter|chapter/i.test(label)
                ? "story"
                : /gift|registry/i.test(label)
                  ? "gifts"
                  : /seat|pass|ticket/i.test(label)
                    ? "pass"
                    : /menu/i.test(label)
                      ? "menu"
                      : /memory|tribute|obituar/i.test(label)
                        ? "memory"
                        : order === 0
                          ? "invitation"
                          : undefined;
    return { id: id || `scene-${order}`, label, sectionId: sectionGuess, order };
  });
}

export function buildExperienceSequence(
  creative?: TemplateCreativeProfile | null,
  transition?: SceneTransitionId | string
): ExperienceSequenceDef {
  const scenes = parseSceneArchitecture(creative?.sceneArchitecture);
  return {
    id: creative?.catalogSlug ? `seq-${creative.catalogSlug}` : "seq-default",
    scenes,
    transition: adaptSceneTransition(transition ?? creative?.sceneTransition),
    pacingMs:
      creative?.motionProfile === "solemn"
        ? 1000
        : creative?.motionProfile === "playful" || creative?.motionProfile === "energetic"
          ? 420
          : 700,
  };
}

export function resolvePrimaryActions(
  creative?: TemplateCreativeProfile | null
): InvitationActionKey[] {
  if (creative?.primaryActions?.length) {
    const mapped = creative.primaryActions
      .map((k) => {
        const upper = k.toUpperCase().replace(/-/g, "_");
        if ((INVITATION_ACTION_KEYS as readonly string[]).includes(upper)) {
          return upper as InvitationActionKey;
        }
        // Alias common Phase 2 keys
        if (upper === "ADD_TO_CALENDAR") return "SAVE_DATE" as InvitationActionKey;
        if (upper === "FIND_SEAT") return "SEATING" as InvitationActionKey;
        if (upper === "TICKET") return "QR_PASS" as InvitationActionKey;
        return null;
      })
      .filter(Boolean) as InvitationActionKey[];
    if (mapped.length) return mapped;
  }
  return [...PRIMARY_QUICK_ACTION_KEYS];
}
