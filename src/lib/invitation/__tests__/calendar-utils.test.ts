import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGoogleCalendarUrl,
  buildIcsContent,
  defaultReminderMinutes,
  toMapsEmbedUrl,
} from "@/lib/invitation/calendar-utils";

describe("calendar reminders", () => {
  const event = {
    title: "Funeral service — Madam Vida",
    startDateRaw: "2026-09-25T08:00:00.000Z",
    venue: "Presbyterian Church Sunyani Chiraa",
    description: "Memorial service",
    reminderMinutesBefore: [1440, 120, 30],
  };

  it("defaults funeral-style reminder offsets", () => {
    assert.deepEqual(defaultReminderMinutes(event), [1440, 120, 30]);
    assert.deepEqual(defaultReminderMinutes({ ...event, reminderMinutesBefore: undefined }), [
      1440, 60,
    ]);
  });

  it("embeds VALARM blocks in ICS for pre-event reminders", () => {
    const ics = buildIcsContent(event);
    assert.match(ics, /BEGIN:VALARM/);
    assert.match(ics, /TRIGGER:-PT1440M/);
    assert.match(ics, /TRIGGER:-PT120M/);
    assert.match(ics, /TRIGGER:-PT30M/);
    assert.match(ics, /SUMMARY:Funeral service/);
    assert.match(ics, /LOCATION:Presbyterian Church Sunyani Chiraa/);
  });

  it("builds a Google Calendar template URL", () => {
    const url = buildGoogleCalendarUrl(event);
    assert.match(url, /calendar\.google\.com/);
    assert.match(url, /action=TEMPLATE/);
    assert.match(url, /Reminders/);
  });
});

describe("maps embed URLs", () => {
  it("parses scheme-less Google Maps search links", () => {
    const embed = toMapsEmbedUrl(
      "www.google.com/maps/search/?api=1&query=Femmora%20GH%20Westlands",
      "FEMMORA GH, Westlands"
    );
    assert.match(embed ?? "", /^https:\/\/maps\.google\.com\/maps\?q=/);
    assert.match(embed ?? "", /Femmora/);
  });
});
