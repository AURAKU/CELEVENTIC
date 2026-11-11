/**
 * Shared Tap-to-Connect protocol for web session QR and future native BLE.
 * Advertisements never carry user ids, emails, phones, or account tokens.
 */

export const CELEYOU_BLE_SERVICE_UUID = "a1c3ce10-7e10-4c0e-9e10-ce1e70c0de01";
export const CELEYOU_BLE_SESSION_CHAR_UUID = "a1c3ce11-7e10-4c0e-9e10-ce1e70c0de01";
export const CELEYOU_BLE_HANDSHAKE_CHAR_UUID = "a1c3ce12-7e10-4c0e-9e10-ce1e70c0de01";
export const CELEYOU_BLE_LOCAL_NAME = "CeleYou";
export const CELEYOU_PROTOCOL_VERSION = 1 as const;

/**
 * Apple Core Bluetooth foreground advertising budget for local name + service UUIDs.
 * Join codes and discovery ids do not fit. They move over GATT after connect.
 * Source: Apple “Best Practices for Setting Up Your Local Device as a Peripheral”.
 */
export const CELEYOU_BLE_IOS_FOREGROUND_ADV_BYTES = 28;

export type ProximityTransport = "qr" | "code" | "ble" | "nfc-card";

/** Broadcast on BLE. UUID only. Never account ids, join codes, or profile URLs. */
export type ProximityBleAdvertisement = {
  serviceUuid: typeof CELEYOU_BLE_SERVICE_UUID;
};

export type ProximityBleHello = {
  v: typeof CELEYOU_PROTOCOL_VERSION;
  type: "hello";
  discoveryId: string;
  joinCode: string;
};

export type ProximityBleAck = {
  v: typeof CELEYOU_PROTOCOL_VERSION;
  type: "ack";
  discoveryId: string;
};

export type ProximityBleHandshake = {
  v: typeof CELEYOU_PROTOCOL_VERSION;
  type: "handshake";
  discoveryId: string;
  verifyCode: string;
  /** ECDH P-256 public coordinates (`x.y`). Never include private `d`. */
  publicKey?: string;
};

export type ProximityBleMessage = ProximityBleHello | ProximityBleAck | ProximityBleHandshake;

export function parseProximityBleMessage(raw: unknown): ProximityBleMessage | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (record.v !== CELEYOU_PROTOCOL_VERSION) return null;
  if (record.type === "hello") {
    const discoveryId = String(record.discoveryId ?? "").trim();
    const joinCode = String(record.joinCode ?? "").trim().toUpperCase();
    if (discoveryId.length < 16 || joinCode.length < 4) return null;
    return { v: 1, type: "hello", discoveryId, joinCode };
  }
  if (record.type === "ack") {
    const discoveryId = String(record.discoveryId ?? "").trim();
    if (discoveryId.length < 16) return null;
    return { v: 1, type: "ack", discoveryId };
  }
  if (record.type === "handshake") {
    const discoveryId = String(record.discoveryId ?? "").trim();
    const verifyCode = String(record.verifyCode ?? "").replace(/\D/g, "");
    if (discoveryId.length < 16 || verifyCode.length !== 4) return null;
    const publicKey = typeof record.publicKey === "string" ? record.publicKey.trim() : "";
    if (publicKey && (publicKey.includes("\"d\"") || publicKey.split(".").length !== 2)) return null;
    return publicKey
      ? { v: 1, type: "handshake", discoveryId, verifyCode, publicKey }
      : { v: 1, type: "handshake", discoveryId, verifyCode };
  }
  return null;
}

export function encodeProximityBleMessage(message: ProximityBleMessage): string {
  return JSON.stringify(message);
}

export function isSafeBlePayload(message: ProximityBleMessage): boolean {
  const blob = encodeProximityBleMessage(message);
  return !/"userId"|"email"|"phone"|"password"|"refreshToken"|"accessToken"|"d":/i.test(blob);
}

export function encodeProximityBleAdvertisement(): ProximityBleAdvertisement {
  return { serviceUuid: CELEYOU_BLE_SERVICE_UUID };
}

export function advertisementIsServiceUuidOnly(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Object.keys(record).length === 1 && record.serviceUuid === CELEYOU_BLE_SERVICE_UUID;
}

/** GATT hello after connect. Must not be stuffed into an iOS advertisement packet. */
export function helloBelongsOnGattCharacteristic(message: ProximityBleHello): boolean {
  const encoded = encodeProximityBleMessage(message);
  return encoded.length > CELEYOU_BLE_IOS_FOREGROUND_ADV_BYTES && isSafeBlePayload(message);
}
