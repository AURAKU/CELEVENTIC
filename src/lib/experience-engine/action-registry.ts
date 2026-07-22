/**
 * Central Action Registry — extends guest-portal-actions with aliases + validation.
 * Canonical keys remain InvitationActionKey; aliases resolve before resolveGuestPortalActions.
 */
import {
  ACTION_LABELS,
  INVITATION_ACTION_KEYS,
  isPreviewInvitationId,
  pickPrimaryActions,
  resolveGuestPortalActions,
  type GuestPortalActionContext,
  type GuestPortalActionHandlers,
  type InvitationActionKey,
  type ResolvedGuestAction,
} from "@/lib/invitation/guest-portal-actions";
import { resolvePreviewMode } from "@/lib/experience-engine/preview-mode";

/** Extended action vocabulary requested by Experience Engine Phase 2. */
export const EXPERIENCE_ACTION_KEYS = [
  ...INVITATION_ACTION_KEYS,
  "ADD_TO_CALENDAR",
  "FIND_SEAT",
  "TICKET",
] as const;

export type ExperienceActionKey = (typeof EXPERIENCE_ACTION_KEYS)[number];

/** Aliases → canonical InvitationActionKey used by resolveGuestPortalActions. */
export const ACTION_ALIASES: Record<string, InvitationActionKey> = {
  ADD_TO_CALENDAR: "SAVE_DATE",
  FIND_SEAT: "SEATING",
  TICKET: "QR_PASS",
  MY_SEAT: "SEATING",
  DIRECTIONS: "LOCATION",
  MAP: "LOCATION",
  GIFT: "CONTRIBUTION",
  REGISTRY: "CONTRIBUTION",
  MEMORIES: "MEMORY_UPLOAD",
  MUTE: "AUDIO_TOGGLE",
  UNMUTE: "AUDIO_TOGGLE",
};

export function canonicalizeActionKey(key: string): InvitationActionKey | null {
  const upper = key.toUpperCase().replace(/-/g, "_");
  if (ACTION_ALIASES[upper]) return ACTION_ALIASES[upper];
  if ((INVITATION_ACTION_KEYS as readonly string[]).includes(upper)) {
    return upper as InvitationActionKey;
  }
  return null;
}

export interface ActionValidationContext {
  invitationId?: string;
  eventId?: string;
  guestId?: string;
  isPreview?: boolean;
  permissions?: {
    canRsvp?: boolean;
    canUploadMemory?: boolean;
    canContribute?: boolean;
    canViewSeating?: boolean;
    canViewTicket?: boolean;
  };
  entitlements?: {
    seating?: boolean;
    qrPass?: boolean;
    memoryVault?: boolean;
    menu?: boolean;
    gallery?: boolean;
  };
  requiredData?: Partial<
    Record<
      InvitationActionKey,
      {
        hasLocation?: boolean;
        hasCalendar?: boolean;
        hasPhone?: boolean;
        hasEmail?: boolean;
        hasGallery?: boolean;
        hasMenu?: boolean;
        hasRegistry?: boolean;
        hasSeatUrl?: boolean;
        hasQr?: boolean;
        hasAudio?: boolean;
      }
    >
  >;
}

export interface ActionValidationResult {
  key: InvitationActionKey;
  allowed: boolean;
  reason?: string;
  previewSuppressed?: boolean;
}

