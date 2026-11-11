export const TAP_SCREEN_COPY = {
  headline: "Bring Closer. Connect Instantly.",
  support: "Nearby discovery needs the CeleYou app on both phones. Without it, use QR, a link, AirDrop, Quick Share, or an NFC card.",
  readyStatus: "Ready to Connect",
  readyInstruction: "Open Tap Mode on the other phone and bring your devices close together.",
  searching: "Looking for nearby CeleYou devices…",
  found: "Someone is nearby",
  request: "wants to share their CeleYou profile.",
  verifying: "Confirming this share with CeleYou",
  connected: "Connected Successfully",
  startSharing: "Tap to Connect",
  findNearby: "Find Nearby",
  showQr: "Share QR",
  copyLink: "Copy Link",
  shareProfile: "Share Profile",
  nfcCard: "NFC Card",
  connect: "Connect",
  accept: "Accept",
  decline: "Decline",
  openProfile: "Open Profile",
  saveContact: "Save Contact",
  done: "Done",
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
