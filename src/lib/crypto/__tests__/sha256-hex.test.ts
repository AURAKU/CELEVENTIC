import test from "node:test";
import assert from "node:assert/strict";
import { sha256Hex } from "../sha256-hex";

test("hashes the same token the same way every time", () => {
  const a = sha256Hex("cvp1.test-token");
  const b = sha256Hex("cvp1.test-token");
  assert.equal(a, b);
  assert.equal(a.length, 64);
});

test("does not store the raw token in the hash", () => {
  const raw = "super-secret-admission-token";
  const hashed = sha256Hex(raw);
  assert.equal(hashed.includes(raw), false);
});
