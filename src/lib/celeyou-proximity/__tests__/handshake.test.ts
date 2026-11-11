import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deriveProximitySharedSecret,
  generateProximityHandshakeKeys,
  handshakePublicKeysAreDistinct,
  parseHandshakePublicKey,
} from "@/lib/celeyou-proximity/handshake";
import { isSafeBlePayload, parseProximityBleMessage } from "@/lib/celeyou-proximity/protocol";

describe("CeleYou Tap-to-Connect handshake", () => {
  it("derives the same shared secret on both sides without putting private keys on BLE", async () => {
    const host = await generateProximityHandshakeKeys();
    const peer = await generateProximityHandshakeKeys();
    assert.equal(handshakePublicKeysAreDistinct(host.publicKey, peer.publicKey), true);
    assert.ok(parseHandshakePublicKey(host.publicKey));
    const hostSecret = await deriveProximitySharedSecret(host.privateJwk, peer.publicKey);
    const peerSecret = await deriveProximitySharedSecret(peer.privateJwk, host.publicKey);
    assert.equal(hostSecret, peerSecret);
    assert.equal(hostSecret.length, 64);
    assert.equal(JSON.stringify(host.privateJwk).includes(host.publicKey.split(".")[0]!), true);

    const handshake = {
      v: 1 as const,
      type: "handshake" as const,
      discoveryId: "a".repeat(32),
      verifyCode: "4821",
      publicKey: host.publicKey,
    };
    assert.equal(parseProximityBleMessage(handshake)?.type, "handshake");
    assert.equal(isSafeBlePayload(handshake), true);
    assert.equal(isSafeBlePayload({ ...handshake, publicKey: host.publicKey }), true);
    assert.equal(
      parseProximityBleMessage({
        ...handshake,
        publicKey: `${host.publicKey}."d":"secret"`,
      }),
      null
    );
  });

  it("rejects private key material posing as a public handshake key", () => {
    assert.equal(parseHandshakePublicKey("short"), null);
    assert.equal(parseHandshakePublicKey("a.b.c"), null);
  });
});
