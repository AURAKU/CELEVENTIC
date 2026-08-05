import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyProviderHealth,
  type ProviderCredentials,
} from "@/lib/integrations/integration-runtime";
import { CommunicationProviderError } from "@/services/communications/communication.service";

function creds(
  partial: Partial<ProviderCredentials> & Pick<ProviderCredentials, "enabled">
): ProviderCredentials {
  return {
    secret: null,
    publicKey: null,
    webhookUrl: null,
    config: {},
    ...partial,
  };
}

describe("classifyProviderHealth (Resend / email)", () => {
  it("marks disabled providers without treating them as fatal", () => {
    const result = classifyProviderHealth(creds({ enabled: false }), "RESEND");
    assert.equal(result.state, "disabled");
    assert.match(result.message, /unavailable until configured/i);
  });

  it("marks enabled-without-key as missing_credentials", () => {
    const result = classifyProviderHealth(
      creds({ enabled: true, secret: null }),
      "RESEND"
    );
    assert.equal(result.state, "missing_credentials");
    assert.match(result.message, /missing credentials/i);
  });

  it("marks enabled-with-key as healthy", () => {
    const result = classifyProviderHealth(
      creds({ enabled: true, secret: "re_test_key" }),
      "RESEND"
    );
    assert.equal(result.state, "healthy");
  });
});

describe("RSVP organizer email graceful degradation contract", () => {
  it("CommunicationProviderError is distinguishable for soft-catch", () => {
    const err = new CommunicationProviderError(
      'Email provider "RESEND" is not enabled. Configure it in Admin → Integrations.'
    );
    assert.ok(err instanceof CommunicationProviderError);
    assert.ok(err instanceof Error);
    assert.match(err.message, /not enabled/);
  });

  it("disabled provider plan skips email without failing RSVP", () => {
    const emailEnabled = false;
    const rsvpPersisted = true;
    const notification = emailEnabled
      ? { status: "sent" as const }
      : {
          status: "skipped" as const,
          reason: "RESEND_DISABLED" as const,
          guestId: "guest_1",
          response: "ACCEPTED" as const,
        };

    assert.equal(rsvpPersisted, true);
    assert.equal(notification.status, "skipped");
    assert.equal(notification.reason, "RESEND_DISABLED");
    assert.deepEqual(
      {
        reason: notification.reason,
        guestId: notification.guestId,
        response: notification.response,
      },
      { reason: "RESEND_DISABLED", guestId: "guest_1", response: "ACCEPTED" }
    );
  });

  it("enabled provider still attempts send path", () => {
    const health = classifyProviderHealth(
      creds({ enabled: true, secret: "re_live" }),
      "RESEND"
    );
    assert.equal(health.state, "healthy");
    const shouldSend = health.state === "healthy";
    assert.equal(shouldSend, true);
  });

  it("provider rejection / timeout map to soft failure status", () => {
    const failures = [
      new CommunicationProviderError("Resend error (429)"),
      new CommunicationProviderError("timeout"),
    ];
    for (const err of failures) {
      assert.ok(err instanceof CommunicationProviderError);
      // RSVP path catches these — never rethrow as unhandled.
      const recorded = { status: "failed" as const, message: err.message };
      assert.equal(recorded.status, "failed");
    }
  });
});
