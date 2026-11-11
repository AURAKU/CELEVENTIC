import type { ProximityStatus } from "@/lib/celeyou-proximity/state-machine";

/**
 * Native connection screens. Backend sessions stay on ProximityStatus.
 * CONNECTED is only valid after the backend has verified the one-time token.
 */
export const NATIVE_CONNECTION_LIFECYCLE = [
  "IDLE",
  "DISCOVERING",
  "PEER_DETECTED",
  "CONNECTION_REQUESTED",
  "AWAITING_APPROVAL",
  "SECURE_HANDSHAKE",
  "TOKEN_EXCHANGED",
  "PROFILE_RESOLVED",
  "CONNECTED",
] as const;

export type NativeConnectionLifecycle = (typeof NATIVE_CONNECTION_LIFECYCLE)[number];

export function backendStatusToNativeLifecycle(status: ProximityStatus): NativeConnectionLifecycle {
  if (status === "DISCOVERING") return "DISCOVERING";
  if (status === "PEER_FOUND") return "PEER_DETECTED";
  if (status === "REQUEST_PENDING") return "AWAITING_APPROVAL";
  if (status === "APPROVED") return "SECURE_HANDSHAKE";
  if (status === "COMPLETED") return "CONNECTED";
  return "IDLE";
}

export function nativeLifecycleAllowsConnectedCopy(state: NativeConnectionLifecycle): boolean {
  return state === "CONNECTED";
}
