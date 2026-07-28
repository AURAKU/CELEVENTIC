import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildEventCompanionHref,
  shouldOpenEventCompanionOnly,
} from "../event-companion";

describe("event companion routing", () => {
  it("builds companion href with optional guest token", () => {
    assert.equal(buildEventCompanionHref("abc"), "/invite/abc/event-day");
    assert.equal(
      buildEventCompanionHref("abc", "tok-1"),
      "/invite/abc/event-day?guest=tok-1"
    );
  });

  it("opens companion only when post-admission is enabled and portal unlocked", () => {
    assert.equal(
      shouldOpenEventCompanionOnly({ postAdmissionEnabled: true, canAccessPortal: true }),
      true
    );
    assert.equal(
      shouldOpenEventCompanionOnly({ postAdmissionEnabled: true, canAccessPortal: false }),
      false
    );
    assert.equal(
      shouldOpenEventCompanionOnly({ postAdmissionEnabled: false, canAccessPortal: true }),
      false
    );
    assert.equal(shouldOpenEventCompanionOnly(null), false);
  });
});
