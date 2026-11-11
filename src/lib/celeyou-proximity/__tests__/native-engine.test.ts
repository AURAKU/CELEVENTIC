import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CeleYouProximityEngine, rssiIsPhysicalTouchProof } from "@/lib/celeyou-proximity/native-engine";
import { webNativeBleBridge } from "@/lib/celeyou-proximity/native-bridge";
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
});
