import type { EventType } from "@prisma/client";
import type { FeatureKey } from "./feature-keys";

export type NavItemDef = {
  id: string;
  featureKey: FeatureKey;
  href: (eventId: string) => string;
  icon: string;
  labelKey: string;
  sortOrder: number;
};

export type EventBlueprint = {
  eventType: EventType;
  label: string;
  navigation: NavItemDef[];
  requiredFields: string[];
  defaultModules: FeatureKey[];
  optionalModules: FeatureKey[];
  hiddenModules: FeatureKey[];
  templateCategories: string[];
  vendorCategories: string[];
  defaultSections: string[];
  analyticsWidgets: string[];
  terminology: Record<string, string>;
  /** Features included in free/starter tier for this event type */
  starterFeatures: FeatureKey[];
  /** Features requiring premium package */
  premiumFeatures: FeatureKey[];
  /** Features requiring elite package */
  eliteFeatures: FeatureKey[];
};

export type WorkspaceNavigationItem = {
  id: string;
  featureKey: string;
  href: string;
  icon: string;
  label: string;
  isLocked: boolean;
  requiredPlan?: string;
  sortOrder: number;
};

export type FeatureEntitlementResult = {
  allowed: boolean;
  locked: boolean;
  requiredPlan?: string;
  reason?: string;
};
