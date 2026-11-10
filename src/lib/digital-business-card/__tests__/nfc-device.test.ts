import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  NFC_TAP_COPY,
  nfcDeviceMayPause,
  nfcDeviceMayReplace,
  nfcDeviceMayReportLost,
  nfcDeviceMayResume,
  nfcStudioPath,
  nfcTapOutcome,
  pickCurrentNfcDevice,
} from "@/lib/digital-business-card/nfc-device";

describe("NFC tap outcomes", () => {
  it("opens only an active, enabled, shareable card and counts that as an NFC tap", () => {
    assert.equal(
      nfcTapOutcome({ deviceStatus: "ACTIVE", nfcEnabled: true, guestShareable: true }),
      "open"
    );
  });

  it("does not treat a page view as an NFC tap when the owner paused the card", () => {
    assert.equal(
      nfcTapOutcome({ deviceStatus: "ACTIVE", nfcEnabled: false, guestShareable: true }),
      "paused"
    );
    assert.equal(
      nfcTapOutcome({ deviceStatus: "DISABLED", nfcEnabled: true, guestShareable: true }),
      "paused"
    );
  });

  it("keeps lost and replaced tags off the live profile", () => {
    assert.equal(nfcTapOutcome({ deviceStatus: "LOST", nfcEnabled: true, guestShareable: true }), "lost");
    assert.equal(
      nfcTapOutcome({ deviceStatus: "REPLACED", nfcEnabled: true, guestShareable: true }),
      "replaced"
    );
    assert.equal(nfcTapOutcome({ deviceStatus: null, nfcEnabled: true, guestShareable: true }), "unknown");
  });

  it("still sends unpublished or courtesy identities to the public page without an NFC success", () => {
    assert.equal(
      nfcTapOutcome({ deviceStatus: "ACTIVE", nfcEnabled: true, guestShareable: false }),
      "profile"
    );
  });

  it("uses distinct visitor copy that never mentions billing", () => {
    assert.match(NFC_TAP_COPY.lost.heading, /lost/i);
    assert.match(NFC_TAP_COPY.paused.body, /QR or link/);
    assert.equal(/plan|pay|₵|billing/i.test(JSON.stringify(NFC_TAP_COPY)), false);
  });

  it("limits owner actions by device status", () => {
    assert.equal(nfcDeviceMayPause("ACTIVE"), true);
    assert.equal(nfcDeviceMayResume("DISABLED"), true);
    assert.equal(nfcDeviceMayResume("LOST"), false);
    assert.equal(nfcDeviceMayReportLost("REPLACED"), false);
    assert.equal(nfcDeviceMayReplace("LOST"), true);
    assert.equal(nfcStudioPath("card_1"), "/dashboard/business-card/nfc?card=card_1");
  });

  it("keeps a paused or lost tag as the current card instead of minting a replacement", () => {
    assert.equal(
      pickCurrentNfcDevice([
        { id: "old", status: "REPLACED" },
        { id: "paused", status: "DISABLED" },
      ])?.id,
      "paused"
    );
    assert.equal(
      pickCurrentNfcDevice([
        { id: "paused", status: "DISABLED" },
        { id: "live", status: "ACTIVE" },
      ])?.id,
      "live"
    );
    assert.equal(pickCurrentNfcDevice([{ id: "retired", status: "REPLACED" }]), null);
  });
});
