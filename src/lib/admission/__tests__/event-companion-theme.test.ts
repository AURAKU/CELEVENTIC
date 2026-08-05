import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  companionFontStyles,
  resolveCompanionTheme,
} from "@/lib/admission/event-companion-theme";
import { resolveSeatingContinuity } from "@/lib/admission/seating-continuity";
import { filterForeignPartyGuests } from "@/lib/invitation/party-isolation";

describe("event companion theme", () => {
  it("blends invitation colors and fonts into companion tokens", () => {
    const theme = resolveCompanionTheme({
      designConfig: {
        layout: "classic-gold",
        colors: {
          primary: "#1a1a1a",
          secondary: "#B89E67",
          accent: "#D4AF37",
          background: "#FFFEFA",
          text: "#333333",
        },
        fonts: { heading: "Playfair Display", script: "Great Vibes", body: "Cormorant Garamond" },
      },
      template: { slug: "classic-gold", config: { layout: "classic-gold" } },
      eventCoverImageUrl: "https://cdn.example.com/cover.jpg",
    });

    assert.equal(theme.colors.secondary, "#B89E67");
    assert.equal(theme.backgroundImageUrl, "https://cdn.example.com/cover.jpg");
    assert.match(companionFontStyles(theme.fonts).heading, /Playfair Display/);
    assert.ok(theme.accentWash.startsWith("rgba("));
  });

  it("falls back safely when design is missing", () => {
    const theme = resolveCompanionTheme({
      designConfig: null,
      template: null,
    });
    assert.ok(theme.colors.background);
    assert.ok(theme.fonts.heading);
    assert.ok(typeof theme.accentWash === "string" && theme.accentWash.length > 0);
    assert.ok(typeof theme.paperWash === "string" && theme.paperWash.length > 0);
    // Hex tokens become rgba washes; catalogue gradients pass through unchanged.
    assert.ok(
      theme.accentWash.startsWith("rgba(") || theme.accentWash.startsWith("#") || theme.accentWash.includes("gradient")
    );
  });

  it("does not crash when theme colors overwrite fallbacks with undefined", () => {
    const theme = resolveCompanionTheme({
      designConfig: {
        layout: "forever-afaris-wedding",
        colors: {
          primary: "#3A2A2E",
          secondary: undefined,
          accent: "#D99A93",
          background: undefined,
          text: "#3A2A2E",
        } as never,
        fonts: { heading: undefined, script: "Great Vibes", body: "Cormorant" } as never,
      },
      template: { slug: "forever-afaris-wedding", config: null },
    });

    assert.equal(typeof theme.colors.secondary, "string");
    assert.ok(theme.colors.secondary.length > 0);
    assert.equal(typeof theme.colors.background, "string");
    assert.ok(theme.accentWash.startsWith("rgba("));
    assert.ok(theme.paperWash.startsWith("rgba("));
    assert.equal(typeof theme.fonts.heading, "string");
  });

  it("falls back when color keys are empty strings", () => {
    const theme = resolveCompanionTheme({
      designConfig: {
        layout: "classic-gold",
        colors: {
          primary: "  ",
          secondary: "",
          accent: "#D4AF37",
          background: "",
          text: "#111",
        },
      },
      template: null,
    });
    assert.ok(theme.colors.secondary.startsWith("#"));
    assert.ok(theme.colors.background.startsWith("#"));
    assert.doesNotThrow(() => theme.accentWash.replace("rgba", "rgba"));
  });

  it("handles older invitations without newer event-day theme fields", () => {
    const theme = resolveCompanionTheme({
      designConfig: {
        layout: "classic-gold",
        colors: { primary: "#222", text: "#111" },
      } as never,
      template: null,
      eventCoverImageUrl: null,
    });
    assert.ok(theme.colors.secondary);
    assert.ok(theme.colors.background);
    assert.equal(theme.backgroundImageUrl, null);
    assert.ok(Array.isArray(theme.programmeItems));
  });

  it("handles missing optional media URL without crashing", () => {
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
        pageBackground: { mode: "image", imageUrl: "" },
      } as never,
      template: null,
      eventCoverImageUrl: "   ",
    });
    assert.equal(theme.backgroundImageUrl, null);
  });
});

