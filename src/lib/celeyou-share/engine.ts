import { detectNfcWriteSupport } from "@/lib/digital-business-card/nfc-capability";
import { detectTapPlatform, type TapPlatform } from "@/lib/celeyou-proximity/capabilities";
import {
  shareArtifactsLandOnSameProfile,
  type CeleYouShareIdentity,
} from "@/lib/digital-business-card/share-identity";

export const SHARE_MY_CELEYOU = "Share my CeleYou";
export const SHARE_MY_CARD_CTA = "Share My Card";
export const NEARBY_SHARE_CTA = "Nearby Share";
export const SHARE_VIA_APPS_CTA = "Share via Apps";
export const SAVE_CONTACT_CTA = "Save Contact";
export const SHARE_CONTACT_FILE_CTA = "Share Contact File";
export const COPY_PROFILE_LINK_CTA = "Copy Profile Link";
export const SHOW_QR_CTA = "Show QR";

export const SMART_SHARE_METHODS = ["system-sheet", "tap-to-connect", "nfc-card", "qr", "https-link"] as const;
export type SmartShareMethod = (typeof SMART_SHARE_METHODS)[number];

export const SHARE_DESK_ACTIONS = [
  "share-card",
  "save-contact",
  "share-contact-file",
  "show-qr",
  "copy-link",
  "namedrop",
  "nearby",
  "nfc",
  "apps",
] as const;
export type ShareDeskActionId = (typeof SHARE_DESK_ACTIONS)[number];

/** Order actions for this device. Never drop an essential method. */
export function shareDeskActionOrder(platform: TapPlatform): ShareDeskActionId[] {
  if (platform === "ios-safari") {
    return [
      "share-card",
      "save-contact",
      "namedrop",
      "share-contact-file",
      "show-qr",
      "copy-link",
      "nearby",
      "nfc",
      "apps",
    ];
  }
  if (platform === "android-chrome" || platform === "android-other") {
    return [
      "share-card",
      "save-contact",
      "share-contact-file",
      "show-qr",
      "nfc",
      "copy-link",
      "nearby",
      "namedrop",
      "apps",
    ];
  }
  return [
    "show-qr",
    "copy-link",
    "save-contact",
    "share-contact-file",
    "share-card",
    "nfc",
    "nearby",
    "namedrop",
    "apps",
  ];
}

const SMART_SHARE_PRIORITY: SmartShareMethod[] = [
  "system-sheet",
  "tap-to-connect",
  "nfc-card",
  "qr",
  "https-link",
];

export type SmartShareCapability = {
  platform: TapPlatform;
  hasWebShare: boolean;
  hasClipboard: boolean;
  /** AirDrop may appear inside the iOS share sheet. CeleYou cannot invoke it directly. */
  airDropInShareSheet: boolean;
  /** Quick Share or Nearby Share may appear inside the Android share sheet. */
  quickShareInShareSheet: boolean;
  canWriteNfc: boolean;
  recommended: SmartShareMethod;
  alternatives: SmartShareMethod[];
  nearbyLabel: string;
  nearbyGuidance: string;
  fallbackGuidance: string;
};

export function detectSmartShareCapability(
  nav: Navigator | null | undefined = typeof navigator !== "undefined" ? navigator : null
): SmartShareCapability {
  const platform = detectTapPlatform(nav);
  const hasWebShare = Boolean(nav && typeof nav.share === "function");
  const hasClipboard = Boolean(nav && nav.clipboard && typeof nav.clipboard.writeText === "function");
  const nfc = detectNfcWriteSupport(nav);
  const airDropInShareSheet = hasWebShare && platform === "ios-safari";
  const quickShareInShareSheet = hasWebShare && (platform === "android-chrome" || platform === "android-other");

  const recommended: SmartShareMethod = hasWebShare
    ? "system-sheet"
    : platform === "desktop"
      ? "https-link"
      : "qr";
  const alternatives = SMART_SHARE_PRIORITY.filter((method) => method !== recommended);

  let nearbyGuidance =
    "Nearby Share opens the phone’s own share sheet. CeleYou cannot start AirDrop or Quick Share by touching two phones.";
  if (platform === "ios-safari") {
    nearbyGuidance =
      "This opens the iOS share sheet. AirDrop can appear there when both iPhones are unlocked. CeleYou cannot start AirDrop by NFC contact. Show the QR if AirDrop is off.";
  } else if (platform === "android-chrome" || platform === "android-other") {
    nearbyGuidance =
      "This opens the Android share sheet. Quick Share or Nearby Share can appear there on supported phones. CeleYou cannot start them by NFC contact. Show the QR if nearby sharing is off.";
  } else if (platform === "desktop") {
    nearbyGuidance =
      "Nearby sharing is for phones. On this computer, copy the link or show the QR. The recipient opens it in any browser.";
  }

  return {
    platform,
    hasWebShare,
    hasClipboard,
    airDropInShareSheet,
    quickShareInShareSheet,
    canWriteNfc: nfc.canWrite,
    recommended,
    alternatives,
    nearbyLabel: NEARBY_SHARE_CTA,
    nearbyGuidance,
    fallbackGuidance:
      "QR and the HTTPS profile always work. Recipients do not need CeleYou, an account, or an NFC reader app.",
  };
}

