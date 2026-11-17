import type { InvitationLayoutSlug } from "@/types/invitation-design";
import { CATALOG_TEMPLATES } from "@/lib/invitation-mvp/catalogue";
import { PROTECTED_LAYOUT_SLUGS, isProtectedLayout } from "@/lib/invitation/layout-version";
import { isExperience3NativeLayout } from "@/lib/invitation/studio3/native-layouts";

/**
 * Invitation Experience 3.0 — protected template manifest.
 *
 * Enforcement rule: Studio 3 / Experience 3.0 never modifies layout files in place.
 * New work must register layoutVersion ≥ 2 (or a brand-new layout slug).
 */

export type TemplateProtectionStatus = "PROTECTED" | "ELIGIBLE" | "UNKNOWN";

export type ProtectedManifestEntry = {
  catalogSlug: string;
  name: string;
  category: string;
  layoutSlug: string;
  /** Visual generation currently shipping for this SKU (always 1 today). */
  currentVersion: 1;
  status: TemplateProtectionStatus;
  evidence: string[];
  upgradeEligibility: "blocked" | "v2-only" | "pending-production-proof";
  risk: "critical" | "high" | "medium";
};

/** Source files that must not be edited for Experience 3.0 upgrades. */
export const PROTECTED_TEMPLATE_SOURCE_PATHS = [
  "src/components/invitation/templates/forever-afaris-wedding.tsx",
  "src/components/invitation/templates/forever-afaris-wedding-opening.tsx",
  "src/components/invitation/templates/forever-afaris-wedding-pages.tsx",
  "src/components/invitation/templates/forever-afaris-wedding-palette.ts",
  "src/components/invitation/templates/forever-afaris-invitation-intro.module.css",
  "src/components/invitation/templates/traditional-marriage-ceremony.tsx",
  "src/components/invitation/templates/traditional-marriage-journey.tsx",
  "src/components/invitation/templates/traditional-marriage-gallery.tsx",
  "src/components/invitation/templates/traditional-marriage-respond.tsx",
  "src/components/invitation/templates/traditional-marriage-thank-you.tsx",
  "src/components/invitation/templates/traditional-marriage-countdown.tsx",
  "src/components/invitation/templates/traditional-marriage-palette.ts",
  "src/components/invitation/templates/aurelia-editorial-wedding.tsx",
  "src/components/invitation/templates/aurelia-editorial-wedding.module.css",
  "src/components/invitation/templates/luxury-fashion-flagship.tsx",
  "src/components/invitation/templates/luxury-fashion",
  "src/lib/invitation/edwin-published-design.ts",
] as const;

const PROVEN_EVIDENCE: Record<string, string[]> = {
  "forever-afaris-wedding": [
    "Edwin & Lordina published design (edwin-published-design.ts)",
    "Deploy smoke + live guest invites",
  ],
  "seraphine-champagne-wedding": [
    "Kojo & Fafa seed/live layout",
    "Shares AureliaEditorialWeddingTemplate with Aurelia",
  ],
  "aurelia-editorial-wedding": [
    "Public catalogue flagship",
    "Shared renderer path with Seraphine",
  ],
  "traditional-marriage-ceremony": [
    "Dedicated ceremony stack + renderer special cases",
    "Internal creative benchmark",
  ],
  "luxury-fashion-flagship": [
    "Femmora flagship / soft-opening experience",
  ],
  "memorial-candle-tribute": [
    "Funeral layout family (11 catalogue SKUs)",
    "Local + production funeral invitation traffic",
  ],
};

function riskFor(layout: string, status: TemplateProtectionStatus): ProtectedManifestEntry["risk"] {
  if (isProtectedLayout(layout)) return "critical";
  if (status === "UNKNOWN") return "high";
  return "medium";
}

/**
 * Hard rule: Experience 3.0 never edits an existing layout in place —
 * including layouts not yet proven live (UNKNOWN).
 */
export function mayModifyLayoutInPlace(_layout: string): false {
  return false;
}

export function classifyLayoutStatus(layout: string): TemplateProtectionStatus {
  if (isProtectedLayout(layout)) return "PROTECTED";
  // Brand-new Experience 3.0 native slugs have no historical usage by definition.
  if (isExperience3NativeLayout(layout)) return "ELIGIBLE";
  // Until production read-only usage is verified, existing catalogue layouts stay UNKNOWN.
  return "UNKNOWN";
}

export function buildProtectedTemplateManifest(): ProtectedManifestEntry[] {
  return CATALOG_TEMPLATES.map((template) => {
    const status = classifyLayoutStatus(template.layoutSlug);
    const evidence =
      PROVEN_EVIDENCE[template.layoutSlug] ??
      [
        "No conclusive production usage proof in this audit",
        "Default UNKNOWN → treat as protected; no in-place edits",
      ];
    return {
      catalogSlug: template.slug,
      name: template.name,
      category: template.category,
      layoutSlug: template.layoutSlug,
      currentVersion: 1,
      status,
      evidence,
      upgradeEligibility:
        status === "PROTECTED" ? "v2-only" : status === "ELIGIBLE" ? "v2-only" : "pending-production-proof",
      risk: riskFor(template.layoutSlug, status),
    };
  });
}

export function manifestSummary(entries: ProtectedManifestEntry[] = buildProtectedTemplateManifest()) {
  const byStatus = { PROTECTED: 0, ELIGIBLE: 0, UNKNOWN: 0 };
  const layouts = new Set<string>();
  for (const entry of entries) {
    byStatus[entry.status] += 1;
    layouts.add(entry.layoutSlug);
  }
  return {
    catalogSkus: entries.length,
    uniqueLayouts: layouts.size,
    protectedLayouts: PROTECTED_LAYOUT_SLUGS.length,
    ...byStatus,
    eligibleForInPlaceEdit: 0,
    inPlaceEditsAllowed: false as const,
  };
}

export function assertExperience3Protection(): {
  ok: true;
  summary: ReturnType<typeof manifestSummary>;
} {
  const summary = manifestSummary();
  if (summary.ELIGIBLE !== 0) {
    // Future: allow ELIGIBLE only after production proof updates classifyLayoutStatus.
  }
  if (mayModifyLayoutInPlace("classic-gold") !== false) {
    throw new Error("Experience 3.0 invariant broken: in-place layout edits must be forbidden");
  }
  for (const layout of PROTECTED_LAYOUT_SLUGS) {
    if (!isProtectedLayout(layout as InvitationLayoutSlug)) {
      throw new Error(`Protected layout missing from guard: ${layout}`);
    }
  }
  return { ok: true, summary };
}
