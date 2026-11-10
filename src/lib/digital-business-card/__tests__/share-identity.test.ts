import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  celeYouShareIdentity,
  isReservedCeleYouShareToken,
  shareIdentityArtifactsAreUnique,
} from "@/lib/digital-business-card/share-identity";
import { demoCardPreviewQrSrc } from "@/lib/digital-business-card/demo-card";

describe("CeleYou unique share identity", () => {
  it("keeps profile URL, Smart QR, and NFC tap on three different tokens", () => {
    const identity = celeYouShareIdentity({
      slug: "kojo-mensah",
      publicToken: "cmqr_kojo",
      nfcToken: "cmnfc_kojo",
      origin: "https://www.celeventic.com",
    });
    assert.equal(identity.profileUrl, "https://www.celeventic.com/u/kojo-mensah");
    assert.equal(identity.qrUrl, "https://www.celeventic.com/c/cmqr_kojo");
    assert.equal(identity.nfcUrl, "https://www.celeventic.com/n/cmnfc_kojo");
    assert.equal(shareIdentityArtifactsAreUnique(identity), true);
  });

  it("rejects shared or reserved dummy tokens for real cardholders", () => {
    assert.equal(isReservedCeleYouShareToken("demo-ama-serwaa"), true);
    assert.equal(isReservedCeleYouShareToken("nfc-ama-serwaa"), true);
    assert.equal(
      shareIdentityArtifactsAreUnique({
        slug: "ama-serwaa",
        publicToken: "demo-ama-serwaa",
        nfcToken: "nfc-ama-serwaa",
      }),
      false
    );
    assert.equal(
      shareIdentityArtifactsAreUnique({
        slug: "kojo-mensah",
        publicToken: "same-token",
        nfcToken: "same-token",
      }),
      false
    );
  });

  it("gives each template look its own dummy QR bitmap", () => {
    const gold = demoCardPreviewQrSrc("gold-folio");
    const teal = demoCardPreviewQrSrc("teal-pulse");
    assert.notEqual(gold, teal);
    assert.equal(gold.includes("demo-ama-serwaa"), false);
    assert.match(gold, /digital-cards/);
    assert.match(gold, /look%3Dgold-folio/);
  });
});
