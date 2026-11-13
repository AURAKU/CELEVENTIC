import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  compactMeetingDesk,
  defaultMeetingDesk,
  groupMeetingDays,
  listOpenMeetingSlots,
  meetingReplyCopy,
  persistMeetingDesk,
  serializeMeetingBooking,
  parseMeetingBooking,
  whatsappComposeHref,
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
    const days = groupMeetingDays(slots);
    assert.ok(days.length >= 1);
    assert.equal(days[0]?.slots[0]?.timeLabel, "09:00");
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

  it("lets guests pick a day and time, then messages the cardholder", () => {
    const drop = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-meeting-drop.tsx"),
      "utf8"
    );
    const desk = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-meeting-desk.tsx"),
      "utf8"
    );
    const inbox = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-connection-inbox.tsx"),
      "utf8"
    );
    assert.match(drop, /Request this time/);
    assert.match(drop, /You picked/);
    assert.match(drop, /1 Day/);
    assert.match(drop, /gets a message to confirm/);
    assert.match(drop, /celecardPaperTone/);
    assert.match(drop, /celecard-meet-chip/);
    assert.match(drop, /CELECARD_REACH_INK/);
    assert.doesNotMatch(drop, /Pick a day, then a time/);
    const grid = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-reach-grid.tsx"),
      "utf8"
    );
    assert.doesNotMatch(grid, /Pick a day and time\. They get a message to confirm/);
    assert.doesNotMatch(drop, /color: on \? "#fff" : theme\.accent/);
    assert.match(desk, /Guests can book a time/);
    assert.match(desk, /Soonest/);
    assert.match(inbox, /Confirm this time/);
    assert.match(inbox, /Cannot make this time/);
    assert.match(inbox, /Confirm on WhatsApp/);
    const route = readFileSync(
      join(process.cwd(), "src/app/api/digital-business-cards/[id]/connections/route.ts"),
      "utf8"
    );
    assert.match(route, /meetingReply/);
  });

  it("writes a confirm message the guest can receive", () => {
    const copy = meetingReplyCopy({
      kind: "confirm",
      ownerName: "Ama Serwaa",
      guestName: "Kojo Mensah",
      booking: {
        start: "2026-11-12T09:00:00.000Z",
        end: "2026-11-12T09:30:00.000Z",
        timezone: "Africa/Accra",
        title: "Book a sitting",
        place: "Video",
        note: "",
      },
    });
    assert.match(copy.subject, /Ama confirmed your time/);
    assert.match(copy.body, /Kojo/);
    assert.match(copy.body, /Book a sitting/);
    assert.equal(whatsappComposeHref("+233 24 000 1111", copy.body)?.startsWith("https://wa.me/233"), true);
  });
});
