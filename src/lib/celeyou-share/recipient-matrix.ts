/**
 * Zero-install recipient capability matrix.
 * Phone to phone NFC URL transfer is not advertised unless the OS actually supports it.
 */

export type RecipientCategory =
  | "iphone-no-app"
  | "samsung-no-app"
  | "android-no-app"
  | "celeyou-app"
  | "mobile-browser";

export type RecipientCapabilityRow = {
  id: RecipientCategory;
  recipient: string;
  nativeNearby: string;
  nfcTagRead: string;
  appRequired: false | "optional";
  userApproval: string;
  bluetoothOrWifi: string;
  screenUnlocked: string;
  opensInBrowser: true;
  today: string;
};

export const ZERO_INSTALL_RECIPIENT_MATRIX: readonly RecipientCapabilityRow[] = [
  {
    id: "iphone-no-app",
    recipient: "iPhone without CeleYou",
    nativeNearby: "AirDrop can appear inside the iOS share sheet. CeleYou cannot start AirDrop by touching phones.",
    nfcTagRead: "Safari reads a physical NDEF URL tag and offers to open it.",
    appRequired: false,
    userApproval: "The person must accept AirDrop, scan a QR, or tap a link or NFC card.",
    bluetoothOrWifi: "AirDrop needs Bluetooth and Wi-Fi. QR, link, and NFC card do not.",
    screenUnlocked: "AirDrop needs an unlocked screen. A scanned QR or NFC card opens from the system prompt.",
    opensInBrowser: true,
    today: "Send the HTTPS profile through the share sheet, a QR, a message, or a physical NFC card. No CeleYou install.",
  },
  {
    id: "samsung-no-app",
    recipient: "Samsung Galaxy without CeleYou",
    nativeNearby: "Quick Share can appear inside the Android share sheet. CeleYou cannot start it by NFC contact.",
    nfcTagRead: "The OS reads a physical NDEF URL tag when NFC is on.",
    appRequired: false,
    userApproval: "The person must accept Quick Share, scan a QR, or open a link or NFC card.",
    bluetoothOrWifi: "Quick Share needs Nearby/Bluetooth. QR, link, and NFC card do not.",
    screenUnlocked: "Quick Share needs an unlocked screen. A scanned QR or NFC card opens from the system prompt.",
    opensInBrowser: true,
    today: "Share the HTTPS profile through the system sheet, QR, message, or NFC card. Android Beam is obsolete.",
  },
  {
    id: "android-no-app",
    recipient: "Other Android without CeleYou",
    nativeNearby: "Nearby Share or OEM sharing may appear in the share sheet. Support varies by maker and OS.",
    nfcTagRead: "Most current Android phones read NDEF URL tags when NFC is on. Confirm on the device.",
    appRequired: false,
    userApproval: "The person must accept a nearby share, scan a QR, or open a link or NFC card.",
    bluetoothOrWifi: "Nearby share needs Bluetooth. QR, link, and NFC card do not.",
    screenUnlocked: "Nearby share usually needs an unlocked screen. QR and NFC card open from the system prompt.",
    opensInBrowser: true,
    today: "QR and HTTPS always work. Do not claim automatic phone to phone NFC on every Android.",
  },
  {
    id: "celeyou-app",
    recipient: "CeleYou user with the app",
    nativeNearby: "Native BLE Tap-to-Connect when both open Tap Mode. Not available in the website.",
    nfcTagRead: "Same physical NFC card as everyone else.",
    appRequired: "optional",
    userApproval: "Both people must approve a Tap session. QR and links still open without signing in.",
    bluetoothOrWifi: "BLE needs Bluetooth. QR, link, and NFC card do not.",
    screenUnlocked: "Tap Mode is a foreground session. QR and NFC card follow the OS.",
    opensInBrowser: true,
    today: "The website uses session QR or code between two signed-in CeleYou owners. Recipients without the app still use QR or the link.",
  },
  {
    id: "mobile-browser",
    recipient: "Anyone in a mobile browser",
    nativeNearby: "The browser can open the OS share sheet. It cannot advertise Bluetooth to another phone.",
    nfcTagRead: "A physical NFC card still opens in the OS browser. In-page NFC write is Chrome on Android only.",
    appRequired: false,
    userApproval: "The person chooses to open the URL.",
    bluetoothOrWifi: "Not required for QR or HTTPS.",
    screenUnlocked: "The person unlocks the phone to open the link.",
    opensInBrowser: true,
    today: "The public CeleYou at /u/{slug}, /card/{slug}, and /c/{token} opens with no account. Save Contact downloads a vCard.",
  },
] as const;

export function recipientMatrixNeverClaimsPhoneNfcP2P(row: RecipientCapabilityRow): boolean {
  const haystack = `${row.nativeNearby} ${row.today}`.toLowerCase();
  return (
    !haystack.includes("automatically triggers") &&
    !haystack.includes("unrestricted nfc") &&
    !haystack.includes("android beam works") &&
    !haystack.includes("namedrop")
  );
}
