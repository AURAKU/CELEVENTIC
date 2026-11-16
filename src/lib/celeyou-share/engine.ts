import { detectNfcWriteSupport } from "@/lib/digital-business-card/nfc-capability";
import { detectTapPlatform, type TapPlatform } from "@/lib/celeyou-proximity/capabilities";
import {
  shareArtifactsLandOnSameProfile,
  type CeleYouShareIdentity,
} from "@/lib/digital-business-card/share-identity";

export const SHARE_MY_CELEYOU = "Share my CeleYou";
export const SHARE_MY_CARD_CTA = "Share My Card";
export const SHARE_CARD_CTA = "Share Card";
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
  /** Saved + published plate PNG, then OG tile. Primary share attachment. */
  imageUrl?: string | string[] | null;
  /** Already resolved plate file. Wins over fetch and capture. */
  imageFile?: File | Blob | null;
  /** Fallback: capture on-screen `.celecard-face` only if published plate fetch fails. */
  capturePlate?: boolean | (() => Promise<File | null>);
  /** Owner card id. Stores a fallback capture so OG can reuse the same live plate. */
  persistPlateCardId?: string | null;
  /**
   * URL placement in the share payload:
   * - default: WhatsApp/Android keep "Meet {name}…\\n{url}" with the plate;
   *   iMessage omits the URL when a plate file is attached (avoids a second OG plate)
   * - false: never append the URL into `text` (wallet)
   * - true: always keep the live URL in `text` even on iMessage
   */
  includeUrlInText?: boolean;
};

export type ShareProfileResult = "shared" | "copied" | "downloaded" | "cancelled" | "unavailable";

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

function browserWindow(): Window | null {
  try {
    return typeof globalThis !== "undefined" && globalThis.window ? globalThis.window : null;
  } catch {
    return null;
  }
}

function browserDocument(): Document | null {
  try {
    return typeof globalThis !== "undefined" && globalThis.document ? globalThis.document : null;
  } catch {
    return null;
  }
}

const PLATE_FETCH_TIMEOUT_MS = 3500;
const PLATE_CAPTURE_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
  });
}

