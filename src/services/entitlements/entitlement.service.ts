import { prisma } from "@/lib/prisma";
import type { EventType, UserRole } from "@prisma/client";
import { getBlueprint } from "@/lib/blueprints/registry";
import type { FeatureEntitlementResult } from "@/lib/blueprints/types";
import { resolveEventAccess } from "@/lib/workspace/event-access";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import { normalizePackageFeatureKeys } from "@/lib/packages/feature-catalog";
import { hasFullPackageAccess } from "@/lib/access/package-access";

export type EntitlementInput = {
  userId: string;
  eventId: string;
  featureKey: string;
  role?: UserRole;
};

const FEATURE_TO_PERMISSION: Partial<Record<string, string>> = {
  INVITATIONS: EventPermissionKey.EDIT_INVITATIONS,
  GUEST_LIST: EventPermissionKey.MANAGE_GUESTS,
  SEATING: EventPermissionKey.EDIT_SEATING,
  TICKETING: EventPermissionKey.MANAGE_TICKETS,
  QR_ADMISSION: EventPermissionKey.SCAN_QR,
  EVENT_WALLET: EventPermissionKey.MANAGE_FINANCES,
  MEMORY_VAULT: EventPermissionKey.MANAGE_MEMORY_VAULT,
  COLLABORATORS: EventPermissionKey.MANAGE_COLLABORATORS,
  VENDORS: EventPermissionKey.APPROVE_VENDORS,
  COMMUNICATIONS: EventPermissionKey.MANAGE_COMMUNICATIONS,
  ANALYTICS: EventPermissionKey.VIEW_ANALYTICS,
  GALLERY: EventPermissionKey.UPLOAD_GALLERY,
  TIMELINE: EventPermissionKey.EDIT_TIMELINE,
};

function inferPlanTier(packageName?: string | null): "starter" | "premium" | "elite" | "free" {
  if (!packageName) return "free";
  const n = packageName.toLowerCase();
  if (n.includes("elite") || n.includes("pro") || n.includes("ultimate")) return "elite";
  if (n.includes("premium") || n.includes("plus") || n.includes("standard")) return "premium";
  if (n.includes("essential") || n.includes("starter") || n.includes("basic")) return "starter";
  return "starter";
}

export class EntitlementService {
  async getEnabledFeatures(eventId: string) {
    const rows = await prisma.eventEnabledFeature.findMany({
      where: { eventId },
      orderBy: { sortOrder: "asc" },
    });
    return rows;
  }

