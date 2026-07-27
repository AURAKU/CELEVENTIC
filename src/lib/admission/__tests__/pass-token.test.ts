import { test } from "node:test";
import assert from "node:assert/strict";

// The signing key is read lazily inside each helper, so setting it here — before
// any test body runs — is enough; no dynamic import gymnastics required.
process.env.ADMISSION_PASS_SECRET ??= "test-admission-secret-do-not-use-in-production";

import {
  mintPassToken,
  passTokenFromNonce,
  verifyPassTokenSignature,
  hashPassToken,
  passTokenPrefix,
  buildPassUrl,
  extractPassToken,
  looksLikePassToken,
  safeCodeEquals,
} from "../pass-token";

test("minted tokens are well-formed, unique, and verify", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const { token, nonce } = mintPassToken();
    assert.ok(looksLikePassToken(token), `malformed token: ${token}`);
    assert.ok(verifyPassTokenSignature(token));
    assert.equal(passTokenFromNonce(nonce), token, "token must be re-derivable from its nonce");
    assert.ok(!seen.has(token), "minted a duplicate token");
    seen.add(token);
  }
});

test("tokens carry no database identifiers", () => {
  const { token } = mintPassToken();
  const [prefix, nonce, tag] = token.split(".");
  assert.equal(prefix, "cvp1");
  assert.equal(nonce.length, 22);
  assert.equal(tag.length, 22);
  // cuid ids used by Prisma start with "c" and are 25 chars — nothing that
  // shape may appear anywhere in the payload.
  assert.ok(!/c[a-z0-9]{24}/.test(token));
});

test("tampered tokens are rejected", () => {
  const { token } = mintPassToken();
  const [prefix, nonce, tag] = token.split(".");

  assert.equal(verifyPassTokenSignature(`${prefix}.${nonce}.${"A".repeat(22)}`), false);
  assert.equal(
    verifyPassTokenSignature(`${prefix}.${"B".repeat(22)}.${tag}`),
    false,
    "swapping the nonce must invalidate the tag"
  );
  assert.equal(verifyPassTokenSignature(""), false);
  assert.equal(verifyPassTokenSignature("not-a-token"), false);
  assert.equal(verifyPassTokenSignature("cvp1.short.tag"), false);
  assert.equal(verifyPassTokenSignature(`${token}extra`), false);
});

test("hash is stable, 64-hex, and differs per token", () => {
  const a = mintPassToken().token;
  const b = mintPassToken().token;
  assert.match(hashPassToken(a), /^[0-9a-f]{64}$/);
  assert.equal(hashPassToken(a), hashPassToken(a));
  assert.equal(hashPassToken(a), hashPassToken(` ${a} `), "whitespace is trimmed before hashing");
  assert.notEqual(hashPassToken(a), hashPassToken(b));
});

test("prefix is non-reversible and short", () => {
  const { token } = mintPassToken();
  const prefix = passTokenPrefix(token);
  assert.equal(prefix.length, 13);
  assert.ok(token.startsWith(prefix));
  assert.ok(prefix.length < token.length / 2);
});

test("pass URLs round-trip through the extractor", () => {
  const { token } = mintPassToken();
  const url = buildPassUrl("https://celeventic.com/", token);
  assert.equal(url, `https://celeventic.com/admission/${encodeURIComponent(token)}`);
  assert.equal(extractPassToken(url), token);
  assert.equal(extractPassToken(token), token);
  assert.equal(extractPassToken("https://celeventic.com/verify/abc123"), null);
  assert.equal(extractPassToken(""), null);
});

test("code comparison is length-safe", () => {
  assert.equal(safeCodeEquals("1234", "1234"), true);
  assert.equal(safeCodeEquals("1234", "1235"), false);
  assert.equal(safeCodeEquals("1234", "123456"), false);
  assert.equal(safeCodeEquals(" 1234 ", "1234"), true);
});
