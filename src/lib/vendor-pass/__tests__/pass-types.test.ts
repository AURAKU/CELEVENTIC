import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  BUILTIN_VENDOR_PASS_TYPE_KEYS,
  isBuiltinVendorPassTypeKey,
  mergeVendorPassTypeOptions,
  parseVendorPassTypeValue,
  resolveVendorPassTypeCreate,
  resolveVendorPassTypeDeletion,
  slugifyVendorPassTypeKey,
  vendorPassTypeLabel,
  type VendorPassTypeOverride,
} from "../pass-types";

function override(partial: Partial<VendorPassTypeOverride>): VendorPassTypeOverride {
  return {
    id: partial.id ?? "row-1",
    key: partial.key ?? "CATERING",
    label: partial.label ?? "Catering",
    source: partial.source ?? "CUSTOM",
    isActive: partial.isActive ?? true,
    sortOrder: partial.sortOrder ?? 0,
  };
}

describe("vendor pass type keys", () => {
  it("derives a stable key from any spelling of the same label", () => {
    assert.equal(slugifyVendorPassTypeKey("Catering"), "CATERING");
    assert.equal(slugifyVendorPassTypeKey("  dj   crew "), "DJ_CREW");
    assert.equal(slugifyVendorPassTypeKey("Security-Team!"), "SECURITY_TEAM");
    assert.equal(slugifyVendorPassTypeKey("DJ Crew"), slugifyVendorPassTypeKey("dj-crew"));
  });

  it("recognises the platform's built-in types", () => {
    assert.ok(isBuiltinVendorPassTypeKey("SECURITY"));
    assert.ok(BUILTIN_VENDOR_PASS_TYPE_KEYS.includes("MUSICAL_BAND"));
    assert.equal(isBuiltinVendorPassTypeKey("CATERING"), false);
  });

  it("round-trips custom selections through the select value", () => {
    assert.deepEqual(parseVendorPassTypeValue("CUSTOM:CATERING"), {
      passType: "CUSTOM",
      customKey: "CATERING",
    });
    assert.deepEqual(parseVendorPassTypeValue("SECURITY"), {
      passType: "SECURITY",
      customKey: null,
    });
  });
});

describe("merging one event's picker", () => {
  it("keeps every built-in when the event has no overrides", () => {
    const options = mergeVendorPassTypeOptions([]);
    assert.equal(options.length, BUILTIN_VENDOR_PASS_TYPE_KEYS.length);
    assert.ok(options.every((option) => option.source === "SYSTEM" && !option.deletable));
  });

  it("appends the event's own types and marks them deletable", () => {
    const options = mergeVendorPassTypeOptions([override({ key: "CATERING", label: "Catering" })]);
    const catering = options.find((option) => option.key === "CATERING");
    assert.ok(catering);
    assert.equal(catering.value, "CUSTOM:CATERING");
    assert.equal(catering.source, "CUSTOM");
    assert.equal(catering.deletable, true);
  });

  it("drops hidden built-ins and hides deactivated custom types", () => {
    const options = mergeVendorPassTypeOptions([
      override({ id: "s1", key: "SECURITY", label: "Security Team", source: "SYSTEM", isActive: false }),
      override({ id: "c1", key: "CATERING", isActive: false }),
      override({ id: "c2", key: "DJ_CREW", label: "DJ Crew" }),
    ]);
    assert.equal(options.some((option) => option.key === "SECURITY"), false);
    assert.equal(options.some((option) => option.key === "CATERING"), false);
    assert.ok(options.some((option) => option.key === "DJ_CREW"));
  });
});

describe("adding a pass type", () => {
  it("accepts a new label", () => {
    const decision = resolveVendorPassTypeCreate("Catering", []);
    assert.deepEqual(decision, { ok: true, key: "CATERING", label: "Catering" });
  });

  it("refuses blank or punctuation-only names", () => {
    assert.equal(resolveVendorPassTypeCreate(" ", []).ok, false);
    assert.equal(resolveVendorPassTypeCreate("!!", []).ok, false);
  });

  it("refuses a duplicate of a built-in or an existing custom type", () => {
    const builtin = resolveVendorPassTypeCreate("Security Team", []);
    assert.equal(builtin.ok, false);

    const duplicate = resolveVendorPassTypeCreate("catering", [override({ key: "CATERING" })]);
    assert.equal(duplicate.ok, false);
  });

  it("treats re-adding a hidden built-in as a restore", () => {
    const decision = resolveVendorPassTypeCreate("Security Team", [
      override({ key: "SECURITY", label: "Security Team", source: "SYSTEM", isActive: false }),
    ]);
    assert.equal(decision.ok, true);
    assert.equal(decision.ok && decision.key, "SECURITY");
  });
});

describe("removing a pass type", () => {
  it("deletes an unused custom type outright", () => {
    const decision = resolveVendorPassTypeDeletion({
      key: "CATERING",
      source: "CUSTOM",
      inUseCount: 0,
    });
    assert.equal(decision.ok && decision.action, "delete");
  });

  it("asks for confirmation before touching a type that is in use", () => {
    const decision = resolveVendorPassTypeDeletion({
      key: "CATERING",
      source: "CUSTOM",
      inUseCount: 3,
    });
    assert.equal(decision.ok, false);
    assert.equal(!decision.ok && decision.requiresConfirmation, true);
    assert.match(!decision.ok ? decision.error : "", /3 passes/);
  });

  it("soft-deletes rather than destroys a confirmed in-use custom type", () => {
    const decision = resolveVendorPassTypeDeletion({
      key: "CATERING",
      source: "CUSTOM",
      inUseCount: 3,
      confirm: true,
    });
    assert.equal(decision.ok && decision.action, "deactivate");
  });

  it("never deletes a built-in — it hides it, and only after confirmation when in use", () => {
    const unused = resolveVendorPassTypeDeletion({
      key: "SECURITY",
      source: "SYSTEM",
      inUseCount: 0,
    });
    assert.equal(unused.ok && unused.action, "hide");

    const inUse = resolveVendorPassTypeDeletion({
      key: "SECURITY",
      source: "SYSTEM",
      inUseCount: 1,
    });
    assert.equal(inUse.ok, false);
    assert.equal(!inUse.ok && inUse.requiresConfirmation, true);

    const confirmed = resolveVendorPassTypeDeletion({
      key: "SECURITY",
      source: "SYSTEM",
      inUseCount: 1,
      confirm: true,
    });
    assert.equal(confirmed.ok && confirmed.action, "hide");
  });
});

describe("labelling a pass", () => {
  it("prefers the snapshotted custom label over the enum name", () => {
    assert.equal(vendorPassTypeLabel("CUSTOM", "Catering"), "Catering");
    assert.equal(vendorPassTypeLabel("MUSICAL_BAND", null), "Musical Band");
    assert.equal(vendorPassTypeLabel("SOMETHING_NEW", null), "SOMETHING NEW");
  });
});
