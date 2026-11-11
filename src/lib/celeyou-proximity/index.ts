export {
  TAP_TO_CONNECT_CTA,
  TAP_TO_CONNECT_NAME,
  TAP_TO_CONNECT_NATIVE_REQUIREMENT,
  TAP_TO_CONNECT_SUPPORT,
  TAP_TO_CONNECT_TAGLINE,
  TAP_TO_OPEN_NAME,
  TAP_DECLINE_COOLDOWN_LIMIT,
  TAP_DECLINE_COOLDOWN_MS,
  TAP_DISCOVERY_TIMEOUT_MS,
  TAP_JOIN_PATH,
  TAP_PEER_STALE_MS,
  TAP_POLL_MS,
  TAP_SESSION_PURGE_AFTER_MS,
  TAP_SESSION_TTL_MS,
  TAP_SHARE_TOKEN_TTL_MS,
  TAP_STUDIO_PATH,
  tapJoinPath,
  tapStudioPath,
} from "@/lib/celeyou-proximity/product";
export {
  TAP_CAPABILITY_MATRIX,
  detectTapCapability,
  detectTapPlatform,
  type TapCapability,
  type TapPlatform,
} from "@/lib/celeyou-proximity/capabilities";
export {
  CELEYOU_BLE_HANDSHAKE_CHAR_UUID,
  CELEYOU_BLE_IOS_FOREGROUND_ADV_BYTES,
  CELEYOU_BLE_LOCAL_NAME,
  CELEYOU_BLE_SERVICE_UUID,
  CELEYOU_BLE_SESSION_CHAR_UUID,
  CELEYOU_PROTOCOL_VERSION,
  advertisementIsServiceUuidOnly,
  encodeProximityBleAdvertisement,
  encodeProximityBleMessage,
  helloBelongsOnGattCharacteristic,
  isSafeBlePayload,
  parseProximityBleMessage,
  type ProximityBleAdvertisement,
  type ProximityBleMessage,
  type ProximityTransport,
} from "@/lib/celeyou-proximity/protocol";
export {
  CeleYouProximityEngine,
  classifyDiscoverFailure,
  rssiIsPhysicalTouchProof,
} from "@/lib/celeyou-proximity/native-engine";
export {
  deriveProximitySharedSecret,
  generateProximityHandshakeKeys,
  handshakePublicKeysAreDistinct,
  parseHandshakePublicKey,
} from "@/lib/celeyou-proximity/handshake";
export {
  NATIVE_CONNECTION_LIFECYCLE,
  backendStatusToNativeLifecycle,
  nativeLifecycleAllowsConnectedCopy,
} from "@/lib/celeyou-proximity/native-lifecycle";
export {
  PROXIMITY_FAILURE_STATUSES,
  PROXIMITY_STATUSES,
  canTransitionProximity,
  isFailureProximityStatus,
  isProximityStatus,
  isTerminalProximityStatus,
  screenForProximityStatus,
  type ProximityStatus,
} from "@/lib/celeyou-proximity/state-machine";
export {
  CELEYOU_NATIVE_BLE_CONTRACT,
  webNativeBleBridge,
} from "@/lib/celeyou-proximity/native-bridge";
