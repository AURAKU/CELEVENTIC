import { detectNfcWriteSupport } from "@/lib/digital-business-card/nfc-capability";

export type TapPlatform = "ios-safari" | "android-chrome" | "android-other" | "desktop" | "unknown";

export type TapCapability = {
  platform: TapPlatform;
  /** Browser can scan BLE centrals. It cannot advertise to another phone. */
  webBluetoothCentral: boolean;
  /** Always false in public web browsers. Native apps only. */
  bleAdvertise: boolean;
  /** Always false in this web product until a native CeleYou app ships. */
  nativeBlePeer: boolean;
  webNfcWrite: boolean;
  webNfcRead: boolean;
  sessionQr: boolean;
  sessionCode: boolean;
  nfcCardTapToOpen: boolean;
  cameraScan: boolean;
  guidance: string;
  phoneToPhoneReady: boolean;
};

export const TAP_CAPABILITY_MATRIX = [
  {
    pair: "iPhone to iPhone",
    technology: "Native BLE when the CeleYou app ships. Web uses session QR.",
    today: "Session QR or code in Tap Mode. Safari cannot advertise BLE or do phone to phone NFC.",
  },
  {
    pair: "Samsung to Samsung",
    technology: "Native BLE, optional Android NFC Reader Mode. Web uses session QR.",
    today: "Session QR or code. Chrome can write a physical NFC card. It cannot advertise BLE.",
  },
  {
    pair: "Android to Android",
    technology: "Vendor-neutral BLE in the native app. Web uses session QR.",
    today: "Session QR or code. Do not depend on Android Beam. It is obsolete.",
  },
  {
    pair: "iPhone to Android",
    technology: "Shared BLE protocol in native apps. Same service UUID and token exchange.",
    today: "Session QR or code. This is the working cross-platform handshake in the website.",
  },
  {
    pair: "Any phone to NFC card",
    technology: "Standard NDEF URL on /n/{token}.",
    today: "Works. The OS opens the public CeleYou. The recipient does not need the app.",
  },
  {
    pair: "Any phone to QR",
    technology: "Camera plus HTTPS /c/{token} or /card/{slug}.",
    today: "Works without installing CeleYou.",
  },
] as const;

export function detectTapPlatform(
  nav: Navigator | null | undefined = typeof navigator !== "undefined" ? navigator : null
): TapPlatform {
  if (!nav) return "unknown";
  const ua = nav.userAgent || "";
  const isIos = /iPad|iPhone|iPod/.test(ua) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
  if (isIos) return "ios-safari";
  if (/Android/i.test(ua) && /Chrome|CriOS/i.test(ua)) return "android-chrome";
  if (/Android/i.test(ua)) return "android-other";
  if (/Macintosh|Windows|Linux/i.test(ua)) return "desktop";
  return "unknown";
}

export function detectTapCapability(
  nav: Navigator | null | undefined = typeof navigator !== "undefined" ? navigator : null
): TapCapability {
  const platform = detectTapPlatform(nav);
  const nfc = detectNfcWriteSupport(nav);
  const webBluetoothCentral = Boolean(nav && "bluetooth" in nav);
  const webNfcRead = typeof globalThis !== "undefined" && "NDEFReader" in globalThis;
  const cameraScan = Boolean(nav && nav.mediaDevices && typeof nav.mediaDevices.getUserMedia === "function");

  let guidance =
    "Open Tap Mode on both phones. One person shows the session QR. The other scans it or types the code. This website cannot advertise Bluetooth. A physical NFC card still opens the public page on its own.";
  if (platform === "ios-safari") {
    guidance =
      "Safari cannot advertise Bluetooth or do phone to phone NFC. Allow Camera if you scan a session QR. Bluetooth permission is not used here. A physical CeleYou card still opens in Safari.";
  } else if (platform === "android-chrome") {
    guidance =
      "Chrome cannot advertise Bluetooth, so nearby phones will not find this browser automatically. Allow Camera to scan a session QR. If Chrome asks for NFC, that is only for writing a physical card. Native BLE arrives with the CeleYou app.";
  } else if (platform === "desktop") {
    guidance =
      "Tap-to-Connect is for two phones. On this computer, copy the link, show the profile QR, or open Tap Mode on your phone.";
  }

  return {
    platform,
    webBluetoothCentral,
    bleAdvertise: false,
    nativeBlePeer: false,
    webNfcWrite: nfc.canWrite,
    webNfcRead,
    sessionQr: true,
    sessionCode: true,
    nfcCardTapToOpen: true,
    cameraScan,
    guidance,
    phoneToPhoneReady: true,
  };
}
