import { FeatureKey } from "@/lib/blueprints/feature-keys";

/**
 * Shared Invitation Feature Layer — guest-facing feature registry.
 *
 * These are the sections a guest can see on an invitation / post-admission
 * portal. Each maps (where one exists) to a platform `FeatureKey` so the
 * existing EntitlementService remains the source of truth for event-level
 * enablement; guest-only keys (no platform entitlement) fall back to their
 * platform default. Presentation is supplied separately by a template adapter.
 *
 * Design rule: defaults here reproduce today's behaviour so existing live
 * invitations render identically until an organiser overrides something.
 */
export const GuestFeatureKey = {
  ENTRY_PASS: "ENTRY_PASS",
  MANUAL_ADMISSION_CODE: "MANUAL_ADMISSION_CODE",
  PARTY_ADMISSION: "PARTY_ADMISSION",
  POST_ADMISSION_PORTAL: "POST_ADMISSION_PORTAL",
  SEATING_REVEAL: "SEATING_REVEAL",
  MEMORY_VAULT: "MEMORY_VAULT",
  GIFT_WALLET: "GIFT_WALLET",
  EVENT_MENU: "EVENT_MENU",
  LIVE_PROGRAMME: "LIVE_PROGRAMME",
  EVENT_SERVICES: "EVENT_SERVICES",
  ANNOUNCEMENTS: "ANNOUNCEMENTS",
  GUEST_HELP: "GUEST_HELP",
  AUDIO: "AUDIO",
  RSVP: "RSVP",
  MAP_DIRECTIONS: "MAP_DIRECTIONS",
  COUNTDOWN: "COUNTDOWN",
} as const;

export type GuestFeatureKey = (typeof GuestFeatureKey)[keyof typeof GuestFeatureKey];

export interface InvitationFeatureDefault {
  key: GuestFeatureKey;
  label: string;
  /** True for post-admission-only sections (locked until admitted). */
  postAdmissionOnly: boolean;
  /** Platform behaviour when nothing overrides it. */
  enabledByDefault: boolean;
  /** Lower renders first. Organisers can override per invitation/event. */
  defaultOrder: number;
  /** Platform entitlement gate, when one exists. Undefined = guest-only. */
  entitlementKey?: FeatureKey;
  /** Schema version for forward-safe config migration. */
  version: number;
}

/** Platform defaults — layer 1 of the inheritance chain. */
export const INVITATION_FEATURE_DEFAULTS: Record<GuestFeatureKey, InvitationFeatureDefault> = {
  RSVP: { key: "RSVP", label: "RSVP", postAdmissionOnly: false, enabledByDefault: true, defaultOrder: 10, entitlementKey: FeatureKey.RSVP, version: 1 },
  COUNTDOWN: { key: "COUNTDOWN", label: "Countdown", postAdmissionOnly: false, enabledByDefault: true, defaultOrder: 20, version: 1 },
  MAP_DIRECTIONS: { key: "MAP_DIRECTIONS", label: "Directions", postAdmissionOnly: false, enabledByDefault: true, defaultOrder: 30, version: 1 },
  AUDIO: { key: "AUDIO", label: "Music", postAdmissionOnly: false, enabledByDefault: false, defaultOrder: 40, version: 1 },
  ENTRY_PASS: { key: "ENTRY_PASS", label: "Guest Entry Pass", postAdmissionOnly: false, enabledByDefault: false, defaultOrder: 50, entitlementKey: FeatureKey.QR_ADMISSION, version: 1 },
  MANUAL_ADMISSION_CODE: { key: "MANUAL_ADMISSION_CODE", label: "Admission Code", postAdmissionOnly: false, enabledByDefault: false, defaultOrder: 55, entitlementKey: FeatureKey.QR_ADMISSION, version: 1 },
  PARTY_ADMISSION: { key: "PARTY_ADMISSION", label: "Party Admission", postAdmissionOnly: false, enabledByDefault: false, defaultOrder: 56, entitlementKey: FeatureKey.QR_ADMISSION, version: 1 },
  POST_ADMISSION_PORTAL: { key: "POST_ADMISSION_PORTAL", label: "Event Companion", postAdmissionOnly: true, enabledByDefault: false, defaultOrder: 60, version: 1 },
  SEATING_REVEAL: { key: "SEATING_REVEAL", label: "My Seat", postAdmissionOnly: true, enabledByDefault: true, defaultOrder: 70, entitlementKey: FeatureKey.SEATING, version: 1 },
  LIVE_PROGRAMME: { key: "LIVE_PROGRAMME", label: "Programme", postAdmissionOnly: true, enabledByDefault: false, defaultOrder: 80, entitlementKey: FeatureKey.TIMELINE, version: 1 },
  EVENT_MENU: { key: "EVENT_MENU", label: "Menu", postAdmissionOnly: true, enabledByDefault: false, defaultOrder: 90, entitlementKey: FeatureKey.MENU, version: 1 },
  MEMORY_VAULT: { key: "MEMORY_VAULT", label: "Memories", postAdmissionOnly: true, enabledByDefault: true, defaultOrder: 100, entitlementKey: FeatureKey.MEMORY_VAULT, version: 1 },
  GIFT_WALLET: { key: "GIFT_WALLET", label: "Send a Gift", postAdmissionOnly: true, enabledByDefault: false, defaultOrder: 110, entitlementKey: FeatureKey.CONTRIBUTIONS, version: 1 },
  EVENT_SERVICES: { key: "EVENT_SERVICES", label: "Event Services", postAdmissionOnly: true, enabledByDefault: false, defaultOrder: 120, version: 1 },
  ANNOUNCEMENTS: { key: "ANNOUNCEMENTS", label: "Announcements", postAdmissionOnly: true, enabledByDefault: false, defaultOrder: 130, version: 1 },
  GUEST_HELP: { key: "GUEST_HELP", label: "Help", postAdmissionOnly: true, enabledByDefault: true, defaultOrder: 140, version: 1 },
};