export type ShareProfileInput = {
  title: string;
  text: string;
  url: string;
  /** Live plate PNG, then OG tile. Instagram, Snapchat, WhatsApp, and iMessage need the file. */
  imageUrl?: string | string[] | null;
};

export type ShareProfileResult = "shared" | "copied" | "cancelled" | "unavailable";

function looksLikeImage(type: string, buffer: ArrayBuffer) {
  const mime = type.toLowerCase();
  if (mime.includes("text/html") || mime.includes("application/json")) return false;
  if (mime.includes("image/png") || mime.includes("image/jpeg") || mime.includes("image/webp")) return true;
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return true;
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  return mime.includes("image/");
}

async function fetchLivePlateFile(imageUrl: string): Promise<File | null> {
  try {
    const res = await fetch(imageUrl, { cache: "no-store", credentials: "omit" });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength < 64) return null;
    if (!looksLikeImage(res.headers.get("content-type") || "", buffer)) return null;
    return new File([buffer], "celeyou-plate.png", { type: "image/png" });
  } catch {
    return null;
  }
}

async function livePlateFile(imageUrl?: string | string[] | null): Promise<File | null> {
  const urls = (Array.isArray(imageUrl) ? imageUrl : [imageUrl])
    .map((url) => url?.trim())
    .filter((url): url is string => Boolean(url));
  for (const url of urls) {
    const file = await fetchLivePlateFile(url);
    if (file) return file;
  }
  return null;
}

function shareCaption(text: string, url: string) {
  return text.includes(url) ? text : `${text}\n${url}`;
}

function isShareAbort(error: unknown) {
  return (error as { name?: string })?.name === "AbortError";
}

function canSharePayload(nav: Navigator, payload: ShareData) {
  if (typeof nav.canShare !== "function") return true;
  try {
    return nav.canShare(payload);
  } catch {
    return true;
  }
}

async function tryNativeShare(nav: Navigator, payload: ShareData): Promise<ShareProfileResult | "failed"> {
  try {
    await nav.share(payload);
    return "shared";
  } catch (error) {
    if (isShareAbort(error)) return "cancelled";
    return "failed";
  }
}

export async function shareCeleYouProfile(
  input: ShareProfileInput,
  nav: Navigator | null | undefined = typeof navigator !== "undefined" ? navigator : null
): Promise<ShareProfileResult> {
  if (!input.url) return "unavailable";
  const text = shareCaption(input.text, input.url);
  const file = await livePlateFile(input.imageUrl);
  if (nav && typeof nav.share === "function") {
    if (file) {
      const withPlate = { title: input.title, text, files: [file] };
      if (canSharePayload(nav, withPlate)) {
        const plateOnly = await tryNativeShare(nav, withPlate);
        if (plateOnly !== "failed") return plateOnly;
      }
      const withPlateAndUrl = { title: input.title, text, url: input.url, files: [file] };
      if (canSharePayload(nav, withPlateAndUrl)) {
        const mixed = await tryNativeShare(nav, withPlateAndUrl);
        if (mixed !== "failed") return mixed;
      }
    }
    try {
      await nav.share({ title: input.title, text, url: input.url });
      return "shared";
    } catch (error) {
      if (isShareAbort(error)) return "cancelled";
    }
  }
  try {
    if (nav?.clipboard && typeof nav.clipboard.writeText === "function") {
      await Promise.race([
        nav.clipboard.writeText(text),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("clipboard-timeout")), 1200);
        }),
      ]);
      return "copied";
    }
  } catch {
    return "unavailable";
  }
  return "unavailable";
}

/**
 * Unified share router. Picks the fastest supported path on this device.
 * AirDrop and Quick Share can only appear inside the OS share sheet.
 * CeleYou never treats a BLE advertisement or an NFC bump as a completed share.
 */
export class CeleYouSmartShareEngine {
  readonly capability: SmartShareCapability;

  constructor(nav: Navigator | null | undefined = typeof navigator !== "undefined" ? navigator : null) {
    this.capability = detectSmartShareCapability(nav);
  }

  route(): SmartShareMethod[] {
    return [this.capability.recommended, ...this.capability.alternatives];
  }

  async share(input: ShareProfileInput, nav?: Navigator | null): Promise<ShareProfileResult> {
    return shareCeleYouProfile(input, nav);
  }

  landsOnSameProfile(identity: CeleYouShareIdentity): boolean {
    return shareArtifactsLandOnSameProfile(identity);
  }
}
