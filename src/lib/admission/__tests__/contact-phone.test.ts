import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  displayContactPhone,
  normalizeCallablePhone,
} from "@/lib/admission/contact-phone";
import { resolveCompanionTheme } from "@/lib/admission/event-companion-theme";
import { resolveSeatingContinuity } from "@/lib/admission/seating-continuity";
import { filterForeignPartyGuests } from "@/lib/invitation/party-isolation";

describe("normalizeCallablePhone / displayContactPhone", () => {
  it("treats missing, null, undefined, and empty as non-callable", () => {
    assert.equal(normalizeCallablePhone(undefined), "");
    assert.equal(normalizeCallablePhone(null), "");
    assert.equal(normalizeCallablePhone(""), "");
    assert.equal(normalizeCallablePhone("   "), "");
    assert.equal(displayContactPhone(undefined), "");
    assert.equal(displayContactPhone(null), "");
  });

  it("strips spaces from local numbers", () => {
    assert.equal(normalizeCallablePhone("024 123 4567"), "0241234567");
    assert.equal(displayContactPhone("024 123 4567"), "024 123 4567");
  });

  it("normalizes Ghana formatting while preserving +233", () => {
    assert.equal(normalizeCallablePhone("+233 24 123 4567"), "+233241234567");
    assert.equal(normalizeCallablePhone("+233-24-123-4567"), "+233241234567");
    assert.equal(normalizeCallablePhone("(024) 123-4567"), "0241234567");
  });

  it("keeps valid international numbers callable", () => {
    assert.equal(normalizeCallablePhone("+44 7700 900123"), "+447700900123");
  });

  it("does not invent a number for junk input", () => {
    assert.equal(normalizeCallablePhone("call me"), "");
    assert.equal(normalizeCallablePhone("+"), "");
  });
});

describe("Event Day phone action gating (regression for .replace crash)", () => {
  it("reproduces the production crash shape and proves the safe path", () => {
    // Production: event.contactPhone.replace(...) when contactPhone is undefined.
    const broken = undefined as unknown as string;
    assert.throws(() => broken.replace(/\s/g, ""), /Cannot read properties of undefined/);

    assert.doesNotThrow(() => {
      const callable = normalizeCallablePhone(undefined);
      assert.equal(callable, "");
      // No tel: link when empty — callers gate on Boolean(callablePhone).
      assert.equal(Boolean(callable), false);
    });
  });

  it("companion experience source no longer calls contactPhone.replace directly", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/admission/event-companion-experience.tsx"),
      "utf8"
    );
    assert.doesNotMatch(source, /contactPhone\.replace\(/);
    assert.match(source, /normalizeCallablePhone/);
    assert.match(source, /callablePhone/);
  });

  it("renders phone action only when callable; keeps other companion data intact", () => {
    const theme = resolveCompanionTheme({
      designConfig: {
        layout: "classic-gold",
        colors: {
          primary: "#3A2A2E",
          secondary: "#C7A35A",
          accent: "#D99A93",
          background: "#FBF6EF",
          text: "#3A2A2E",
        },
      },
      template: null,
    });
    assert.ok(theme.colors.primary);

    const absent = normalizeCallablePhone(null);
    const present = normalizeCallablePhone("+233 20 000 0000");
    assert.equal(absent, "");
    assert.ok(present.startsWith("+233"));
    assert.equal(`tel:${present}`, "tel:+233200000000");
  });
});

describe("Event Day companion edges still safe", () => {
  it("handles partial / full admission and no seating", () => {
    const seats = [
      {
        guestId: "g1",
        guestName: "Ada",
        tableNumber: "1",
        seatLabel: null,
        zone: null,
        admitted: true,
      },
      {
        guestId: "g2",
        guestName: "Bola",
        tableNumber: "1",
        seatLabel: null,
        zone: null,
        admitted: false,
      },
    ];
    assert.equal(resolveSeatingContinuity([], 2, 0).revealed.length, 0);
    assert.equal(resolveSeatingContinuity(seats, 2, 1).reserved.length, 1);
    assert.equal(
      resolveSeatingContinuity(
        seats.map((s) => ({ ...s, admitted: true })),
        2,
        2
      ).reserved.length,
      0
    );
  });

  it("preserves invitation-party isolation", () => {
    const filtered = filterForeignPartyGuests(
      [
        { id: "a", invitationId: "inv-1", name: "Ada Okon" },
        { id: "b", invitationId: "inv-2", name: "Bola Intruder" },
      ],
      {
        invitationId: "inv-1",
        invitationName: "Ada Okon",
        otherInvitationNames: [{ id: "inv-2", name: "Bola Intruder" }],
      }
    );
    assert.deepEqual(
      filtered.map((g) => g.id),
      ["a"]
    );
  });

  it("handles old invitation theme data without .replace crash", () => {
    assert.doesNotThrow(() => {
      const theme = resolveCompanionTheme({
        designConfig: {
          layout: "forever-afaris-wedding",
          colors: { secondary: undefined, background: undefined } as never,
        },
        template: { slug: "forever-afaris-wedding", config: {} },
      });
      theme.accentWash.replace("rgba", "rgba");
    });
  });
});
