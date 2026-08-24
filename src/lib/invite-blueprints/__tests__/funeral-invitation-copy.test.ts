import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFuneralProgramme,
  isGenericFuneralTitle,
  resolveDeceasedName,
  resolveFuneralCoverCopy,
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

  it("builds a four-step funeral programme", () => {
    const parts = formatInvitationDateParts(baseEvent.startDateRaw!);
    const steps = buildFuneralProgramme(baseEvent, parts);
    assert.equal(steps.length, 4);
    assert.match(steps[1]!.detail, /Presbyterian Church Sunyani Chiraa/);
    assert.equal(resolveDeceasedName(baseEvent), "Kwame Mensah");
  });
});
