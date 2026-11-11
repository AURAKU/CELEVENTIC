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
};

export type ShareProfileResult = "shared" | "copied" | "cancelled" | "unavailable";

export async function shareCeleYouProfile(
  input: ShareProfileInput,
  nav: Navigator | null | undefined = typeof navigator !== "undefined" ? navigator : null
): Promise<ShareProfileResult> {
  if (!input.url) return "unavailable";
  try {
    if (nav && typeof nav.share === "function") {
      await nav.share({ title: input.title, text: input.text, url: input.url });
      return "shared";
    }
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError") return "cancelled";
  }
  try {
    if (nav?.clipboard && typeof nav.clipboard.writeText === "function") {
      const clipboard = input.text.includes(input.url) ? input.text : `${input.text}\n${input.url}`;
      await Promise.race([
        nav.clipboard.writeText(clipboard),
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
