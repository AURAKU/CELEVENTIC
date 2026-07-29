import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectDuplicateWarnings,
  duplicateProbe,
} from "../duplicate-guests";

describe("duplicateProbe", () => {
  it("prefers the longest distinctive token after stripping titles", () => {
    assert.equal(duplicateProbe("Mr Kofi Obuah"), "Obuah");
    assert.equal(duplicateProbe("Kofi"), "Kofi");
  });
});

describe("collectDuplicateWarnings", () => {
  const guests = [
    {
      kind: "guest" as const,
      id: "g1",
      name: "Kofi Mensah",
      email: "kofi@example.com",
      phone: "+233244123456",
    },
    {
      kind: "guest" as const,
      id: "g2",
      name: "Ama Boateng",
      email: null,
      phone: null,
    },
  ];

  it("flags case-insensitive trimmed name collisions", () => {
    const warnings = collectDuplicateWarnings(guests, { name: "  kofi mensah  " });
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].id, "g1");
    assert.match(warnings[0].message, /already on this event/i);
    assert.match(warnings[0].message, /distinguishing detail|edit the existing/i);
  });

  it("treats titled variants as the same person", () => {
    const warnings = collectDuplicateWarnings(guests, { name: "Mr. Kofi Mensah" });
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].id, "g1");
  });

  it("does not flag unrelated names", () => {
    const warnings = collectDuplicateWarnings(guests, { name: "Yaw Asante" });
    assert.equal(warnings.length, 0);
  });

  it("flags email collisions even when names differ", () => {
    const warnings = collectDuplicateWarnings(guests, {
      name: "Different Person",
      email: "kofi@example.com",
    });
    assert.equal(warnings.length, 1);
    assert.match(warnings[0].message, /already uses kofi@example.com/i);
  });

  it("flags phone collisions on the last 9 digits", () => {
    const warnings = collectDuplicateWarnings(guests, {
      name: "Someone Else",
      phone: "0244123456",
    });
    assert.equal(warnings.length, 1);
    assert.match(warnings[0].message, /phone number/i);
  });

  it("excludes the guest / invitation being edited", () => {
    const warnings = collectDuplicateWarnings(
      [
        ...guests,
        { kind: "invitation" as const, id: "inv1", name: "Kofi Mensah" },
      ],
      { name: "Kofi Mensah" },
      {
        excludeGuestIds: new Set(["g1"]),
        excludeInvitationIds: new Set(["inv1"]),
      }
    );
    assert.equal(warnings.length, 0);
  });

  it("flags invitation-only name collisions", () => {
    const warnings = collectDuplicateWarnings(
      [{ kind: "invitation" as const, id: "inv9", name: "The Asante Family" }],
      { name: "the asante family" }
    );
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].kind, "invitation");
    assert.match(warnings[0].message, /already exists|Adjust the name/i);
  });
});