  async canUseFeature(input: EntitlementInput): Promise<FeatureEntitlementResult> {
    const event = await prisma.event.findUnique({
      where: { id: input.eventId },
      include: {
        package: { include: { packageFeatures: true } },
        enabledFeatures: true,
        addons: true,
        workspace: true,
      },
    });

    if (!event) return { allowed: false, locked: true, reason: "Event not found" };

    const blueprint = getBlueprint(event.eventType);

    if (blueprint.hiddenModules.includes(input.featureKey as never)) {
      return { allowed: false, locked: true, reason: "Not available for this event type" };
    }

    // Platform admins: every package feature unlocked (still requires event access).
    if (hasFullPackageAccess(input.role)) {
      const ctx = await resolveEventAccess(input.eventId, input.userId, input.role!);
      if (!ctx) return { allowed: false, locked: true, reason: "No event access" };
      return { allowed: true, locked: false };
    }

    if (input.featureKey === "OVERVIEW" || input.featureKey === "SETTINGS") {
      if (input.role) {
        const ctx = await resolveEventAccess(input.eventId, input.userId, input.role);
        if (!ctx) return { allowed: false, locked: true, reason: "No event access" };
      }
      return { allowed: true, locked: false };
    }

    if (input.role) {
      const perm = FEATURE_TO_PERMISSION[input.featureKey];
      if (perm) {
        const ctx = await resolveEventAccess(input.eventId, input.userId, input.role);
        if (!ctx?.permissions.has(perm) && !ctx?.permissions.has(EventPermissionKey.VIEW_EVENT)) {
          if (!ctx) return { allowed: false, locked: true, reason: "No event access" };
        }
        if (perm && ctx && !ctx.permissions.has(perm) && input.featureKey !== "OVERVIEW") {
          return { allowed: false, locked: true, reason: "Insufficient permissions" };
        }
      }
    }

    const featureRow = event.enabledFeatures.find((f) => f.featureKey === input.featureKey);

    if (featureRow) {
      if (!featureRow.isEnabled) {
        return {
          allowed: false,
          locked: featureRow.isLocked,
          requiredPlan: featureRow.requiredPlan ?? undefined,
          reason: "Feature disabled",
        };
      }
      if (featureRow.isLocked) {
        return {
          allowed: false,
          locked: true,
          requiredPlan: featureRow.requiredPlan ?? undefined,
          reason: "Upgrade required",
        };
      }
      return { allowed: true, locked: false };
    }

    const addonFeatures = event.addons.flatMap((a) => {
      const keys = Array.isArray(a.featureKeys) ? (a.featureKeys as string[]) : [];
      return keys;
    });
    if (addonFeatures.includes(input.featureKey)) {
      return { allowed: true, locked: false };
    }

    const rowIncluded = event.package?.packageFeatures?.some(
      (f) => f.featureKey === input.featureKey && f.isIncluded
    );
    if (rowIncluded) {
      return { allowed: true, locked: false };
    }

    const pkgFeatures = normalizePackageFeatureKeys(event.package?.features);
    if (pkgFeatures.includes(input.featureKey)) {
      return { allowed: true, locked: false };
    }

    const tier = inferPlanTier(event.package?.name);
    const tierFeatures =
      tier === "elite"
        ? [...blueprint.starterFeatures, ...blueprint.premiumFeatures, ...blueprint.eliteFeatures]
        : tier === "premium"
          ? [...blueprint.starterFeatures, ...blueprint.premiumFeatures]
          : tier === "starter"
            ? [...blueprint.starterFeatures]
            : [...blueprint.defaultModules];

    if (tierFeatures.includes(input.featureKey as never)) {
      return { allowed: true, locked: false };
    }

    const isOptional = blueprint.optionalModules.includes(input.featureKey as never);
    if (isOptional) {
      const requiredPlan = blueprint.premiumFeatures.includes(input.featureKey as never)
        ? "premium"
        : blueprint.eliteFeatures.includes(input.featureKey as never)
          ? "elite"
          : "premium";
      return { allowed: false, locked: true, requiredPlan, reason: "Not included in current plan" };
    }

    if (blueprint.defaultModules.includes(input.featureKey as never)) {
      return { allowed: true, locked: false };
    }

    return { allowed: false, locked: true, reason: "Feature not available" };
  }

  resolveFeatureStates(
    eventType: EventType,
    packageName?: string | null,
    dbFeatures?: {
      featureKey: string;
      isEnabled: boolean;
      isLocked: boolean;
      requiredPlan?: string | null;
    }[],
    options?: { unlockAll?: boolean }
  ) {
    const blueprint = getBlueprint(eventType);
    const allRelevant = [...blueprint.defaultModules, ...blueprint.optionalModules];

    if (options?.unlockAll) {
      return allRelevant.map((featureKey) => ({
        featureKey,
        isEnabled: true,
        isLocked: false,
        requiredPlan: undefined as string | undefined,
      }));
    }

    const tier = inferPlanTier(packageName);
    const states: {
      featureKey: string;
      isEnabled: boolean;
      isLocked: boolean;
      requiredPlan?: string;
    }[] = [];

    for (const key of allRelevant) {
      const db = dbFeatures?.find((f) => f.featureKey === key);
      if (db) {
        states.push({
          featureKey: key,
          isEnabled: db.isEnabled,
          isLocked: db.isLocked,
          requiredPlan: db.requiredPlan ?? undefined,
        });
        continue;
      }

      const inStarter = blueprint.starterFeatures.includes(key);
      const inPremium = blueprint.premiumFeatures.includes(key);
      const inElite = blueprint.eliteFeatures.includes(key);

      let isEnabled = blueprint.defaultModules.includes(key);
      let isLocked = false;
      let requiredPlan: string | undefined;

      if (tier === "elite") {
        isEnabled = inStarter || inPremium || inElite || isEnabled;
      } else if (tier === "premium") {
        isEnabled = inStarter || inPremium || isEnabled;
        if (inElite && !inPremium && !inStarter) {
          isEnabled = false;
          isLocked = true;
          requiredPlan = "elite";
        }
      } else if (tier === "starter" || tier === "free") {
        isEnabled = inStarter || (tier === "starter" && isEnabled);
        if ((inPremium || inElite) && !inStarter) {
          isEnabled = false;
          isLocked = true;
          requiredPlan = inElite && !inPremium ? "elite" : "premium";
        }
      }

      states.push({ featureKey: key, isEnabled, isLocked, requiredPlan });
    }

    return states;
  }
}

export const entitlementService = new EntitlementService();
