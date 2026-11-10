import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { celeCardHouseAvatarValue } from "@/lib/digital-business-card/portraits";
import {
  CELECARD_QR_CENTER_WELL,
  CELECARD_QR_TILE_FILL,
  resolveCeleCardQrCenter,
} from "@/lib/digital-business-card/qr-center";

describe("CeleYou QR center", () => {
  it("puts a cropped portrait in the scan mark", () => {
    const center = resolveCeleCardQrCenter("/digital-cards/demo/ama-serwaa.jpg");
    assert.equal(center.kind, "photo");
    if (center.kind === "photo") assert.equal(center.src, "/digital-cards/demo/ama-serwaa.jpg");
  });

  it("uses the house mark when no photo is uploaded", () => {
    assert.equal(resolveCeleCardQrCenter(null).kind, "mark");
    assert.equal(resolveCeleCardQrCenter(celeCardHouseAvatarValue("foil")).kind, "mark");
    assert.equal(resolveCeleCardQrCenter(celeCardHouseAvatarValue("celecard")).kind, "mark");
  });

  it("fills the tile and keeps a large center portrait", () => {
    assert.equal(CELECARD_QR_TILE_FILL > 1.2, true);
    assert.equal(CELECARD_QR_CENTER_WELL >= 0.4, true);
  });
});
