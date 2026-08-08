import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { commitsMatch } from "../build-fingerprint";

describe("commitsMatch", () => {
  it("matches full SHA to short prefix", () => {
    assert.equal(
      commitsMatch(
        "5c65a8eaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "5c65a8eaaaaa"
      ),
      true
    );
  });

  it("matches identical full SHAs", () => {
    const sha = "5c65a8eaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    assert.equal(commitsMatch(sha, sha), true);
  });

  it("rejects unrelated SHAs", () => {
    assert.equal(commitsMatch("5c65a8eaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "0fa4bd4a5647"), false);
  });

  it("rejects missing reported values", () => {
    assert.equal(commitsMatch("5c65a8eaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", null), false);
  });
});
