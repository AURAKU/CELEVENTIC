import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CELEYOU_BLE_IOS_FOREGROUND_ADV_BYTES,
  CELEYOU_BLE_SERVICE_UUID,
  advertisementIsServiceUuidOnly,
  encodeProximityBleAdvertisement,
  encodeProximityBleMessage,
  helloBelongsOnGattCharacteristic,
  isSafeBlePayload,
  parseProximityBleMessage,
} from "@/lib/celeyou-proximity/protocol";
import { parseTapJoinScan } from "@/lib/celeyou-proximity/join-code";
import {
  hashProximitySecret,
  inspectProximityShareToken,
  newProximityJoinCode,
  newProximityShareToken,
} from "@/lib/celeyou-proximity/tokens";

describe("CeleYou Tap-to-Connect protocol", () => {
  it("rejects BLE payloads that carry account secrets", () => {
    const hello = { v: 1 as const, type: "hello" as const, discoveryId: "a".repeat(32), joinCode: "AB3DK2" };
    assert.equal(isSafeBlePayload(hello), true);
    assert.equal(parseProximityBleMessage(hello)?.type, "hello");
    assert.equal(parseProximityBleMessage({ v: 1, type: "hello", discoveryId: "short", joinCode: "AB" }), null);
    const encoded = encodeProximityBleMessage(hello);
    assert.equal(/userId|email|password/.test(encoded), false);
  });

  it("hashes share tokens so the raw secret is not stored", () => {
    const first = newProximityShareToken();
    const second = newProximityShareToken();
    assert.notEqual(first.token, first.tokenHash);
    assert.notEqual(first.token, second.token);
    assert.equal(first.tokenHash.length, 64);
  });

  it("rejects expired and replayed share tokens", () => {
    const now = new Date("2026-11-10T12:00:00.000Z");
    const row = { toUserId: "user-a", redeemedAt: null, expiresAt: new Date("2026-11-10T12:02:00.000Z") };
    assert.equal(inspectProximityShareToken(row, "user-a", now), "ok");
    assert.equal(inspectProximityShareToken(row, "user-b", now), "unknown");
    assert.equal(inspectProximityShareToken(null, "user-a", now), "unknown");
    assert.equal(
      inspectProximityShareToken({ ...row, redeemedAt: now }, "user-a", now),
      "replay"
    );
    assert.equal(
      inspectProximityShareToken({ ...row, expiresAt: new Date("2026-11-10T11:59:00.000Z") }, "user-a", now),
      "expired"
    );
  });

  it("advertises only the service UUID and keeps hello on GATT", () => {
    const hello = { v: 1 as const, type: "hello" as const, discoveryId: "a".repeat(32), joinCode: "AB3DK2" };
    const advertisement = encodeProximityBleAdvertisement();
    assert.equal(advertisement.serviceUuid, CELEYOU_BLE_SERVICE_UUID);
    assert.equal(advertisementIsServiceUuidOnly(advertisement), true);
    assert.equal(helloBelongsOnGattCharacteristic(hello), true);
    assert.ok(encodeProximityBleMessage(hello).length > CELEYOU_BLE_IOS_FOREGROUND_ADV_BYTES);
    assert.equal(advertisementIsServiceUuidOnly({ ...advertisement, joinCode: hello.joinCode }), false);
  });

  it("reads a session QR or a typed six character code", () => {
    const code = newProximityJoinCode(Uint8Array.from([1, 2, 3, 4, 5, 6]));
    assert.equal(code.length, 6);
    assert.equal(parseTapJoinScan(`https://www.celeventic.com/tap/${code}`), code);
    assert.equal(parseTapJoinScan(code.toLowerCase()), code);
    assert.equal(hashProximitySecret(code), hashProximitySecret(code.toLowerCase()));
  });
});
