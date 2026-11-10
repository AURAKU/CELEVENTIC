import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { onboardingService } from "../onboarding.service";
import { ONBOARDING_INTENT_OPTIONS } from "@/lib/auth/onboarding-intents";
import { safeReturnPath } from "@/lib/auth/safe-next-path";

describe("onboarding intent routing", () => {
  it("exposes every distinct signup path including CeleYou", () => {
    assert.equal(ONBOARDING_INTENT_OPTIONS.length, 6);
    const keys = ONBOARDING_INTENT_OPTIONS.map((o) => `${o.queryKey}:${o.id}:${o.joinIntent}`);
    assert.deepEqual(keys, [
      "host:EVENT_OWNER:false",
      "guest:EVENT_OWNER:true",
      "organizer:ORGANIZER:false",
      "smartcard:EVENT_OWNER:false",
      "vendor:VENDOR:false",
      "organization:ORGANIZATION:false",
    ]);
  });

  it("returns invitees to a claim path from next or callbackUrl", () => {
    const claim = "/card/claim/invite-token";
    assert.equal(
      safeReturnPath({ get: (name) => (name === "callbackUrl" ? claim : null) }),
      claim
    );
    assert.equal(
      safeReturnPath({
        get: (name) => (name === "next" ? claim : name === "callbackUrl" ? "/dashboard" : null),
      }),
      claim
    );
    assert.equal(safeReturnPath({ get: () => "//evil.example/phish" }), null);
  });

  it("routes each intent to the correct post-signup destination", () => {
    assert.equal(
      onboardingService.getPostSignupRedirect("EVENT_OWNER", null, false, {
        productIntent: "celecard",
      }),
      "/dashboard/business-card"
    );
    assert.equal(
      onboardingService.getPostSignupRedirect("EVENT_OWNER", null, false),
      "/dashboard/getting-started"
    );
    assert.equal(
      onboardingService.getPostSignupRedirect("EVENT_OWNER", null, true),
      "/dashboard/getting-started?intent=join"
    );
    assert.equal(
      onboardingService.getPostSignupRedirect("ORGANIZER", null, false),
      "/dashboard/getting-started"
    );
    assert.equal(
      onboardingService.getPostSignupRedirect("ORGANIZATION", null, false),
      "/dashboard/getting-started"
    );
    assert.equal(
      onboardingService.getPostSignupRedirect("VENDOR", null, false, {
        vendorCategory: "Caterers",
      }),
      "/vendor/onboarding?category=Caterers"
    );
  });
});
