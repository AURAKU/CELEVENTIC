import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_LAYOUT_VERSION,
  PROTECTED_LAYOUT_SLUGS,
  canRegisterStudio3Version,
  isProtectedLayout,
  resolveLayoutVersion,
  shouldUseLegacyInvitationRenderer,
  studio3LayoutKey,
} from "@/lib/invitation/layout-version";

describe("invitation layout version isolation", () => {
  it("defaults missing and invalid versions to protected v1", () => {
    assert.equal(resolveLayoutVersion(undefined), DEFAULT_LAYOUT_VERSION);
    assert.equal(resolveLayoutVersion({}), DEFAULT_LAYOUT_VERSION);
    assert.equal(resolveLayoutVersion({ layoutVersion: 0 }), DEFAULT_LAYOUT_VERSION);
    assert.equal(resolveLayoutVersion({ layoutVersion: -3 }), DEFAULT_LAYOUT_VERSION);
    assert.equal(resolveLayoutVersion({ layoutVersion: Number.NaN }), DEFAULT_LAYOUT_VERSION);
  });

  it("preserves explicit Studio 3 versions", () => {
    assert.equal(resolveLayoutVersion({ layoutVersion: 2 }), 2);
    assert.equal(resolveLayoutVersion({ layoutVersion: 3.9 }), 3);
  });

  it("keeps legacy renderer for v1 designs including forever-afaris", () => {
    assert.equal(
      shouldUseLegacyInvitationRenderer({ layout: "forever-afaris-wedding" }),
      true
    );
    assert.equal(
      shouldUseLegacyInvitationRenderer({ layout: "forever-afaris-wedding", layoutVersion: 1 }),
      true
    );
    assert.equal(
      shouldUseLegacyInvitationRenderer({ layout: "classic-gold", layoutVersion: 2 }),
      false
    );
  });

  it("marks proven live layouts as protected", () => {
    for (const layout of PROTECTED_LAYOUT_SLUGS) {
      assert.equal(isProtectedLayout(layout), true);
    }
    assert.equal(isProtectedLayout("classic-gold"), false);
  });

  it("rejects in-place v1 Studio 3 registrations", () => {
    assert.equal(canRegisterStudio3Version("classic-gold", 1).ok, false);
    assert.equal(canRegisterStudio3Version("classic-gold", 2).ok, true);
    assert.equal(studio3LayoutKey("classic-gold", 2), "classic-gold__v2");
  });
});
