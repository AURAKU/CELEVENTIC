import test from "node:test";
import assert from "node:assert/strict";
import { sharedSecretWebhookAllowed } from "../webhook-guard";

test("rejects disabled providers", () => {
  assert.equal(sharedSecretWebhookAllowed(false, "secret", "secret"), false);
});

test("rejects missing shared secret even when enabled", () => {
  assert.equal(sharedSecretWebhookAllowed(true, null, "anything"), false);
  assert.equal(sharedSecretWebhookAllowed(true, "", "anything"), false);
});

test("rejects missing signature", () => {
  assert.equal(sharedSecretWebhookAllowed(true, "secret", ""), false);
  assert.equal(sharedSecretWebhookAllowed(true, "secret", null), false);
});

test("accepts an exact shared secret match", () => {
  assert.equal(sharedSecretWebhookAllowed(true, "secret", "secret"), true);
  assert.equal(sharedSecretWebhookAllowed(true, "secret", "other"), false);
});
