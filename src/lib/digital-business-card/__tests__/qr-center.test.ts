import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

  it("paints the official CeleYou logo in the live QR well", () => {
    const badge = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/celecard-qr-badge.tsx"),
      "utf8"
    );
    const overlay = readFileSync(
      join(process.cwd(), "src/lib/digital-business-card/qr-center-overlay.tsx"),
      "utf8"
    );
    assert.match(badge, /CeleYouThemedMark/);
    assert.match(badge, /p-\[10%\]/);
    assert.doesNotMatch(badge, /DigitalCardHouseAvatar/);
    assert.match(overlay, /CELEYOU_MARK_SRC/);
    assert.match(overlay, /objectFit: official \? "contain"/);
  });

  it("fills the tile and keeps a large center portrait", () => {
    assert.equal(CELECARD_QR_TILE_FILL > 1.2, true);
    assert.equal(CELECARD_QR_CENTER_WELL >= 0.4, true);
  });
});
