import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { storageGet, storageRemove, storageSet } from "../safe-storage";

describe("safe storage helpers", () => {
  it("returns null / false off-window without throwing", () => {
    assert.equal(storageGet("missing-key"), null);
    assert.equal(storageSet("k", "v"), false);
    assert.doesNotThrow(() => storageRemove("k"));
  });
});
