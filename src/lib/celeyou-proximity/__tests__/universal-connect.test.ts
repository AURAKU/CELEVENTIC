import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  SCAN_TO_CONNECT_CTA,
  SHARE_LINK_CTA,
  TAP_TO_SHARE_CTA,
  UNIVERSAL_CONNECT_DEVICE_MATRIX,
  UNIVERSAL_CONNECT_SUPPORT,
  UNIVERSAL_SAVE_LEAD,
  copyTapSession,
  shareTapSession,
  tapSessionJoinUrl,
  tapSessionSecretFromView,
  tapSessionShareText,
  tapSessionUrlContainsPrivateField,
  tapSessionUrlIsPublicJoin,
  universalConnectActionOrder,
  universalConnectHint,
} from "@/lib/celeyou-proximity/universal-connect";
import { newProximityPairingToken } from "@/lib/celeyou-proximity/tokens";

function source(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("CeleYou Universal Connect", () => {
  it("keeps four device pairs zero install and never claims AirDrop control", () => {
    assert.equal(UNIVERSAL_CONNECT_DEVICE_MATRIX.length, 4);
    for (const row of UNIVERSAL_CONNECT_DEVICE_MATRIX) {
      assert.equal(row.guestNeedsApp, false);
      assert.equal(row.guestNeedsAccount, false);
      assert.equal(/CeleYou (starts|controls) AirDrop/i.test(`${row.primary} ${row.fallback}`), false);
      assert.equal(/automatic(ally)? (saves|adds) (a )?contact/i.test(`${row.primary} ${row.fallback}`), false);
    }
    assert.equal(UNIVERSAL_CONNECT_DEVICE_MATRIX[0].pair, "iPhone to iPhone");
    assert.equal(UNIVERSAL_CONNECT_DEVICE_MATRIX[1].pair, "iPhone to Android");
    assert.equal(UNIVERSAL_CONNECT_DEVICE_MATRIX[2].pair, "Android to iPhone");
    assert.equal(UNIVERSAL_CONNECT_DEVICE_MATRIX[3].pair, "Android to Android");
    assert.match(UNIVERSAL_CONNECT_SUPPORT, /No CeleYou account or app is required/);
    assert.match(UNIVERSAL_SAVE_LEAD, /does not add a contact by itself/);
  });

  it("puts the pairing token in the session URL and rejects private fields", () => {
    const pairing = newProximityPairingToken();
    const url = tapSessionJoinUrl("https://www.celeventic.com", pairing.token);
    assert.equal(url, `https://www.celeventic.com/tap/${pairing.token}`);
    assert.equal(tapSessionUrlIsPublicJoin(url), true);
    assert.equal(tapSessionUrlContainsPrivateField(url), false);
    assert.equal(tapSessionUrlContainsPrivateField(`${url}?email=ama@example.com`), true);
    assert.equal(tapSessionUrlIsPublicJoin("https://www.celeventic.com/u/kojo-mensah"), false);
    assert.equal(
      tapSessionSecretFromView({ pairingToken: pairing.token, joinCode: "ABC123" }),
      pairing.token
    );
    assert.equal(tapSessionSecretFromView({ pairingToken: null, joinCode: "MERN3W" }), "MERN3W");
    assert.equal(tapSessionShareText("Kojo Mensah", url).includes("Kojo Mensah"), true);
    assert.equal(/@|email|phone/i.test(tapSessionShareText("Kojo Mensah", url).split("\n")[0]), false);
  });

  it("shares the session URL through the OS sheet and copies when share is missing", async () => {
    const url = tapSessionJoinUrl("https://www.celeventic.com", "a".repeat(32));
    const shared: ShareData[] = [];
    const shareNav = {
      share: async (payload: ShareData) => {
        shared.push(payload);
      },
    } as unknown as Navigator;
    const sharedResult = await shareTapSession({ url, displayName: "Kojo Mensah" }, shareNav);
    assert.equal(sharedResult, "shared");
    assert.equal(shared[0]?.url, url);
    assert.equal(typeof shared[0]?.url === "string" && tapSessionUrlContainsPrivateField(shared[0].url), false);

    let copied = "";
    const copyNav = {
      clipboard: {
        writeText: async (value: string) => {
          copied = value;
        },
      },
    } as unknown as Navigator;
    assert.equal(await copyTapSession(url, copyNav), "copied");
    assert.equal(copied, url);
    assert.equal(await shareTapSession({ url: `${url}?email=x@y.com`, displayName: "Kojo" }, shareNav), "unavailable");
    assert.equal(await copyTapSession("https://www.celeventic.com/u/kojo-mensah", copyNav), "unavailable");
  });

  it("orders Scan first on desktop and keeps all three actions on phones", () => {
    assert.deepEqual(universalConnectActionOrder("ios-safari"), [
      "tap-to-share",
      "scan-to-connect",
      "share-link",
    ]);
    assert.deepEqual(universalConnectActionOrder("android-chrome"), [
      "tap-to-share",
      "scan-to-connect",
      "share-link",
    ]);
    assert.deepEqual(universalConnectActionOrder("desktop"), [
      "scan-to-connect",
      "share-link",
      "tap-to-share",
    ]);
    assert.match(universalConnectHint("tap-to-share", "ios-safari"), /does not start them itself/);
    assert.match(universalConnectHint("tap-to-share", "desktop"), /copies the connection link/);
  });

  it("wires Tap to Share, Scan to Connect, and Share Link onto host Tap Mode", () => {
    const host = source("src/components/digital-business-card/celeyou-tap-connect.tsx");
    const guest = source("src/components/digital-business-card/celeyou-tap-guest-view.tsx");
    const save = source("src/lib/digital-business-card/save-contact.ts");
    assert.match(host, /TAP_TO_SHARE_CTA/);
    assert.match(host, /SCAN_TO_CONNECT_CTA/);
    assert.match(host, /SHARE_LINK_CTA/);
    assert.match(host, /shareTapSession/);
    assert.match(host, /copyTapSession/);
    assert.match(host, /celecard-universal-actions/);
    assert.match(host, /universalConnectActionOrder/);
    assert.doesNotMatch(host, /CeleYou starts AirDrop/);
    assert.doesNotMatch(host, /direct AirDrop/);
    assert.match(guest, /UNIVERSAL_SAVE_LEAD/);
    assert.match(guest, /contactSaveHint/);
    assert.doesNotMatch(guest, /automatically saved/);
    assert.doesNotMatch(save, /automatically/);
    assert.equal(TAP_TO_SHARE_CTA, "Tap to Share");
    assert.equal(SCAN_TO_CONNECT_CTA, "Scan to Connect");
    assert.equal(SHARE_LINK_CTA, "Share Link");
  });
});
