/** CeleYou Tap-to-Connect. Internal module: celeyou-proximity. */

export const TAP_TO_CONNECT_NAME = "CeleYou Tap-to-Connect";
export const TAP_TO_CONNECT_TAGLINE = "Bring Closer. Connect Instantly.";
export const TAP_TO_CONNECT_SUPPORT = "Connect securely using a QR code or sharing code.";
export const TAP_TO_CONNECT_NATIVE_REQUIREMENT =
  "Nearby discovery needs the CeleYou app on both phones. Without it, use QR, a link, AirDrop, Quick Share, or an NFC card.";
export const TAP_TO_CONNECT_CTA = "Tap to Connect";
export const TAP_TO_OPEN_NAME = "Tap to Open";

export const TAP_SESSION_TTL_MS = 3 * 60 * 1000;
export const TAP_SHARE_TOKEN_TTL_MS = 2 * 60 * 1000;
export const TAP_DISCOVERY_TIMEOUT_MS = 45 * 1000;
export const TAP_POLL_MS = 1500;

export const TAP_STUDIO_PATH = "/dashboard/business-card/tap";
export const TAP_JOIN_PATH = "/tap";

export function tapStudioPath(cardId?: string, joinCode?: string): string {
  const params = new URLSearchParams();
  if (cardId) params.set("card", cardId);
  if (joinCode) params.set("code", joinCode);
  const qs = params.toString();
  return qs ? `${TAP_STUDIO_PATH}?${qs}` : TAP_STUDIO_PATH;
}

export function tapJoinPath(joinCode: string): string {
  return `${TAP_JOIN_PATH}/${encodeURIComponent(joinCode.trim().toUpperCase())}`;
}
