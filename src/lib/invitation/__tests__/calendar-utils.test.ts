import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGoogleCalendarUrl,
  buildIcsContent,
  calendarEventLocation,
  defaultReminderMinutes,
  hasValidCalendarWindow,
  toGoogleCalendarDates,
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

  it("embeds the Femmora opening window in UTC with Nairobi display zone", async () => {
    const { FEMMORA_HOUSE_DEFAULTS } = await import(
      "@/lib/experience/luxury-fashion/femmora-preset"
    );
    const url = buildGoogleCalendarUrl({
      title: "FEMMORA Soft Opening",
      startDateRaw: FEMMORA_HOUSE_DEFAULTS.startAtIso,
      endDateRaw: FEMMORA_HOUSE_DEFAULTS.endAtIso,
      venue: "FEMMORA GH, Westlands",
      timeZone: FEMMORA_HOUSE_DEFAULTS.timeZone,
    });
    assert.match(url, /dates=20260829T060000Z%2F20260830T170000Z/);
    assert.match(url, /ctz=Africa%2FNairobi/);
    assert.match(url, /location=FEMMORA/);
  });

  it("refuses invalid calendar windows", () => {
    assert.equal(hasValidCalendarWindow({ title: "x", startDateRaw: "not-a-date" }), false);
    assert.equal(toGoogleCalendarDates("garbage"), "");
    assert.equal(buildGoogleCalendarUrl({ title: "x", startDateRaw: "not-a-date" }), "");
  });

  it("builds an all-day save-the-date when the clock time is pending", () => {
    const event = {
      title: "Kojo & Fafa · Wedding Ceremony",
      startDateRaw: "2026-11-14T00:00:00+00:00",
      venue: "The Forest Grove Event",
      timeZone: "Africa/Accra",
      allDay: true,
      description: "Time details to be announced.",
    };
    assert.deepEqual(defaultReminderMinutes(event), [1440]);
    assert.equal(toGoogleCalendarDates(event.startDateRaw, undefined, { allDay: true }), "20261114/20261115");
    const google = buildGoogleCalendarUrl(event);
    assert.match(google, /dates=20261114%2F20261115/);
    assert.match(google, /Time\+details/);
    assert.match(google, /location=The\+Forest\+Grove\+Event/);
    const ics = buildIcsContent(event);
    assert.match(ics, /DTSTART;VALUE=DATE:20261114/);
    assert.match(ics, /DTEND;VALUE=DATE:20261115/);
    assert.doesNotMatch(ics, /DTSTART:20261114T000000Z/);
  });

  it("joins venue name and street into the calendar location", () => {
    assert.equal(
      calendarEventLocation("The Forest Grove Event", "Adjacent to 335 Place, Dzorwulu"),
      "The Forest Grove Event, Adjacent to 335 Place, Dzorwulu"
    );
    const google = buildGoogleCalendarUrl({
      title: "Kojo & Fafa · Traditional Ceremony",
      startDateRaw: "2026-11-13T10:00:00+00:00",
      venue: calendarEventLocation("Westville Homes", "20 Onyasia Street, West Legon"),
      timeZone: "Africa/Accra",
    });
    assert.match(google, /dates=20261113T100000Z/);
    assert.match(google, /ctz=Africa%2FAccra/);
    assert.match(google, /Westville/);
    assert.match(google, /Onyasia/);
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

  it("pins place URLs to coordinates instead of a fuzzy address geocode", () => {
    const embed = toMapsEmbedUrl(
      "https://www.google.com/maps/place/The+Forest+Grove+Event/@5.621568,-0.18492,17z",
      "South Legon"
    );
    assert.match(embed ?? "", /q=5\.621568%2C-0\.18492/);
    assert.doesNotMatch(embed ?? "", /South/);
  });
});
