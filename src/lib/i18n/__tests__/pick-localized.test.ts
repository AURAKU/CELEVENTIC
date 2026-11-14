import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pickLocalized } from "../pick-localized";

describe("pickLocalized", () => {
  const map = {
    en: "Hello",
    fr: "Bonjour",
    zh: "你好",
  };

  it("returns the exact locale string when present", () => {
    assert.equal(pickLocalized("fr", map, "fallback"), "Bonjour");
    assert.equal(pickLocalized("zh", map, "fallback"), "你好");
    assert.equal(pickLocalized("en", map, "fallback"), "Hello");
  });

  it("falls back to English when Mandarin copy is missing", () => {
    assert.equal(pickLocalized("zh", { en: "Hello", fr: "Bonjour" }, "fallback"), "Hello");
  });

  it("falls back to English then the provided fallback", () => {
    assert.equal(pickLocalized("fr", { zh: "你好" }, "fallback"), "fallback");
    assert.equal(pickLocalized("en", {}, "fallback"), "fallback");
  });

  it("ignores blank strings", () => {
    assert.equal(pickLocalized("fr", { en: "Hello", fr: "   " }, "fallback"), "Hello");
  });
});
