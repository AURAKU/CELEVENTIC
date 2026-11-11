export const TAP_SCREEN_COPY = {
  headline: "Bring Closer. Connect Instantly.",
  support: "Nearby discovery needs the CeleYou app on both phones. Without it, use QR, a link, AirDrop, Quick Share, or an NFC card.",
  startSharing: "Start Sharing",
  findNearby: "Find Nearby",
  showQr: "Show QR",
  copyLink: "Copy Link",
  shareViaApps: "Share via Apps",
  connected: "Connected Successfully",
} as const;

export function nearbyEmptyState(nativeReady: boolean): string {
  if (!nativeReady) {
    return "This phone cannot advertise CeleYou nearby yet. Show the QR or share the link.";
  }
  return "No CeleYou phones found. Keep both apps open, or show the QR.";
}

export function mayShowConnected(backendVerified: boolean): boolean {
  return backendVerified;
}
