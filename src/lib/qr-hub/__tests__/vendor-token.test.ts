import test from "node:test";
import assert from "node:assert/strict";

import {
  generateVendorManualCode,
  hashVendorToken,
  looksLikeVendorToken,
  mintVendorToken,
  vendorTokenFromNonce,
  verifyVendorTokenSignature,
} from "../vendor-token";
import { validateCustomQrDestination, VENDOR_PRINT_ROLES } from "../types";

test("vendor tokens are signed cvs1 credentials", () => {
  const { nonce, token } = mintVendorToken();
  assert.equal(looksLikeVendorToken(token), true);
  assert.equal(verifyVendorTokenSignature(token), true);
  assert.equal(vendorTokenFromNonce(nonce), token);
  assert.notEqual(hashVendorToken(token), token);
});

test("vendor manual codes are 6–8 digits", () => {
  for (let i = 0; i < 20; i++) {
    const code = generateVendorManualCode(6);
    assert.match(code, /^\d{6}$/);
  }
  assert.match(generateVendorManualCode(8), /^\d{8}$/);
});

test("custom QR destinations reject unsafe schemes and admin paths", () => {
  assert.equal(validateCustomQrDestination("javascript:alert(1)").ok, false);
  assert.equal(validateCustomQrDestination("data:text/html,hi").ok, false);
  assert.equal(validateCustomQrDestination("/dashboard/gifts").ok, false);
  assert.equal(validateCustomQrDestination("https://maps.google.com/?q=Accra").ok, true);
});

test("vendor print roles share presentation-only headings", () => {
  assert.ok(VENDOR_PRINT_ROLES.some((r) => r.key === "dj"));
  assert.ok(VENDOR_PRINT_ROLES.some((r) => r.key === "security"));
  assert.ok(VENDOR_PRINT_ROLES.some((r) => r.heading === "Celeventic Team"));
});
