import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isOpenHostInvitation } from "@/services/guest-search/rsvp-self-registration.service";

describe("isOpenHostInvitation", () => {
  it("treats ceremony-titled and empty invitations as open hosts", () => {
    assert.equal(
      isOpenHostInvitation({
        name: "Traditional Marriage Ceremony",
        eventTitle: "Traditional Marriage Ceremony",
        guests: [],
      }),
      true
    );
    assert.equal(
      isOpenHostInvitation({
        name: "John Mensah",
        eventTitle: "Traditional Marriage Ceremony",
        guests: [],
      }),
      true
    );
  });

  it("treats personalised invitations with matching guest names as closed", () => {
    assert.equal(
      isOpenHostInvitation({
        name: "The Obuah family",
        eventTitle: "Traditional Marriage Ceremony",
        guests: [{ name: "The Obuah family" }],
      }),
      false
    );
  });

  it("treats invitations whose guests do not match the invite name as open", () => {
    assert.equal(
      isOpenHostInvitation({
        name: "Traditional Marriage Ceremony",
        eventTitle: "Traditional Marriage Ceremony",
        guests: [{ name: "Ama Mensah" }, { name: "Kofi Boateng" }],
      }),
      true
    );
  });

  it("never treats general-pass batches as open RSVP hosts", () => {
    assert.equal(
      isOpenHostInvitation({
        name: "Gate Batch A",
        isGeneralPass: true,
        eventTitle: "Traditional Marriage Ceremony",
        guests: [],
      }),
      false
    );
  });
});
