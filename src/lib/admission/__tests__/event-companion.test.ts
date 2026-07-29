import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildEventCompanionHref,
  buildInviteCeremonyHref,
  shouldOpenEventCompanionOnly,
  wantsInviteCeremonyView,
} from "@/lib/admission/event-companion";
import { openingMemoryKey } from "@/lib/experience/opening-visit-memory";

describe("event companion routing", () => {
  it("builds companion href with optional guest token", () => {
    assert.equal(buildEventCompanionHref("abc"), "/invite/abc/event-day");
    assert.equal(
      buildEventCompanionHref("abc", "tok-1"),
      "/invite/abc/event-day?guest=tok-1"
    );
  });

  it("builds invite ceremony href that opts out of companion redirect", () => {
    assert.equal(
      buildInviteCeremonyHref("abc"),
      "/invite/abc?view=invite"
    );
    assert.equal(
      buildInviteCeremonyHref("abc", "tok-1"),
      "/invite/abc?view=invite&guest=tok-1"
    );
  });

  it("detects explicit invite ceremony view", () => {
    assert.equal(wantsInviteCeremonyView({ view: "invite" }), true);
    assert.equal(wantsInviteCeremonyView({ view: "ceremony" }), true);
    assert.equal(wantsInviteCeremonyView({ view: "other" }), false);
    assert.equal(wantsInviteCeremonyView({}), false);
  });

  it("opens companion only when post-admission is enabled, portal unlocked, and at least one head admitted", () => {
    assert.equal(
      shouldOpenEventCompanionOnly({
        postAdmissionEnabled: true,
        canAccessPortal: true,
        admittedCount: 1,
      }),
      true
    );
    assert.equal(
      shouldOpenEventCompanionOnly({
        postAdmissionEnabled: true,
        canAccessPortal: true,
        admittedCount: 0,
      }),
      false
    );
    assert.equal(
      shouldOpenEventCompanionOnly({ postAdmissionEnabled: true, canAccessPortal: false }),
      false
    );
    assert.equal(
      shouldOpenEventCompanionOnly({
        postAdmissionEnabled: false,
        canAccessPortal: true,
        admittedCount: 1,
      }),
      false
    );
    assert.equal(shouldOpenEventCompanionOnly(null), false);
  });

  it("changes opening memory key when admission epoch bumps after reset", () => {
    const before = openingMemoryKey("inv-1", "guest-1", 0);
    const after = openingMemoryKey("inv-1", "guest-1", 1);
    assert.notEqual(before, after);
  });
});