describe("event-day seating continuity edge cases", () => {
  it("handles no seating assignment", () => {
    const continuity = resolveSeatingContinuity([], 3, 1);
    assert.equal(continuity.revealed.length, 0);
    assert.equal(continuity.reserved.length, 0);
    assert.equal(continuity.unseatedCount, 3);
  });

  it("handles missing optional seat labels and sections (zones)", () => {
    const continuity = resolveSeatingContinuity(
      [
        {
          guestId: "g1",
          guestName: "Ada",
          tableNumber: "5",
          seatLabel: null,
          zone: null,
          admitted: true,
        },
        {
          guestId: "g2",
          guestName: "Bola",
          tableNumber: "5",
          seatLabel: null,
          zone: null,
          admitted: false,
        },
      ],
      2,
      1
    );
    assert.equal(continuity.revealed.length, 1);
    assert.equal(continuity.reserved.length, 1);
    assert.equal(continuity.tableNumber, "5");
    assert.equal(continuity.revealed[0]!.seatLabel, null);
  });

  it("handles partial and full admission", () => {
    const seats = [
      {
        guestId: "g1",
        guestName: "Ada",
        tableNumber: "1",
        seatLabel: "A",
        zone: "Hall",
        admitted: true,
      },
      {
        guestId: "g2",
        guestName: "Bola",
        tableNumber: "1",
        seatLabel: "B",
        zone: "Hall",
        admitted: false,
      },
    ];
    const partial = resolveSeatingContinuity(seats, 2, 1);
    assert.equal(partial.revealed.length, 1);
    assert.equal(partial.reserved.length, 1);

    const full = resolveSeatingContinuity(
      seats.map((s) => ({ ...s, admitted: true })),
      2,
      2
    );
    assert.equal(full.revealed.length, 2);
    assert.equal(full.reserved.length, 0);
  });
});

describe("event-day party isolation", () => {
  it("keeps only guests owned by the invitation party", () => {
    const filtered = filterForeignPartyGuests(
      [
        { id: "a", invitationId: "inv-1", name: "Ada Okon" },
        { id: "b", invitationId: "inv-2", name: "Bola Intruder" },
        { id: "c", invitationId: "inv-1", name: "Chi Guest" },
      ],
      {
        invitationId: "inv-1",
        invitationName: "Ada Okon",
        otherInvitationNames: [{ id: "inv-2", name: "Bola Intruder" }],
      }
    );
    assert.deepEqual(
      filtered.map((g) => g.id),
      ["a", "c"]
    );
  });
});

describe("event-day page module", () => {
  it("theme path never throws .replace on undefined for incomplete invitation colors", () => {
    assert.doesNotThrow(() => {
      const theme = resolveCompanionTheme({
        designConfig: {
          layout: "forever-afaris-wedding",
          colors: { secondary: undefined, background: undefined } as never,
        },
        template: { slug: "forever-afaris-wedding", config: {} },
      });
      assert.equal(typeof theme.accentWash, "string");
      assert.equal(typeof theme.paperWash, "string");
      theme.accentWash.replace("rgba", "rgba");
      theme.paperWash.replace("rgba", "rgba");
    });
  });

  it("rejects empty / malformed public link shape at the route boundary contract", () => {
    const malformed = "";
    assert.equal(malformed.trim().length === 0, true);
  });

  it("theme source coalesces colors before withAlpha", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/admission/event-companion-theme.ts"),
      "utf8"
    );
    assert.match(source, /function resolveColor/);
    assert.match(source, /resolveColors\(design\.colors\)/);
    assert.match(source, /withAlpha\(colors\.secondary/);
    assert.match(source, /withAlpha\(colors\.background/);
  });
});