export const ALL_GUEST_FEATURE_KEYS = Object.keys(INVITATION_FEATURE_DEFAULTS) as GuestFeatureKey[];

/** A sparse per-invitation or per-event override. Absent fields inherit. */
export interface FeatureOverride {
  enabled?: boolean;
  order?: number;
  config?: Record<string, unknown>;
}

export interface ResolvedFeature {
  key: GuestFeatureKey;
  label: string;
  enabled: boolean;
  order: number;
  postAdmissionOnly: boolean;
  config: Record<string, unknown>;
  version: number;
  /** Where the final `enabled` value came from — for audit/debug. */
  source: "invitation" | "event" | "default";
}

/**
 * Pure resolution for a single feature (inheritance: invitation → event → default).
 * `eventEnabled` is `undefined` when the event neither enables nor disables it
 * (i.e. inherit the platform default).
 */
export function resolveFeatureState(
  def: InvitationFeatureDefault,
  eventEnabled: boolean | undefined,
  invitationOverride?: FeatureOverride | null
): ResolvedFeature {
  let enabled: boolean;
  let source: ResolvedFeature["source"];
  if (invitationOverride?.enabled != null) {
    enabled = invitationOverride.enabled;
    source = "invitation";
  } else if (eventEnabled != null) {
    enabled = eventEnabled;
    source = "event";
  } else {
    enabled = def.enabledByDefault;
    source = "default";
  }

  return {
    key: def.key,
    label: def.label,
    enabled,
    order: invitationOverride?.order ?? def.defaultOrder,
    postAdmissionOnly: def.postAdmissionOnly,
    config: invitationOverride?.config ?? {},
    version: def.version,
    source,
  };
}

/**
 * Resolve every guest feature into an ordered array.
 * @param eventFlags  per-key event enablement (from EntitlementService / addons); missing = inherit default
 * @param invitationOverrides sparse per-key invitation overrides
 */
export function resolveAllFeatureStates(
  eventFlags: Partial<Record<GuestFeatureKey, boolean>>,
  invitationOverrides: Partial<Record<GuestFeatureKey, FeatureOverride>> = {}
): ResolvedFeature[] {
  return ALL_GUEST_FEATURE_KEYS.map((key) =>
    resolveFeatureState(
      INVITATION_FEATURE_DEFAULTS[key],
      eventFlags[key],
      invitationOverrides[key]
    )
  ).sort((a, b) => a.order - b.order);
}
