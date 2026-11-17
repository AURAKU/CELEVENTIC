import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  DEFAULT_LAYOUT_VERSION,
  PROTECTED_LAYOUT_SLUGS,
  canRegisterStudio3Version,
  resolveLayoutVersion,
  shouldUseLegacyInvitationRenderer,
  studio3LayoutKey,
} from "@/lib/invitation/layout-version";
import {
  PROTECTED_TEMPLATE_SOURCE_PATHS,
  classifyLayoutStatus,
  mayModifyLayoutInPlace,
  manifestSummary,
} from "@/lib/invitation/studio3/protected-manifest";
import {
  resolveInvitationLayoutBranch,
  registerExperience3Layout,
  __resetExperience3LayoutRegistryForTests,
} from "@/lib/invitation/studio3/experience-registry";

/**
 * Phase 2 Workstream A — isolation / compatibility assertions.
 * Visual screenshot regression is intentionally NOT claimed here.
 */

describe("Phase 2 layout version isolation", () => {
  it("resolves missing layoutVersion to protected v1 deterministically", () => {
    assert.equal(resolveLayoutVersion(undefined), DEFAULT_LAYOUT_VERSION);
    assert.equal(resolveLayoutVersion({ layoutVersion: undefined }), DEFAULT_LAYOUT_VERSION);
    assert.equal(
      shouldUseLegacyInvitationRenderer({ layout: "forever-afaris-wedding" }),
      true
    );
    assert.equal(
      resolveInvitationLayoutBranch({ layout: "seraphine-champagne-wedding" }).mode,
      "legacy"
    );
  });

  it("never auto-upgrades historical designs when a v2 registration exists for another layout", () => {
    __resetExperience3LayoutRegistryForTests();
    registerExperience3Layout("classic-gold", 2, () => null);
    assert.equal(
      resolveInvitationLayoutBranch({ layout: "classic-gold" }).mode,
      "legacy",
      "omitted version must stay legacy even if classic-gold__v2 is registered"
    );
    assert.equal(
      resolveInvitationLayoutBranch({ layout: "classic-gold", layoutVersion: 1 }).mode,
      "legacy"
    );
  });

  it("keeps Aurelia and Seraphine on the shared legacy path when unversioned", () => {
    for (const layout of ["aurelia-editorial-wedding", "seraphine-champagne-wedding"] as const) {
      assert.equal(shouldUseLegacyInvitationRenderer({ layout }), true);
      assert.equal(resolveInvitationLayoutBranch({ layout }).mode, "legacy");
      assert.equal(canRegisterStudio3Version(layout, 1).ok, false);
      assert.equal(canRegisterStudio3Version(layout, 2).ok, true);
      assert.equal(studio3LayoutKey(layout, 2), `${layout}__v2`);
    }
  });

  it("forbids in-place modification for every protected and unknown catalogue layout", () => {
    for (const layout of PROTECTED_LAYOUT_SLUGS) {
      assert.equal(mayModifyLayoutInPlace(layout), false);
      assert.equal(classifyLayoutStatus(layout), "PROTECTED");
    }
    assert.equal(mayModifyLayoutInPlace("classic-gold"), false);
    assert.equal(classifyLayoutStatus("classic-gold"), "UNKNOWN");
    const summary = manifestSummary();
    assert.equal(summary.ELIGIBLE, 0, "catalogue ELIGIBLE must remain 0 without production proof");
    assert.equal(summary.inPlaceEditsAllowed, false);
  });

  it("keeps protected template source paths present (modification guard inventory)", () => {
    const root = process.cwd();
    for (const relative of PROTECTED_TEMPLATE_SOURCE_PATHS) {
      assert.equal(existsSync(path.join(root, relative)), true, relative);
    }
  });
});
