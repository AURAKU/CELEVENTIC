import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  compactMeetingDesk,
  defaultMeetingDesk,
  listOpenMeetingSlots,
  persistMeetingDesk,
  serializeMeetingBooking,
  parseMeetingBooking,
  zonedWallTime,
} from "@/lib/digital-business-card/meetings";
import { listDigitalCardReachItems } from "@/lib/digital-business-card/socials";
import { DEMO_CARD } from "@/lib/digital-business-card/demo-card";

describe("CeleYou meeting desk", () => {
  it("opens weekday slots in Accra and skips taken times", () => {
    const desk = compactMeetingDesk({
      enabled: true,
      title: "Book a sitting",
      durationMin: 30,
      timezone: "Africa/Accra",
      weekdays: [1],
      startHour: 9,
      endHour: 10,
      bufferMin: 0,
      noticeHours: 0,
      horizonDays: 8,
      place: "Video",
    })!;
    const monday = zonedWallTime("Africa/Accra", 2026, 11, 9, 8, 0);
    assert.equal(monday.getUTCDay(), 1);
    const slots = listOpenMeetingSlots(desk, [], monday);
    assert.ok(slots.length >= 2);
    assert.equal(slots[0]?.timeLabel, "09:00");
    assert.equal(slots[1]?.timeLabel, "09:30");
    const blocked = listOpenMeetingSlots(desk, [slots[0]!.start], monday);
    assert.equal(blocked.some((slot) => slot.start === slots[0]!.start), false);
    assert.equal(blocked[0]?.timeLabel, "09:30");
  });

  it("stays off the guest card until enabled", () => {
    assert.equal(persistMeetingDesk(defaultMeetingDesk()), undefined);
    const items = listDigitalCardReachItems({
      email: null,
      phone: null,
      website: null,
      socials: { meeting: defaultMeetingDesk() },
    });
    assert.equal(items.some((item) => item.brand === "meeting"), false);
  });

  it("publishes Ama's sitting tap on the dummy card", () => {
    const items = listDigitalCardReachItems(DEMO_CARD);
    const meet = items.find((item) => item.brand === "meeting");
    assert.equal(meet?.title, "Book a sitting");
    assert.equal(meet?.subtitle, "30 min · Video");
    assert.equal(meet?.surface, "stack");
  });

  it("packs a booking the inbox can read", () => {
    const packed = serializeMeetingBooking({
      start: "2026-11-10T09:00:00.000Z",
      end: "2026-11-10T09:30:00.000Z",
      timezone: "Africa/Accra",
      title: "Book a sitting",
      place: "Video",
      note: "Lookbook review",
    });
    const parsed = parseMeetingBooking(packed);
    assert.equal(parsed?.title, "Book a sitting");
    assert.equal(parsed?.place, "Video");
    assert.equal(parsed?.note, "Lookbook review");
  });
});
