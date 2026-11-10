import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { celeCardCheckoutUi } from "../checkout-outcome";

describe("CeleYou checkout outcome copy", () => {
  it("treats SUCCESSFUL as activation, FAILED as no activation, and anything else as pending", () => {
    assert.equal(celeCardCheckoutUi("SUCCESSFUL").kind, "success");
    assert.equal(celeCardCheckoutUi("FAILED").kind, "error");
    assert.equal(celeCardCheckoutUi("PENDING").kind, "pending");
    assert.equal(celeCardCheckoutUi(undefined).kind, "pending");
    assert.match(celeCardCheckoutUi("FAILED").text, /not activated/);
    assert.match(celeCardCheckoutUi("PENDING").text, /still processing/);
    assert.equal(celeCardCheckoutUi("SUCCESSFUL", false).kind, "error");
    assert.match(celeCardCheckoutUi("SUCCESSFUL", false).text, /not live yet/);
    assert.equal(celeCardCheckoutUi("SUCCESSFUL", true).kind, "success");
  });
});
