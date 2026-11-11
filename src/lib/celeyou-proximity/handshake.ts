/**
 * Ephemeral ECDH for Tap-to-Connect GATT handshake.
 * Public coordinates travel on the handshake characteristic. Private `d` never does.
 * A BLE link is not authentication. Pair this with the matching verify code and backend token redeem.
 */

const CURVE = "P-256";

export type ProximityHandshakeKeyPair = {
  publicKey: string;
  privateJwk: JsonWebKey;
};

export function parseHandshakePublicKey(value: string): { x: string; y: string } | null {
  const parts = value.trim().split(".");
  if (parts.length !== 2) return null;
  const [x, y] = parts;
  if (!x || !y || x.length < 32 || y.length < 32) return null;
  if (/[^A-Za-z0-9_-]/.test(x) || /[^A-Za-z0-9_-]/.test(y)) return null;
  return { x, y };
}

export function encodeHandshakePublicKey(jwk: JsonWebKey): string | null {
  if (jwk.kty !== "EC" || (jwk.crv && jwk.crv !== CURVE)) return null;
  if (typeof jwk.d === "string" && jwk.d.length > 0) return null;
  if (typeof jwk.x !== "string" || typeof jwk.y !== "string") return null;
  const encoded = `${jwk.x}.${jwk.y}`;
  return parseHandshakePublicKey(encoded) ? encoded : null;
}

export async function generateProximityHandshakeKeys(): Promise<ProximityHandshakeKeyPair> {
  const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: CURVE }, true, ["deriveBits"]);
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const publicKey = encodeHandshakePublicKey({ kty: "EC", crv: CURVE, x: publicJwk.x, y: publicJwk.y });
  if (!publicKey) throw new Error("Could not export a safe handshake public key.");
  return { publicKey, privateJwk };
}

export async function deriveProximitySharedSecret(
  privateJwk: JsonWebKey,
  peerPublicKey: string
): Promise<string> {
  const parsed = parseHandshakePublicKey(peerPublicKey);
  if (!parsed) throw new Error("Invalid peer handshake key");
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    privateJwk,
    { name: "ECDH", namedCurve: CURVE },
    false,
    ["deriveBits"]
  );
  const publicKey = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: CURVE, x: parsed.x, y: parsed.y },
    { name: "ECDH", namedCurve: CURVE },
    false,
    []
  );
  const bits = await crypto.subtle.deriveBits({ name: "ECDH", public: publicKey }, privateKey, 256);
  return bufferToHex(bits);
}

export function handshakePublicKeysAreDistinct(localPublic: string, remotePublic: string): boolean {
  return Boolean(
    parseHandshakePublicKey(localPublic) &&
      parseHandshakePublicKey(remotePublic) &&
      localPublic !== remotePublic
  );
}

function bufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
