import {
  CELEYOU_BLE_HANDSHAKE_CHAR_UUID,
  CELEYOU_BLE_LOCAL_NAME,
  CELEYOU_BLE_SERVICE_UUID,
  CELEYOU_BLE_SESSION_CHAR_UUID,
  type ProximityBleHello,
} from "@/lib/celeyou-proximity/protocol";

/**
 * Contract for a future CeleYou iOS/Android app.
 * This website cannot advertise BLE. Do not call this from the browser and
 * pretend a nearby phone appeared.
 */
export type CeleYouNativeBleBridge = {
  serviceUuid: typeof CELEYOU_BLE_SERVICE_UUID;
  sessionCharacteristicUuid: typeof CELEYOU_BLE_SESSION_CHAR_UUID;
  handshakeCharacteristicUuid: typeof CELEYOU_BLE_HANDSHAKE_CHAR_UUID;
  localName: typeof CELEYOU_BLE_LOCAL_NAME;
  canAdvertise: boolean;
  startAdvertising: (hello: ProximityBleHello) => Promise<void>;
  stopAdvertising: () => Promise<void>;
  startScanning: (onHello: (hello: ProximityBleHello) => void) => Promise<void>;
  stopScanning: () => Promise<void>;
};

export const CELEYOU_NATIVE_BLE_CONTRACT: Omit<
  CeleYouNativeBleBridge,
  "startAdvertising" | "stopAdvertising" | "startScanning" | "stopScanning" | "canAdvertise"
> = {
  serviceUuid: CELEYOU_BLE_SERVICE_UUID,
  sessionCharacteristicUuid: CELEYOU_BLE_SESSION_CHAR_UUID,
  handshakeCharacteristicUuid: CELEYOU_BLE_HANDSHAKE_CHAR_UUID,
  localName: CELEYOU_BLE_LOCAL_NAME,
};

export function webNativeBleBridge(): CeleYouNativeBleBridge {
  const unavailable = async () => {
    throw new Error("Native BLE advertising is not available in this browser.");
  };
  return {
    ...CELEYOU_NATIVE_BLE_CONTRACT,
    canAdvertise: false,
    startAdvertising: unavailable,
    stopAdvertising: async () => undefined,
    startScanning: unavailable,
    stopScanning: async () => undefined,
  };
}
