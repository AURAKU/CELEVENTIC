import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQrToken } from "../parse-qr-payload";

test("rejects unrelated and malformed QR payloads", () => {
  assert.equal(parseQrToken("https://example.com/pay/123456"), null);
  assert.equal(parseQrToken("WIFI:T:WPA;S:Venue;P:secret;;"), null);
  assert.equal(parseQrToken("not-a-pass"), null);
  assert.equal(parseQrToken("12345"), null);
});

test("accepts only supported legacy platform token and code shapes", () => {
  const token = "legacyPlatformToken_123456";
  assert.equal(parseQrToken(token), token);
  assert.equal(parseQrToken(`https://celeventic.com/verify/${token}`), token);
  assert.equal(parseQrToken("4821"), "4821");
});

test("opaque token-shaped values still require authoritative server lookup", () => {
  // Legacy passes predate signed cvp1 tokens, so shape alone cannot establish
  // authenticity. The scanner may route this value, but only a matching,
  // event-scoped database record can admit it.
  assert.equal(parseQrToken("not-a-platform-pass"), "not-a-platform-pass");
});
