import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  findOnboardingIntent,
  intentFromQuery,
  ONBOARDING_INTENT_OPTIONS,
} from "../onboarding-intents";

describe("signup intents", () => {
  it("covers every account path in plain language", () => {
    const keys = ONBOARDING_INTENT_OPTIONS.map((o) => o.queryKey);
    assert.deepEqual(keys, ["host", "guest", "organizer", "smartcard", "vendor", "organization"]);
    for (const option of ONBOARDING_INTENT_OPTIONS) {
      assert.ok(option.title.length > 4);
      assert.equal(option.primaryHref.startsWith("/"), true);
      assert.ok(option.next.length > 10);
    }
  });

  it("maps friendly query aliases to the right workspace", () => {
    assert.equal(intentFromQuery("host")?.id, "EVENT_OWNER");
    assert.equal(intentFromQuery("host")?.joinIntent, false);
    assert.equal(intentFromQuery("invited")?.joinIntent, true);
    assert.equal(intentFromQuery("join")?.queryKey, "guest");
    assert.equal(intentFromQuery("planner")?.id, "ORGANIZER");
    assert.equal(intentFromQuery("organisation")?.id, "ORGANIZATION");
    assert.equal(intentFromQuery("church")?.id, "ORGANIZATION");
    assert.equal(intentFromQuery("smartcard")?.queryKey, "smartcard");
    assert.equal(intentFromQuery("celecard")?.queryKey, "smartcard");
    assert.equal(intentFromQuery("celecard")?.primaryHref, "/dashboard/business-card");
    assert.equal(intentFromQuery("card")?.primaryHref, "/dashboard/business-card");
    assert.equal(intentFromQuery("unknown"), undefined);
  });

  it("keeps guest and host distinct even though both use EVENT_OWNER", () => {
    const host = findOnboardingIntent("EVENT_OWNER", false);
    const guest = findOnboardingIntent("EVENT_OWNER", true);
    assert.equal(host?.queryKey, "host");
    assert.equal(guest?.queryKey, "guest");
    assert.equal(host?.primaryHref, "/dashboard/events/create");
    assert.equal(guest?.primaryHref.includes("/dashboard/invitations/workspace"), true);
  });
});
