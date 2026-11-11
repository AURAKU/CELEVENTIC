import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { DEFAULT_PRODUCTION_URL } from "@/lib/app-url";
import {
  celeYouAbsoluteGuestPayload,
  celeYouCameraScanUrl,
  celeYouNfcScanUrl,
  celeYouScanLandingUrl,
  celeYouShareIdentity,
  isCeleYouCameraScanUrl,
  isCeleYouProductionGuestUrl,
  isReservedCeleYouShareToken,
  shareIdentityArtifactsAreUnique,
} from "@/lib/digital-business-card/share-identity";
import { demoCardPreviewQrSrc } from "@/lib/digital-business-card/demo-card";
import { digitalCardQrImageSrc } from "@/lib/digital-business-card/types";

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

  it("rewrites localhost onto the live domain and keeps each card's QR unique", () => {
    const kojo = celeYouShareIdentity({
      slug: "kojo-mensah",
      publicToken: "cmqr_kojo_live",
      nfcToken: "cmnfc_kojo_live",
      origin: "http://localhost:3000",
    });
    const ama = celeYouShareIdentity({
      slug: "ama-serwaa",
      publicToken: "cmqr_ama_live",
      nfcToken: "cmnfc_ama_live",
    });
    assert.equal(kojo.qrUrl, `${DEFAULT_PRODUCTION_URL}/c/cmqr_kojo_live`);
    assert.equal(kojo.nfcUrl, `${DEFAULT_PRODUCTION_URL}/n/cmnfc_kojo_live`);
    assert.equal(kojo.profileUrl, `${DEFAULT_PRODUCTION_URL}/u/kojo-mensah`);
    assert.notEqual(kojo.qrUrl, ama.qrUrl);
    assert.notEqual(kojo.nfcUrl, ama.nfcUrl);
    assert.doesNotMatch(kojo.qrUrl, /localhost|127\.0\.0\.1/);
    const src = digitalCardQrImageSrc(kojo.qrUrl);
    assert.match(src, /data=https%3A%2F%2Fwww.celeventic.com%2Fc%2Fcmqr_kojo_live/);
    const studio = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-studio-client.tsx"),
      "utf8"
    );
    assert.match(studio, /getCeleYouShareOrigin/);
    assert.match(studio, /celeYouCameraScanUrl\(active\.publicToken, origin\)/);
  });

  it("encodes a camera-safe HTTPS Smart QR that lands on the public profile", () => {
    const scan = celeYouCameraScanUrl("cmqr_kojo_live", "http://127.0.0.1:3000");
    assert.equal(isCeleYouCameraScanUrl(scan), true);
    assert.equal(scan, `${DEFAULT_PRODUCTION_URL}/c/cmqr_kojo_live`);
    assert.equal(
      celeYouScanLandingUrl("kojo-mensah", "https://www.celeventic.com"),
      "https://www.celeventic.com/card/kojo-mensah"
    );
    assert.equal(
      celeYouAbsoluteGuestPayload("/c/cmqr_kojo_live"),
      `${DEFAULT_PRODUCTION_URL}/c/cmqr_kojo_live`
    );
    assert.equal(
      celeYouAbsoluteGuestPayload("http://localhost:3000/c/cmqr_kojo_live"),
      `${DEFAULT_PRODUCTION_URL}/c/cmqr_kojo_live`
    );
    assert.equal(celeYouCameraScanUrl(""), "");
  });

  it("never encodes private, preview, or http origins into QR and NFC guest URLs", () => {
    const qr = celeYouCameraScanUrl("cmqr_live", "http://192.168.0.12:3000");
    const nfc = celeYouNfcScanUrl("cmnfc_live", "https://celeyou-preview.vercel.app");
    assert.equal(qr, `${DEFAULT_PRODUCTION_URL}/c/cmqr_live`);
    assert.equal(nfc, `${DEFAULT_PRODUCTION_URL}/n/cmnfc_live`);
    assert.equal(isCeleYouProductionGuestUrl(qr), true);
    assert.equal(isCeleYouProductionGuestUrl(nfc), true);
    assert.equal(
      celeYouScanLandingUrl("kojo-mensah", "http://127.0.0.1:3000"),
      `${DEFAULT_PRODUCTION_URL}/card/kojo-mensah`
    );
    assert.equal(
      celeYouAbsoluteGuestPayload("https://evil.example/c/cmqr_live"),
      `${DEFAULT_PRODUCTION_URL}/c/cmqr_live`
    );
    assert.equal(isCeleYouProductionGuestUrl("http://www.celeventic.com/c/cmqr_live"), false);
    assert.equal(isCeleYouProductionGuestUrl(`${DEFAULT_PRODUCTION_URL}/c/cmqr_live?access=secret`), false);
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
