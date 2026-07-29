import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveGuestFacingEventInstant,
  resolveGuestFacingVenue,
} from "../guest-event-details";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import { formatDate } from "@/lib/utils";

function foreverAfarisDesign(
  weddingBoard?: NonNullable<InvitationDesignConfig["studio"]>["weddingBoard"]
): Pick<InvitationDesignConfig, "layout" | "studio"> {
  return {
    layout: "forever-afaris-wedding",
    studio: { weddingBoard },
  };
}

describe("resolveGuestFacingEventInstant", () => {
  it("uses the merged Forever Afaris ceremony target instead of midnight", () => {
    const eventStartDate = new Date("2026-08-15T00:00:00.000Z");

    const resolved = resolveGuestFacingEventInstant(eventStartDate, foreverAfarisDesign());

    assert.equal(resolved.toISOString(), "2026-08-15T14:00:00.000Z");
    assert.equal(formatDate(resolved), "15 Aug 2026, 2:00 pm");
  });

  it("honours a host-edited wedding-board ceremony target", () => {
    const resolved = resolveGuestFacingEventInstant(
      "2026-08-15T00:00:00.000Z",
      foreverAfarisDesign({ countdownTarget: "2026-08-15T16:30:00" })
    );

    assert.equal(resolved.toISOString(), "2026-08-15T16:30:00.000Z");
  });

  it("falls back to Event.startDate for invalid targets and other layouts", () => {
    const eventStartDate = new Date("2027-01-02T18:45:00.000Z");

    assert.equal(
      resolveGuestFacingEventInstant(
        eventStartDate,
        foreverAfarisDesign({ countdownTarget: "not-a-date" })
      ).toISOString(),
      eventStartDate.toISOString()
    );
    assert.equal(
      resolveGuestFacingEventInstant(eventStartDate, {
        layout: "classic-gold",
      }).toISOString(),
      eventStartDate.toISOString()
    );
  });
});

describe("resolveGuestFacingVenue", () => {
  it("uses the wedding-board venue only when Event venue is absent", () => {
    const design = foreverAfarisDesign({ venueName: "Ceremony Gardens" });

    assert.equal(resolveGuestFacingVenue(null, design), "Ceremony Gardens");
    assert.equal(resolveGuestFacingVenue("Event Hall", design), "Event Hall");
    assert.equal(resolveGuestFacingVenue(null, { layout: "classic-gold" }), null);
  });
});
