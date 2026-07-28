import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { authorTokenMatches } from "../guest-wish.service";

describe("guest wish author delete token", () => {
  it("accepts the exact token that produced the stored hash", () => {
    const token = randomBytes(24).toString("base64url");
    const hash = createHash("sha256").update(token).digest("hex");
    assert.equal(authorTokenMatches(hash, token), true);
  });

  it("rejects a different token, empty token, or missing hash", () => {
    const token = randomBytes(24).toString("base64url");
    const hash = createHash("sha256").update(token).digest("hex");
    assert.equal(authorTokenMatches(hash, "not-the-token"), false);
    assert.equal(authorTokenMatches(hash, ""), false);
    assert.equal(authorTokenMatches(null, token), false);
    assert.equal(authorTokenMatches(undefined, token), false);
  });
});