export function validateExperienceAction(
  rawKey: string,
  ctx: ActionValidationContext
): ActionValidationResult {
  const key = canonicalizeActionKey(rawKey);
  if (!key) {
    return { key: "SHARE", allowed: false, reason: `Unknown action: ${rawKey}` };
  }

  const preview = resolvePreviewMode({
    invitationId: ctx.invitationId,
    previewMode: ctx.isPreview,
  });

  const perms = ctx.permissions ?? {};
  const ents = ctx.entitlements ?? {};

  if (!ctx.invitationId && !ctx.isPreview) {
    return { key, allowed: false, reason: "Invitation context required" };
  }

  switch (key) {
    case "RSVP":
      if (preview.suppressRsvpSubmit) {
        return {
          key,
          allowed: true,
          previewSuppressed: true,
          reason: "RSVP submits on the published invitation link",
        };
      }
      if (perms.canRsvp === false) {
        return { key, allowed: false, reason: "RSVP not permitted for this guest" };
      }
      break;
    case "SEATING":
      if (ents.seating === false || perms.canViewSeating === false) {
        return { key, allowed: false, reason: "Seating not available" };
      }
      break;
    case "QR_PASS":
      if (ents.qrPass === false || perms.canViewTicket === false) {
        return { key, allowed: false, reason: "Ticket / QR pass not available" };
      }
      break;
    case "MEMORY_UPLOAD":
      // Catalog previews may provision a real demo Album URL — allow tap-through when vault is entitled
      if (preview.suppressMemoryUpload && ents.memoryVault !== true) {
        return {
          key,
          allowed: true,
          previewSuppressed: true,
          reason: "Memory upload available on published invitation",
        };
      }
      if (ents.memoryVault === false || perms.canUploadMemory === false) {
        return { key, allowed: false, reason: "Memory vault not enabled" };
      }
      break;
    case "CONTRIBUTION":
      if (preview.suppressContribution) {
        return {
          key,
          allowed: true,
          previewSuppressed: true,
          reason: "Contributions available on published invitation",
        };
      }
      if (perms.canContribute === false) {
        return { key, allowed: false, reason: "Contributions not available" };
      }
      break;
    case "MENU":
      if (ents.menu === false) {
        return { key, allowed: false, reason: "Menu not available" };
      }
      break;
    case "GALLERY":
      if (ents.gallery === false) {
        return { key, allowed: false, reason: "Gallery not available" };
      }
      break;
    default:
      break;
  }

  const data = ctx.requiredData?.[key];
  if (data) {
    const missing = validateRequiredData(key, data);
    if (missing) {
      return { key, allowed: false, reason: missing };
    }
  }

  return { key, allowed: true, previewSuppressed: isPreviewInvitationId(ctx.invitationId) };
}

function validateRequiredData(
  key: InvitationActionKey,
  data: NonNullable<ActionValidationContext["requiredData"]>[InvitationActionKey]
): string | null {
  if (!data) return null;
  switch (key) {
    case "LOCATION":
      if (data.hasLocation === false) return "Location not added yet";
      break;
    case "SAVE_DATE":
      if (data.hasCalendar === false) return "Event date not set";
      break;
    case "CALL":
    case "WHATSAPP":
      if (data.hasPhone === false) return "Phone number not available";
      break;
    case "EMAIL":
      if (data.hasEmail === false) return "Email not available";
      break;
    case "GALLERY":
      if (data.hasGallery === false) return "Gallery is empty";
      break;
    case "MENU":
      if (data.hasMenu === false) return "Menu not available";
      break;
    case "CONTRIBUTION":
      if (data.hasRegistry === false) return "Gift registry not available";
      break;
    case "SEATING":
      if (data.hasSeatUrl === false) return "Seat lookup not available";
      break;
    case "QR_PASS":
      if (data.hasQr === false) return "QR pass not available";
      break;
    case "AUDIO_TOGGLE":
      if (data.hasAudio === false) return "No audio on this invitation";
      break;
    default:
      break;
  }
  return null;
}

export function resolveExperienceActions(
  ctx: GuestPortalActionContext,
  handlers: GuestPortalActionHandlers,
  validation?: ActionValidationContext
): ResolvedGuestAction[] {
  const actions = resolveGuestPortalActions(ctx, handlers);
  if (!validation) return actions;

  return actions
    .map((action) => {
      const result = validateExperienceAction(action.key, {
        ...validation,
        invitationId: validation.invitationId,
        isPreview: validation.isPreview ?? ctx.isPreview,
      });
      if (!result.allowed) {
        return {
          ...action,
          kind: "disabled" as const,
          disabled: true,
          disabledReason: result.reason,
          onClick: undefined,
          href: undefined,
        };
      }
      if (result.previewSuppressed && (action.key === "RSVP" || action.key === "MEMORY_UPLOAD")) {
        return {
          ...action,
          disabled: true,
          disabledReason: result.reason ?? action.disabledReason,
        };
      }
      return action;
    })
    .filter((a) => a.visible);
}

