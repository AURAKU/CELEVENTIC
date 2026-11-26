import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  EXPERIENCE3_REFERENCE_DEFINITIONS,
  IX3_BRAND_LAUNCH,
  IX3_EDITORIAL_WEDDING,
  IX3_MEMORIAL,
} from "@/lib/invitation/studio3/reference-definitions";
import { classifyLayoutStatus } from "@/lib/invitation/studio3/protected-manifest";
import { EXPERIENCE3_NATIVE_LAYOUT_SLUGS } from "@/lib/invitation/studio3/native-layouts";
import {
  getExperience3Layout,
  listRegisteredExperience3Keys,
  registerExperience3Layout,
  resolveInvitationLayoutBranch,
  __resetExperience3LayoutRegistryForTests,
} from "@/lib/invitation/studio3/experience-registry";

function FakeLayout() {
  return null;
}

describe("Experience 3.0 reference experiences", () => {
  beforeEach(() => {
    __resetExperience3LayoutRegistryForTests();
  });

  it("marks native layouts ELIGIBLE and never PROTECTED", () => {
    for (const layout of EXPERIENCE3_NATIVE_LAYOUT_SLUGS) {
      assert.equal(classifyLayoutStatus(layout), "ELIGIBLE");
    }
  });

  it("defines three category-distinct reference packs plus expanded families", () => {
    assert.equal(EXPERIENCE3_REFERENCE_DEFINITIONS.length, 3);
    assert.equal(IX3_EDITORIAL_WEDDING.designFamily, "editorial-wedding");
    assert.equal(IX3_BRAND_LAUNCH.designFamily, "brand-launch");
    assert.equal(IX3_MEMORIAL.designFamily, "memorial");
    assert.equal(IX3_MEMORIAL.motionIntensity <= 0.25, true);
    assert.equal(IX3_MEMORIAL.audioDefaultEnabled, false);
    assert.equal(IX3_EDITORIAL_WEDDING.opening.skippable, true);
    assert.equal(IX3_BRAND_LAUNCH.opening.skippable, true);
    assert.equal(EXPERIENCE3_NATIVE_LAYOUT_SLUGS.length, 9);
    assert.ok(EXPERIENCE3_NATIVE_LAYOUT_SLUGS.includes("ix3-editorial-wedding"));
    assert.ok(EXPERIENCE3_NATIVE_LAYOUT_SLUGS.includes("ix3-heritage-marriage"));
    assert.ok(EXPERIENCE3_NATIVE_LAYOUT_SLUGS.includes("ix3-baby-shower"));
  });

  it("registers native references on the Experience 3.0 path at v1", () => {
    for (const def of EXPERIENCE3_REFERENCE_DEFINITIONS) {
      const result = registerExperience3Layout(def.layout, def.layoutVersion, FakeLayout);
      assert.equal(result.ok, true);
      assert.deepEqual(resolveInvitationLayoutBranch({ layout: def.layout }), {
        mode: "experience3",
        version: 1,
        registryKey: `${def.layout}__v1`,
      });
      assert.equal(getExperience3Layout(def.layout, def.layoutVersion), FakeLayout);
    }
    assert.ok(listRegisteredExperience3Keys().includes("ix3-editorial-wedding__v1"));
    assert.ok(listRegisteredExperience3Keys().includes("ix3-brand-launch__v1"));
    assert.ok(listRegisteredExperience3Keys().includes("ix3-memorial__v1"));
  });

  it("keeps protected flagship layouts on legacy when unversioned", () => {
    assert.equal(
      resolveInvitationLayoutBranch({ layout: "forever-afaris-wedding" }).mode,
      "legacy"
    );
    assert.equal(
      resolveInvitationLayoutBranch({ layout: "luxury-fashion-flagship" }).mode,
      "legacy"
    );
    assert.equal(
      resolveInvitationLayoutBranch({ layout: "memorial-candle-tribute" }).mode,
      "legacy"
    );
  });
});
