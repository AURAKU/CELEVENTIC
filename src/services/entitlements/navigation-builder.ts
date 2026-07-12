import type { EventType, EventStatus, UserRole } from "@prisma/client";
import { getBlueprint, getTerminology } from "@/lib/blueprints";
import type { WorkspaceNavigationItem } from "@/lib/blueprints/types";
import { entitlementService } from "./entitlement.service";

export type NavigationBuildInput = {
  eventId: string;
  eventType: EventType;
  packageName?: string | null;
  eventStatus?: EventStatus;
  userId: string;
  role: UserRole;
  enabledFeatures?: { featureKey: string; isEnabled: boolean; isLocked: boolean; requiredPlan?: string | null }[];
};

export async function buildWorkspaceNavigation(
  input: NavigationBuildInput
): Promise<WorkspaceNavigationItem[]> {
  const blueprint = getBlueprint(input.eventType);
  const featureStates = entitlementService.resolveFeatureStates(
    input.eventType,
    input.packageName,
    input.enabledFeatures
  );
  const stateMap = new Map(featureStates.map((s) => [s.featureKey, s]));

  const items: WorkspaceNavigationItem[] = [];

  for (const navDef of blueprint.navigation) {
    const state = stateMap.get(navDef.featureKey);
    const isHidden = blueprint.hiddenModules.includes(navDef.featureKey);

    if (isHidden) continue;

    const isLocked = state?.isLocked ?? false;
    const isEnabled = state?.isEnabled ?? blueprint.defaultModules.includes(navDef.featureKey);

    if (!isEnabled && !isLocked) continue;

    const entitlement = await entitlementService.canUseFeature({
      userId: input.userId,
      eventId: input.eventId,
      featureKey: navDef.featureKey,
      role: input.role,
    });

    if (!entitlement.allowed && !entitlement.locked && navDef.featureKey !== "OVERVIEW") {
      continue;
    }

    items.push({
      id: navDef.id,
      featureKey: navDef.featureKey,
      href: navDef.href(input.eventId),
      icon: navDef.icon,
      label: getTerminology(input.eventType, navDef.labelKey),
      isLocked: entitlement.locked || isLocked,
      requiredPlan: entitlement.requiredPlan ?? state?.requiredPlan,
      sortOrder: navDef.sortOrder,
    });
  }

  return items.sort((a, b) => a.sortOrder - b.sortOrder);
}