export function getActionLabel(key: ExperienceActionKey | string): string {
  const canonical = canonicalizeActionKey(key);
  if (!canonical) return key;
  if (key.toUpperCase() === "ADD_TO_CALENDAR") return "Add to Calendar";
  if (key.toUpperCase() === "FIND_SEAT") return "Find Seat";
  if (key.toUpperCase() === "TICKET") return "Ticket";
  return ACTION_LABELS[canonical]?.label ?? canonical;
}

/**
 * Studio button family → Action Registry mapping.
 * Studio keeps short ids in designConfig; runtime resolves via registry labels.
 */
export const STUDIO_BUTTON_ACTION_OPTIONS = [
  { id: "rsvp", registryKey: "RSVP", label: "RSVP" },
  { id: "calendar", registryKey: "SAVE_DATE", label: "Save Date" },
  { id: "maps", registryKey: "LOCATION", label: "Directions" },
  { id: "share", registryKey: "SHARE", label: "Share" },
  { id: "gifts", registryKey: "CONTRIBUTION", label: "Gift" },
  { id: "gallery", registryKey: "GALLERY", label: "Gallery" },
  { id: "story", registryKey: null, label: "Our story" },
  { id: "none", registryKey: null, label: "Hidden" },
] as const;

export type StudioMappedButtonActionId = (typeof STUDIO_BUTTON_ACTION_OPTIONS)[number]["id"];

export function studioButtonActionLabel(id: string): string {
  const opt = STUDIO_BUTTON_ACTION_OPTIONS.find((o) => o.id === id);
  if (!opt) return id;
  if (opt.registryKey) return getActionLabel(opt.registryKey);
  return opt.label;
}

/** Valid Studio button action ids (including story/none which skip registry). */
export const STUDIO_BUTTON_ACTION_IDS = STUDIO_BUTTON_ACTION_OPTIONS.map((o) => o.id);

export function isStudioButtonActionMapped(id: string | undefined | null): boolean {
  if (!id) return false;
  return (STUDIO_BUTTON_ACTION_IDS as readonly string[]).includes(id);
}

/**
 * Resolve Studio primary/secondary/tertiary button mapping into dock actions.
 * Unmapped or unknown ids are skipped (publish validation blocks those).
 * Falls back to default primary quick actions when no mapping is set.
 */
export function pickActionsFromStudioMapping(
  actions: ResolvedGuestAction[],
  mapping?: {
    primary?: string;
    secondary?: string;
    tertiary?: string;
  } | null
): ResolvedGuestAction[] {
  if (!mapping?.primary && !mapping?.secondary && !mapping?.tertiary) {
    return pickPrimaryActions(actions);
  }
  const byKey = new Map(actions.map((a) => [a.key, a]));
  const ordered: ResolvedGuestAction[] = [];
  const seen = new Set<string>();

  for (const slot of [mapping.primary, mapping.secondary, mapping.tertiary] as const) {
    if (!slot || slot === "none") continue;
    const opt = STUDIO_BUTTON_ACTION_OPTIONS.find((o) => o.id === slot);
    if (!opt) continue;
    if (opt.registryKey) {
      const action = byKey.get(opt.registryKey as InvitationActionKey);
      if (action && !seen.has(action.key)) {
        ordered.push(action);
        seen.add(action.key);
      }
      continue;
    }
    // "story" — prefer STORY scroll action if present in resolved set
    if (slot === "story") {
      const story = actions.find((a) => a.key === ("STORY" as InvitationActionKey));
      if (story && !seen.has(story.key)) {
        ordered.push(story);
        seen.add(story.key);
      }
    }
  }

  return ordered.length > 0 ? ordered : pickPrimaryActions(actions);
}

export { INVITATION_ACTION_KEYS, ACTION_LABELS, resolveGuestPortalActions };
