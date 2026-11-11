import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TAP_CAPABILITY_MATRIX, detectTapCapability } from "@/lib/celeyou-proximity/capabilities";

describe("CeleYou Tap-to-Connect capabilities", () => {
  it("never claims phone to phone NFC works on every device", () => {
    for (const row of TAP_CAPABILITY_MATRIX) {
      assert.equal(/unrestricted NFC|automatically triggers|uses NameDrop|Android Beam works/i.test(row.today), false);
    }
    const nfcCard = TAP_CAPABILITY_MATRIX.find((row) => row.pair === "Any phone to NFC card");
    assert.ok(nfcCard?.today.includes("Works"));
    const iphone = TAP_CAPABILITY_MATRIX.find((row) => row.pair === "iPhone to iPhone");
    assert.ok(iphone?.today.includes("cannot advertise BLE"));
  });

  it("reports that browsers cannot advertise BLE", () => {
    const capability = detectTapCapability(null);
    assert.equal(capability.bleAdvertise, false);
    assert.equal(capability.nativeBlePeer, false);
    assert.equal(capability.phoneToPhoneReady, false);
    assert.equal(capability.sessionQr, true);
    assert.equal(capability.nfcCardTapToOpen, true);
  });
});
