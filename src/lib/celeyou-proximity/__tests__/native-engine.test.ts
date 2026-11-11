import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  CeleYouProximityEngine,
  classifyDiscoverFailure,
  rssiIsPhysicalTouchProof,
} from "@/lib/celeyou-proximity/native-engine";
import {
  CELEYOU_NATIVE_BLE_CONTRACT,
  webNativeBleBridge,
  type CeleYouNativeBleBridge,
} from "@/lib/celeyou-proximity/native-bridge";
import { nativeLifecycleAllowsConnectedCopy } from "@/lib/celeyou-proximity/native-lifecycle";
import { TAP_TO_CONNECT_NATIVE_REQUIREMENT, TAP_TO_CONNECT_SUPPORT } from "@/lib/celeyou-proximity/product";

describe("CeleYou native proximity engine", () => {
  it("does not invent nearby phones when BLE advertising is unavailable", async () => {
    const engine = new CeleYouProximityEngine(webNativeBleBridge());
    const hello = { v: 1 as const, type: "hello" as const, discoveryId: "b".repeat(32), joinCode: "K2M9PQ" };
    const result = await engine.startDiscovering(hello);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "native-unavailable");
    assert.deepEqual(result.peers, []);
    assert.deepEqual(engine.listPeers(), []);
    assert.equal(rssiIsPhysicalTouchProof(-42), false);
    assert.equal(nativeLifecycleAllowsConnectedCopy("DISCOVERING"), false);
    assert.equal(nativeLifecycleAllowsConnectedCopy("CONNECTED"), true);
  });

  it("keeps web copy honest about QR and the installed-app requirement", () => {
    assert.match(TAP_TO_CONNECT_SUPPORT, /QR code or sharing code/i);
    assert.match(TAP_TO_CONNECT_NATIVE_REQUIREMENT, /both phones/i);
    assert.doesNotMatch(TAP_TO_CONNECT_NATIVE_REQUIREMENT, /automatic NFC|Android Beam/i);
  });

  it("verifies the share over HTTPS before Tap Mode says Connected Successfully", () => {
    const ui = readFileSync(join(process.cwd(), "src/components/digital-business-card/celeyou-tap-connect.tsx"), "utf8");
    assert.match(ui, /proximity\/exchange/);
    assert.match(ui, /screen === "verifying"/);
    assert.match(ui, /NFC Card/);
    assert.match(ui, /Share QR/);
    assert.match(ui, /CeleYouProximityEngine/);
    assert.match(ui, /No CeleYou app nearby yet/);
    assert.match(ui, /Turn on Bluetooth/);
    assert.doesNotMatch(ui, /phone to phone NFC works/i);
  });

  it("classifies Bluetooth and permission failures without inventing peers", async () => {
    assert.equal(classifyDiscoverFailure(new Error("permission denied")), "permission-denied");
    assert.equal(classifyDiscoverFailure(new Error("bluetooth-off: Turn on Bluetooth")), "bluetooth-off");
    const hello = { v: 1 as const, type: "hello" as const, discoveryId: "c".repeat(32), joinCode: "K2M9PQ" };
    const fake: CeleYouNativeBleBridge = {
      ...CELEYOU_NATIVE_BLE_CONTRACT,
      canAdvertise: true,
      bluetoothState: () => "on",
      startAdvertising: async () => undefined,
      stopAdvertising: async () => undefined,
      startScanning: async (onHello) => {
        onHello(hello, { rssi: -48 });
        onHello({ ...hello, discoveryId: "d".repeat(32), joinCode: "ZX8N2K" }, { rssi: -62 });
      },
      stopScanning: async () => undefined,
    };
    const engine = new CeleYouProximityEngine(fake);
    const result = await engine.startDiscovering(hello);
    assert.equal(result.ok, true);
    assert.equal(engine.listPeers().length, 1);
    assert.equal(engine.listPeers()[0]?.joinCode, "ZX8N2K");
    assert.equal(rssiIsPhysicalTouchProof(-48), false);
    engine.pruneStalePeers(Date.now() + 20_000);
    assert.deepEqual(engine.listPeers(), []);
  });
});
