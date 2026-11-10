/**
 * Shared Tap-to-Connect protocol for web session QR and future native BLE.
 * Advertisements never carry user ids, emails, phones, or account tokens.
 */

export const CELEYOU_BLE_SERVICE_UUID = "a1c3ce10-7e10-4c0e-9e10-ce1e70c0de01";
export const CELEYOU_BLE_SESSION_CHAR_UUID = "a1c3ce11-7e10-4c0e-9e10-ce1e70c0de01";
export const CELEYOU_BLE_HANDSHAKE_CHAR_UUID = "a1c3ce12-7e10-4c0e-9e10-ce1e70c0de01";
export const CELEYOU_BLE_LOCAL_NAME = "CeleYou";
export const CELEYOU_PROTOCOL_VERSION = 1 as const;

export type ProximityTransport = "qr" | "code" | "ble" | "nfc-card";

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

export type ProximityBleMessage = ProximityBleHello | ProximityBleAck;

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
  return null;
}

export function encodeProximityBleMessage(message: ProximityBleMessage): string {
  return JSON.stringify(message);
}

export function isSafeBlePayload(message: ProximityBleMessage): boolean {
  const blob = encodeProximityBleMessage(message);
  return !/"userId"|"email"|"phone"|"password"|"refreshToken"|"accessToken"/i.test(blob);
}
