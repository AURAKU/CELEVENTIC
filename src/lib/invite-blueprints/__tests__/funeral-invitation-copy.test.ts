import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFuneralProgramme,
  isGenericFuneralTitle,
  parseMemorialNameCard,
  resolveDeceasedName,
  resolveFuneralCoverCopy,
  resolveMemorialAgeYears,
} from "@/lib/invite-blueprints/funeral-invitation-copy";
import { formatInvitationDateParts } from "@/lib/invitation-templates";

const baseEvent = {
  title: "The Funeral",
  hostName: "Kwame Mensah",
  description: null,
  startDate: "",
  startDateRaw: "2026-09-25T00:00:00.000Z",
  venueName: "Presbyterian Church Sunyani Chiraa",
  landmark: null,
  mapsLink: null,
  contactPhone: null,
  dressCode: null,
};

describe("funeral invitation copy", () => {
  it("detects generic funeral titles", () => {
    assert.equal(isGenericFuneralTitle("The Funeral"), true);
    assert.equal(isGenericFuneralTitle("Celebration of Life"), true);
    assert.equal(isGenericFuneralTitle("Kwame Mensah"), false);
  });

  it("prefers host name as deceased headline for generic titles", () => {
    const copy = resolveFuneralCoverCopy(baseEvent, "IN LOVING MEMORY");
    assert.equal(copy.headline, "Kwame Mensah");
    assert.equal(copy.eyebrow, "IN LOVING MEMORY");
  });

  it("extracts honouree from tribute titles when host is the family", () => {
    const event = {
      ...baseEvent,
      title: "Tribute for Professor Ama Darkoa",
      hostName: "The Darkoa Family",
    };
    assert.equal(resolveDeceasedName(event), "Professor Ama Darkoa");
    const copy = resolveFuneralCoverCopy(event, "IN LOVING MEMORY");
    assert.equal(copy.headline, "Professor Ama Darkoa");
    assert.equal(copy.subtitle, "Celebration of Life");
  });

  it("parses Ghanaian honorific, A.K.A, and lifespan for the memorial card", () => {
    const card = parseMemorialNameCard(
      "OBAAPANIN VIDA SERWAA A.K.A MADAM VIDA •- 1953 -2026"
    );
    assert.equal(card.honorific, "OBAAPANIN");
    assert.equal(card.primary, "VIDA SERWAA");
    assert.equal(card.aka, "MADAM VIDA");
    assert.equal(card.years, "1953 – 2026");
  });

  it("resolves memorial age years from lifespan", () => {
    assert.equal(resolveMemorialAgeYears("1953 – 2026"), 73);
    assert.equal(resolveMemorialAgeYears("1953-2026"), 73);
    assert.equal(resolveMemorialAgeYears(null), null);
  });

  it("prefers an explicit honouree over generic funeral title", () => {
    const event = { ...baseEvent, hostName: "The Serwaa Family" };
    assert.equal(
      resolveDeceasedName(
        event,
        "THE FUNERAL",
        "OBAAPANIN VIDA SERWAA A.K.A MADAM VIDA · 1953 – 2026"
      ),
      "OBAAPANIN VIDA SERWAA A.K.A MADAM VIDA · 1953 – 2026"
    );
  });

  it("builds Ghanaian funeral arrangements programme", () => {
    const parts = formatInvitationDateParts(baseEvent.startDateRaw!);
    const steps = buildFuneralProgramme(baseEvent, parts);
    assert.equal(steps.length, 4);
    assert.equal(steps[0]!.title, "Laying in state");
    assert.match(steps[0]!.detail, /Presbyterian Church Sunyani Chiraa/);
    assert.match(steps[0]!.detail, /4:30am/);
    assert.equal(steps[0]!.place, "Presbyterian Church Sunyani Chiraa");
    assert.equal(steps[0]!.time, "4:30am – 9:00am");
    assert.equal(steps[1]!.title, "Interment");
    assert.match(steps[1]!.detail, /Sunyani Chiraa Cemetery/);
    assert.equal(steps[1]!.place, "Sunyani Chiraa Cemetery");
    assert.equal(steps[1]!.time, undefined);
    assert.equal(steps[2]!.title, "Final funeral rites");
    assert.match(steps[2]!.detail, /1:00pm/);
    assert.equal(steps[3]!.title, "Thanksgiving service");
    assert.match(steps[3]!.detail, /Sunday/);
    assert.match(steps[3]!.detail, /9:00am/);
    assert.equal(resolveDeceasedName(baseEvent), "Kwame Mensah");
  });
});