function absolutePlateFetchUrl(imageUrl: string): string {
  const raw = imageUrl.trim();
  if (!raw || /^https?:\/\//i.test(raw) || raw.startsWith("data:")) return raw;
  const win = browserWindow();
  if (!win?.location?.origin) return raw;
  try {
    return new URL(raw, win.location.origin).href;
  } catch {
    return raw;
  }
}

/** Same-origin first so Share/Copy attach the cardplate from the live page host. */
function plateFetchCandidates(imageUrl: string): string[] {
  const raw = imageUrl.trim();
  if (!raw) return [];
  const out: string[] = [];
  const win = browserWindow();
  const origin = win?.location?.origin?.replace(/\/$/, "") || "";
  if (origin) {
    try {
      const parsed = new URL(raw, origin);
      out.push(`${origin}${parsed.pathname}${parsed.search}`);
    } catch {
      /* ignore */
    }
  }
  const absolute = absolutePlateFetchUrl(raw);
  if (absolute && !out.includes(absolute)) out.push(absolute);
  if (raw.startsWith("/") && !out.includes(raw)) out.push(raw);
  return out;
}

const SHARE_PLATE_MAX_BYTES = 950_000;

async function compressPlateForShare(file: File): Promise<File> {
  if (file.size <= SHARE_PLATE_MAX_BYTES) return file;
  const doc = browserDocument();
  if (!doc || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, Math.sqrt(SHARE_PLATE_MAX_BYTES / Math.max(file.size, 1)) * 0.92);
    const width = Math.max(640, Math.round(bitmap.width * Math.min(1, Math.max(0.55, scale))));
    const height = Math.max(400, Math.round((bitmap.height / bitmap.width) * width));
    const canvas = doc.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((next) => resolve(next), "image/jpeg", 0.84)
    );
    if (!blob || blob.size < 64) return file;
    return new File([blob], "celeyou-plate.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

async function fetchLivePlateFile(imageUrl: string): Promise<File | null> {
  for (const href of plateFetchCandidates(imageUrl)) {
    try {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      // Always use the realm timer — preview/test window mocks often omit setTimeout.
      const timer = controller ? setTimeout(() => controller.abort(), PLATE_FETCH_TIMEOUT_MS) : null;
      const res = await fetch(href, {
        cache: "no-store",
        credentials: "same-origin",
        signal: controller?.signal,
      });
      if (timer) clearTimeout(timer);
      if (!res.ok) continue;
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength < 64) continue;
      if (!looksLikeImage(res.headers.get("content-type") || "", buffer)) continue;
      const type = (res.headers.get("content-type") || "").includes("jpeg")
        ? "image/jpeg"
        : "image/png";
      const name = type === "image/jpeg" ? "celeyou-plate.jpg" : "celeyou-plate.png";
      return await compressPlateForShare(new File([buffer], name, { type }));
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

function asPlateFile(blob: File | Blob | null | undefined): File | null {
  if (!blob || blob.size < 64) return null;
  if (blob instanceof File && blob.type.startsWith("image/")) {
    if (blob.name === "celeyou-plate.png" || blob.name === "celeyou-plate.jpg") return blob;
    const name = blob.type.includes("jpeg") ? "celeyou-plate.jpg" : "celeyou-plate.png";
    return new File([blob], name, { type: blob.type.includes("jpeg") ? "image/jpeg" : "image/png" });
  }
  return new File([blob], "celeyou-plate.png", { type: "image/png" });
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

async function captureOnScreenPlate(capturePlate?: ShareProfileInput["capturePlate"]): Promise<File | null> {
  if (capturePlate === false) return null;
  if (typeof capturePlate === "function") {
    try {
      return asPlateFile(await capturePlate());
    } catch {
      return null;
    }
  }
  if (typeof document === "undefined") return null;
  try {
    const { captureLivePlateFile } = await import("@/lib/digital-business-card/capture-live-plate");
    return asPlateFile(await captureLivePlateFile());
  } catch {
    return null;
  }
}

async function resolveLivePlateFile(input: ShareProfileInput): Promise<File | null> {
  const provided = asPlateFile(input.imageFile);
  if (provided) return compressPlateForShare(provided);

  // Source of truth: the cardholder's saved + published plate (PNG / OG / snapshot).
  // Capture the on-screen face only as a fallback when the published asset is unavailable.
  // Timeouts matter on live: hung DNS/fetch must not freeze SHARE on "Preparing card…".
  const capturePromise = withTimeout(captureOnScreenPlate(input.capturePlate), PLATE_CAPTURE_TIMEOUT_MS);
  const fetchPromise = withTimeout(livePlateFile(input.imageUrl), PLATE_FETCH_TIMEOUT_MS);
  const [captured, fetched] = await Promise.all([capturePromise, fetchPromise]);

  if (fetched) return fetched;

  if (captured) {
    const shareReady = await compressPlateForShare(captured);
    if (input.persistPlateCardId) {
      void import("@/lib/digital-business-card/capture-live-plate")
        .then(({ persistLivePlateSnapshot }) => persistLivePlateSnapshot(input.persistPlateCardId!, captured))
        .catch(() => undefined);
    }
    return shareReady;
  }
  return null;
}

function shareCaption(text: string, url: string) {
  return text.includes(url) ? text : `${text}\n${url}`;
}

/** Drop the live profile URL from caption text so iMessage does not unfurl a second plate. */
function withoutShareUrl(text: string, url: string) {
  const live = url.trim();
  if (!live) return text.trim();
  return text
    .split(live)
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function shareBodyText(
  input: ShareProfileInput,
  file: File | null,
  platform: TapPlatform = "unknown"
) {
  if (input.includeUrlInText === false) {
    return withoutShareUrl(input.text, input.url) || input.text.trim();
  }
  if (input.includeUrlInText === true) {
    return shareCaption(input.text, input.url);
  }
  // WhatsApp/Android: plate + "Meet {name}. Their live CeleYou plate." + URL (proven share voice).
  // iMessage: omit URL when a plate file is attached so iOS does not also unfurl a second OG plate.
  if (file && platform === "ios-safari") {
    return withoutShareUrl(input.text, input.url) || input.text.trim();
  }
  return shareCaption(input.text, input.url);
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

function clipboardItemCtor(): typeof ClipboardItem | null {
  return typeof ClipboardItem === "undefined" ? null : ClipboardItem;
}

async function asClipboardPng(file: File): Promise<Blob> {
  if (file.type === "image/png") return file;
  return new Blob([await file.arrayBuffer()], { type: "image/png" });
}

/**
 * Copy the live ID-1 plate plus the card URL. Chrome/Edge keep both.
 * Safari may accept only the PNG; the plate still carries the QR.
 */
export async function copyCeleYouProfile(
  input: ShareProfileInput,
  nav: Navigator | null | undefined = typeof navigator !== "undefined" ? navigator : null
): Promise<"copied" | "unavailable"> {
  if (!input.url || !nav?.clipboard) return "unavailable";
  const text = shareCaption(input.text, input.url);
  const filePromise = resolveLivePlateFile(input);
  const Item = clipboardItemCtor();
  const write = typeof nav.clipboard.write === "function" ? nav.clipboard.write.bind(nav.clipboard) : null;

  if (write && Item) {
    const image = filePromise.then((file) => {
      if (!file) throw new Error("no-plate");
      return asClipboardPng(file);
    });
    const plain = Promise.resolve(new Blob([text], { type: "text/plain" }));
    try {
      await write([new Item({ "image/png": image, "text/plain": plain })]);
      return "copied";
    } catch {
      try {
        await write([new Item({ "image/png": image })]);
        return "copied";
      } catch {
        /* text fallback */
      }
    }
  }

  try {
    if (typeof nav.clipboard.writeText !== "function") return "unavailable";
    await Promise.race([
      nav.clipboard.writeText(text),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("clipboard-timeout")), 1200);
      }),
    ]);
    return "copied";
  } catch {
    return "unavailable";
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

async function downloadPlateFallback(file: File): Promise<boolean> {
  const doc = browserDocument();
  if (!doc) return false;
  try {
    const href = URL.createObjectURL(file);
    const anchor = doc.createElement("a");
    anchor.href = href;
    anchor.download = file.name || "celeyou-plate.png";
    anchor.rel = "noopener";
    anchor.style.display = "none";
    doc.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    const win = browserWindow();
    if (win) {
      win.setTimeout(() => URL.revokeObjectURL(href), 2500);
    } else {
      URL.revokeObjectURL(href);
    }
    return true;
  } catch {
    return false;
  }
}

export async function shareCeleYouProfile(
  input: ShareProfileInput,
  nav: Navigator | null | undefined = typeof navigator !== "undefined" ? navigator : null
): Promise<ShareProfileResult> {
  if (!input.url) return "unavailable";
  const file = await resolveLivePlateFile(input);
  const platform = detectTapPlatform(nav);
  const text = shareBodyText(input, file, platform);
  if (nav && typeof nav.share === "function") {
    if (file) {
      // Attach the published plate. Caption carries Meet {name}… (+ URL on WhatsApp/Android).
      // Never pass a separate `url` field first — WhatsApp/Snapchat drop the image when url is set.
      const plateAndCaption = { title: input.title, text, files: [file] };
      if (canSharePayload(nav, plateAndCaption)) {
        const attached = await tryNativeShare(nav, plateAndCaption);
        if (attached !== "failed") return attached;
      }
      // Last resort for picky share targets that require a url field with files.
      const platePlusUrl = { title: input.title, text, files: [file], url: input.url };
      if (canSharePayload(nav, platePlusUrl)) {
        const withUrl = await tryNativeShare(nav, platePlusUrl);
        if (withUrl !== "failed") return withUrl;
      }
    }
    const linkText = shareCaption(text, input.url);
    try {
      await nav.share({ title: input.title, text: linkText, url: input.url });
      return "shared";
    } catch (error) {
      if (isShareAbort(error)) return "cancelled";
    }
  }

  // Desktop / embedded browsers often have no Web Share sheet. Copy first, then download the plate
  // so Share Card still delivers the live card image instead of appearing broken.
  const copied = await copyCeleYouProfile({ ...input, imageFile: file, capturePlate: false }, nav);
  if (copied === "copied") return "copied";
  if (file && (await downloadPlateFallback(file))) {
    try {
      if (nav?.clipboard && typeof nav.clipboard.writeText === "function") {
        await nav.clipboard.writeText(shareCaption(text, input.url));
      }
    } catch {
      /* plate download is enough */
    }
    return "downloaded";
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
