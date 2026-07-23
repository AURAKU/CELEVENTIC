import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { coupleNamesLegacyAlias, resolveCoupleName } from "../couple-name";

describe("resolveCoupleName", () => {
  it("prefers hostName when both are set", () => {
    assert.equal(
      resolveCoupleName({
        hostName: "JEFFERY OWURAKU AFARI & FRANCISCA CHELSY SERWAAH OPOKU",
        coupleNames: "Ama & Kofi",
      }),
      "JEFFERY OWURAKU AFARI & FRANCISCA CHELSY SERWAAH OPOKU"
    );
  });

  it("falls back to legacy coupleNames when hostName is empty", () => {
    assert.equal(
      resolveCoupleName({ hostName: "  ", coupleNames: "Ama & Kofi" }),
      "Ama & Kofi"
    );
  });

  it("returns empty string when neither is set", () => {
    assert.equal(resolveCoupleName({}), "");
    assert.equal(resolveCoupleName({ hostName: null, coupleNames: null }), "");
  });
});

describe("coupleNamesLegacyAlias", () => {
  it("mirrors trimmed hostName for typeSpecific writers", () => {
    assert.equal(
      coupleNamesLegacyAlias("  Ama & Kofi  "),
      "Ama & Kofi"
    );
  });
});
