export const PROXIMITY_STATUSES = [
  "DISCOVERING",
  "PEER_FOUND",
  "REQUEST_PENDING",
  "APPROVED",
  "COMPLETED",
  "DECLINED",
  "CANCELLED",
  "EXPIRED",
  "FAILED",
] as const;

export type ProximityStatus = (typeof PROXIMITY_STATUSES)[number];

export const PROXIMITY_FAILURE_STATUSES = [
  "DECLINED",
  "CANCELLED",
  "EXPIRED",
  "FAILED",
] as const;

export type ProximityFailureStatus = (typeof PROXIMITY_FAILURE_STATUSES)[number];

export const PROXIMITY_TRANSITIONS: Record<ProximityStatus, readonly ProximityStatus[]> = {
  DISCOVERING: ["PEER_FOUND", "CANCELLED", "EXPIRED", "FAILED"],
  PEER_FOUND: ["REQUEST_PENDING", "CANCELLED", "EXPIRED", "FAILED"],
  REQUEST_PENDING: ["APPROVED", "DECLINED", "CANCELLED", "EXPIRED", "FAILED"],
  APPROVED: ["COMPLETED", "EXPIRED", "FAILED"],
  COMPLETED: [],
  DECLINED: [],
  CANCELLED: [],
  EXPIRED: [],
  FAILED: [],
};

export function isProximityStatus(value: string): value is ProximityStatus {
  return (PROXIMITY_STATUSES as readonly string[]).includes(value);
}

export function canTransitionProximity(from: ProximityStatus, to: ProximityStatus): boolean {
  return PROXIMITY_TRANSITIONS[from].includes(to);
}

export function isTerminalProximityStatus(status: ProximityStatus): boolean {
  return PROXIMITY_TRANSITIONS[status].length === 0;
}

export function isFailureProximityStatus(status: string): status is ProximityFailureStatus {
  return (PROXIMITY_FAILURE_STATUSES as readonly string[]).includes(status);
}

export function screenForProximityStatus(
  status: ProximityStatus,
  role: "host" | "peer"
): "ready" | "searching" | "found" | "request" | "verifying" | "success" | "ended" {
  if (status === "DISCOVERING") return "searching";
  if (status === "PEER_FOUND") return "found";
  if (status === "REQUEST_PENDING") return role === "peer" ? "request" : "found";
  if (status === "APPROVED") return "verifying";
  if (status === "COMPLETED") return "success";
  return "ended";
}
