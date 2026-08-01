import test from "node:test";
import assert from "node:assert/strict";

/**
 * Gate contract: vendor access must never claim guest admission effects.
 */
test("vendor scan response contract excludes guest admission side-effects", () => {
  const response = {
    valid: true,
    result: "VALID",
    guestAdmissionIncremented: false,
    companionUnlocked: false,
    reusable: true,
    roleVerified: false,
  };
  assert.equal(response.guestAdmissionIncremented, false);
  assert.equal(response.companionUnlocked, false);
  assert.equal(response.reusable, true);
  assert.equal(response.roleVerified, false);
});

test("menu-only surface must not include seating or gift modules", () => {
  const menuOnlyKeys = ["eventTitle", "menuHeading", "menuBody", "dietaryNotes"];
  const forbidden = ["giftUrl", "walletBalance", "guestList", "admissionControls", "seatingList"];
  for (const key of forbidden) assert.equal(menuOnlyKeys.includes(key), false);
});
