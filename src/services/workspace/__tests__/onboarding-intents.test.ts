import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { onboardingService } from "../onboarding.service";
import { ONBOARDING_INTENT_OPTIONS } from "@/lib/auth/onboarding-intents";

describe("onboarding intent routing", () => {
  it("exposes five distinct signup paths", () => {
    assert.equal(ONBOARDING_INTENT_OPTIONS.length, 5);
    const keys = ONBOARDING_INTENT_OPTIONS.map((o) => `${o.id}:${o.joinIntent}`);
    assert.deepEqual(keys, [
      "EVENT_OWNER:false",
      "ORGANIZER:false",
      "VENDOR:false",
      "ORGANIZATION:false",
      "EVENT_OWNER:true",
    ]);
  });

  it("routes each intent to the correct post-signup destination", () => {
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
