/**
 * Invitation Experience 3.0 — Studio 3 protection + eligibility surface.
 *
 * Visual upgrades never edit layout files in place. Use layoutVersion ≥ 2
 * (see layout-version.ts) and the Experience Engine for new generations.
 */

export {
  PROTECTED_TEMPLATE_SOURCE_PATHS,
  assertExperience3Protection,
  buildProtectedTemplateManifest,
  classifyLayoutStatus,
  manifestSummary,
  mayModifyLayoutInPlace,
  type ProtectedManifestEntry,
  type TemplateProtectionStatus,
} from "@/lib/invitation/studio3/protected-manifest";

export {
  DEFAULT_LAYOUT_VERSION,
  PROTECTED_LAYOUT_SLUGS,
  canRegisterStudio3Version,
  isProtectedLayout,
  resolveLayoutVersion,
  shouldUseLegacyInvitationRenderer,
  studio3LayoutKey,
} from "@/lib/invitation/layout-version";

export {
  getExperience3Layout,
  listRegisteredExperience3Keys,
  registerExperience3Layout,
  resolveInvitationLayoutBranch,
  type Experience3LayoutComponent,
  type InvitationLayoutBranch,
} from "@/lib/invitation/studio3/experience-registry";

export {
  EXPERIENCE3_DESIGN_FAMILIES,
  getDesignFamily,
  listPriorityReferenceFamilies,
  type Experience3DesignFamily,
  type Experience3DesignFamilyId,
  type Experience3OpeningStyle,
} from "@/lib/invitation/studio3/design-families";
