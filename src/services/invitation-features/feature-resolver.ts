import { prisma } from "@/lib/prisma";
import { entitlementService } from "@/services/entitlements/entitlement.service";
import {
  ALL_GUEST_FEATURE_KEYS,
  INVITATION_FEATURE_DEFAULTS,
  resolveAllFeatureStates,
  type FeatureOverride,
  type GuestFeatureKey,
  type ResolvedFeature,
} from "@/lib/invitation-features/registry";

/**
 * Shared Invitation Feature Layer — DB-backed resolver.
 *
 * Combines the three inheritance levels into an ordered, guest-safe feature map:
 *   invitation override (Invitation.featureConfig)
 *   → event config (EntitlementService / EventEnabledFeature)
 *   → platform default (INVITATION_FEATURE_DEFAULTS)
 *
 * Delegates event-level enablement to the existing EntitlementService so there is
 * a single source of truth; this layer only adds the per-invitation override level,
 * guest-only keys, and ordering. Returns exactly today's behaviour when nothing is
 * overridden.
 */

type InvitationForFeatures = {
  id: string;
  eventId: string;
  postAdmissionEnabled: boolean;
  featureConfig: unknown;
};

function parseOverrides(featureConfig: unknown): Partial<Record<GuestFeatureKey, FeatureOverride>> {
  if (!featureConfig || typeof featureConfig !== "object") return {};
  const raw = featureConfig as Record<string, unknown>;
  const out: Partial<Record<GuestFeatureKey, FeatureOverride>> = {};
  for (const key of ALL_GUEST_FEATURE_KEYS) {
    const v = raw[key];
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      out[key] = {
        enabled: typeof o.enabled === "boolean" ? o.enabled : undefined,
        order: typeof o.order === "number" ? o.order : undefined,
        config: o.config && typeof o.config === "object" ? (o.config as Record<string, unknown>) : undefined,
      };
    }
  }
  return out;
}

/** Build the per-key event enablement map from EventEnabledFeature rows. */
function buildEventFlags(
  enabledRows: { featureKey: string; isEnabled: boolean }[]
): Partial<Record<GuestFeatureKey, boolean>> {
  const byEntitlement = new Map(enabledRows.map((r) => [r.featureKey, r.isEnabled]));
  const flags: Partial<Record<GuestFeatureKey, boolean>> = {};
  for (const key of ALL_GUEST_FEATURE_KEYS) {
    const ent = INVITATION_FEATURE_DEFAULTS[key].entitlementKey;
    if (ent && byEntitlement.has(ent)) {
      flags[key] = byEntitlement.get(ent);
    }
  }
  return flags;
}

/** Pure combine — exposed for tests without a DB. */
export function combineFeatureStates(
  invitation: Pick<InvitationForFeatures, "postAdmissionEnabled" | "featureConfig">,
  enabledRows: { featureKey: string; isEnabled: boolean }[]
): ResolvedFeature[] {
  const overrides = parseOverrides(invitation.featureConfig);
  // The post-admission portal's enablement is a first-class invitation flag.
  overrides.POST_ADMISSION_PORTAL = {
    ...overrides.POST_ADMISSION_PORTAL,
    enabled: overrides.POST_ADMISSION_PORTAL?.enabled ?? invitation.postAdmissionEnabled,
  };
  return resolveAllFeatureStates(buildEventFlags(enabledRows), overrides);
}

/** Full DB resolution for one invitation. */
export async function resolveInvitationFeatures(invitationId: string): Promise<ResolvedFeature[]> {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    select: { id: true, eventId: true, postAdmissionEnabled: true, featureConfig: true },
  });
  if (!invitation) return [];
  const enabledRows = await entitlementService.getEnabledFeatures(invitation.eventId);
  return combineFeatureStates(invitation, enabledRows);
}

/** Convenience: resolve a single feature's enabled state (server-side gate). */
export async function isInvitationFeatureEnabled(
  invitationId: string,
  key: GuestFeatureKey
): Promise<boolean> {
  const features = await resolveInvitationFeatures(invitationId);
  return features.find((f) => f.key === key)?.enabled ?? false;
}
