import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  __resetExperience3LayoutRegistryForTests,
  getExperience3Layout,
  listRegisteredExperience3Keys,
  registerExperience3Layout,
  resolveInvitationLayoutBranch,
} from "@/lib/invitation/studio3/experience-registry";
import {
  getDesignFamily,
  listPriorityReferenceFamilies,
  EXPERIENCE3_DESIGN_FAMILIES,
} from "@/lib/invitation/studio3/design-families";

function FakeLayout() {
  return null;
}

describe("Experience 3.0 layout registry", () => {
  beforeEach(() => {
    __resetExperience3LayoutRegistryForTests();
  });

  it("routes missing and v1 designs to the legacy branch", () => {
    assert.deepEqual(resolveInvitationLayoutBranch({ layout: "forever-afaris-wedding" }), {
      mode: "legacy",
      version: 1,
    });
    assert.deepEqual(
      resolveInvitationLayoutBranch({ layout: "classic-gold", layoutVersion: 1 }),
      { mode: "legacy", version: 1 }
    );
  });

  it("rejects v1 registration and leaves the registry empty by default", () => {
    assert.equal(registerExperience3Layout("classic-gold", 1, FakeLayout).ok, false);
    assert.deepEqual(listRegisteredExperience3Keys(), []);
    assert.equal(getExperience3Layout("classic-gold", 1), null);
  });

  it("registers v2 and resolves experience3 without falling back to legacy", () => {
    const registered = registerExperience3Layout("classic-gold", 2, FakeLayout);
    assert.equal(registered.ok, true);
    if (!registered.ok) return;

    assert.deepEqual(
      resolveInvitationLayoutBranch({ layout: "classic-gold", layoutVersion: 2 }),
      {
        mode: "experience3",
        version: 2,
        registryKey: "classic-gold__v2",
      }
    );
    assert.equal(getExperience3Layout("classic-gold", 2), FakeLayout);
  });

  it("marks unregistered v2 as experience3-unregistered (no silent legacy render)", () => {
    assert.deepEqual(
      resolveInvitationLayoutBranch({ layout: "neon-celebration-party", layoutVersion: 2 }),
      {
        mode: "experience3-unregistered",
        version: 2,
        registryKey: "neon-celebration-party__v2",
      }
    );
  });

  it("keeps protected layouts on legacy when layoutVersion is omitted", () => {
    for (const layout of [
      "forever-afaris-wedding",
      "seraphine-champagne-wedding",
      "aurelia-editorial-wedding",
      "traditional-marriage-ceremony",
      "luxury-fashion-flagship",
      "memorial-candle-tribute",
    ]) {
      assert.equal(resolveInvitationLayoutBranch({ layout }).mode, "legacy");
    }
  });
});

describe("Experience 3.0 design families", () => {
  it("defines three priority reference families", () => {
    const priority = listPriorityReferenceFamilies();
    assert.equal(priority.length, 3);
    assert.deepEqual(
      priority.map((family) => family.id).sort(),
      ["brand-launch", "editorial-wedding", "memorial"]
    );
    assert.ok(EXPERIENCE3_DESIGN_FAMILIES.length >= 8);
    assert.equal(getDesignFamily("memorial")?.motionTone, "solemn");
  });
});
