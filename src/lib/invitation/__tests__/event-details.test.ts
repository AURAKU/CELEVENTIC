import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatEventDetailsDate,
  formatEventDetailsTime,
  resolveEventDetailsItems,
} from "../../invitation-blocks/event-details";

describe("invitation event details", () => {
  it("splits the authoritative event start into date-only and ceremony time rows", () => {
    const rows = resolveEventDetailsItems(
      [
        { label: "Date", value: "13 AUG 2026, 10:00 AM" },
        { label: "Time", value: "" },
        { label: "Venue", value: "BAMBOO DEVELOPERS" },
      ],
      {
        eventTitle: "Traditional Marriage",
        hostName: "The Couple",
        eventDate: "13 AUG 2026, 10:00 AM",
        eventDateRaw: "2026-08-13T10:00:00.000Z",
        venueName: "BAMBOO DEVELOPERS",
      }
    );

    assert.equal(rows.find((row) => row.label === "Date")?.value, "13 Aug 2026");
    assert.equal(rows.find((row) => row.label === "Time")?.value, "10:00 AM");
    assert.equal(rows.find((row) => row.label === "Venue")?.value, "BAMBOO DEVELOPERS");
  });

  it("prefers an explicit order or vision-board ceremony time and normalizes it", () => {
    assert.equal(formatEventDetailsTime("10:00"), "10:00 AM");
    assert.equal(formatEventDetailsTime("10:00AM"), "10:00 AM");
    assert.equal(
      formatEventDetailsTime("2:30 PM", "2026-08-13T10:00:00.000Z"),
      "2:30 PM"
    );
  });

  it("never leaves clock text in the DATE value", () => {
    assert.equal(formatEventDetailsDate(undefined, "13 AUG 2026, 10:00 AM"), "13 Aug 2026");
    assert.equal(formatEventDetailsDate(undefined, "Ceremony Day at 10:00 AM"), "Ceremony Day");
  });
});
