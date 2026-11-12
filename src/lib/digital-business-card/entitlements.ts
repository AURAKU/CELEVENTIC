/**
 * Unpublished CeleYou tier catalog. Do not activate a tier until Super Admin
 * publishes it. Pro prepaid plans remain the live product.
 */

export type CeleYouTierId = "free" | "pro" | "business" | "teams" | "enterprise";

export type CeleYouEntitlementKey =
  | "premiumTemplates"
  | "multipleCards"
  | "advancedAnalytics"
  | "connectBack"
  | "twoWayExchange"
  | "followUpAutomation"
  | "crmIntegrations"
  | "contactEnrichment"
  | "teamManagement";

export type CeleYouTierDefinition = {
  id: CeleYouTierId;
  label: string;
  published: boolean;
  proposedMonthlyGhs: number | null;
  notes: string;
  entitlements: Record<CeleYouEntitlementKey, boolean | number>;
};

export const CELEYOU_TIER_CATALOG: CeleYouTierDefinition[] = [
  {
    id: "free",
    label: "CeleYou Free",
    published: false,
    proposedMonthlyGhs: 0,
    notes: "Studio-only identity. Not a live public hosting plan.",
    entitlements: {
      premiumTemplates: false,
      multipleCards: 1,
      advancedAnalytics: false,
      connectBack: false,
      twoWayExchange: false,
      followUpAutomation: false,
      crmIntegrations: false,
      contactEnrichment: 0,
      teamManagement: false,
    },
  },
  {
    id: "pro",
    label: "CeleYou Pro",
    published: true,
    proposedMonthlyGhs: 49,
    notes: "Current prepaid catalog. Durations are monthly through yearly.",
    entitlements: {
      premiumTemplates: true,
      multipleCards: true,
      advancedAnalytics: true,
      connectBack: true,
      twoWayExchange: true,
      followUpAutomation: false,
      crmIntegrations: false,
      contactEnrichment: 0,
      teamManagement: false,
    },
  },
  {
    id: "business",
    label: "CeleYou Business",
    published: false,
    proposedMonthlyGhs: 99,
    notes: "Proposed GH₵99/month. Requires approval before any checkout uses this amount.",
    entitlements: {
      premiumTemplates: true,
      multipleCards: true,
      advancedAnalytics: true,
      connectBack: true,
      twoWayExchange: true,
      followUpAutomation: true,
      crmIntegrations: false,
      contactEnrichment: 50,
      teamManagement: false,
    },
  },
  {
    id: "teams",
    label: "CeleYou Teams",
    published: false,
    proposedMonthlyGhs: null,
    notes: "Seat-based team management. Price not authorized.",
    entitlements: {
      premiumTemplates: true,
      multipleCards: true,
      advancedAnalytics: true,
      connectBack: true,
      twoWayExchange: true,
      followUpAutomation: true,
      crmIntegrations: false,
      contactEnrichment: 200,
      teamManagement: true,
    },
  },
  {
    id: "enterprise",
    label: "CeleYou Enterprise",
    published: false,
    proposedMonthlyGhs: null,
    notes: "Custom contract. CRM and enrichment are scoped per agreement.",
    entitlements: {
      premiumTemplates: true,
      multipleCards: true,
      advancedAnalytics: true,
      connectBack: true,
      twoWayExchange: true,
      followUpAutomation: true,
      crmIntegrations: true,
      contactEnrichment: true,
      teamManagement: true,
    },
  },
];

export function publishedCeleYouTiers() {
  return CELEYOU_TIER_CATALOG.filter((tier) => tier.published);
}
