import { isUploadedMediaUrl } from "@/lib/uploads/media-url";
import {
  CELEVENTIC_LOGO_MARK,
  CELEVENTIC_OFFICIAL_LOGO,
  type QrLogoSizePreset,
} from "@/lib/qr/qr-constants";

export type QrCenterSource = "hero" | "couple" | "qr-upload" | "logo";

export type QrCenterMark = {
  url: string;
  source: QrCenterSource;
  logoSize: QrLogoSizePreset;
};

const STOCK_CENTER_RE =
  /\/templates\/|\/brand\/|monogram-qr|share-placecard|(?:^|\/)(?:icons\/)?whatsapp[^/]*\.(?:png|svg|webp)$/i;

function trimUrl(value?: string | null): string | null {
  const url = value?.trim();
  return url || null;
}

function pathnameOf(value: string): string {
  if (/^https?:\/\//i.test(value)) {
    try {
      return new URL(value).pathname;
    } catch {
      return value;
    }
  }
  return value;
}

/** Dedicated Aurelia/Seraphine album inset — Enock & Ruth looking-back portrait. */
export function isFamilyAlbumQrCenter(value?: string | null): boolean {
  const url = trimUrl(value);
  if (!url) return false;
  return /\/templates\/(?:aurelia|seraphine)\/qr-center\.(?:jpe?g|png|webp)$/i.test(
    pathnameOf(url)
  );
}

/** Catalogue / brand / WhatsApp art is never an organizer photo. */
export function isStockQrCenter(value?: string | null): boolean {
  const url = trimUrl(value);
  if (!url) return true;
  if (isFamilyAlbumQrCenter(url)) return false;
  return STOCK_CENTER_RE.test(pathnameOf(url));
}

/** Official Celeventic wordmark / square mark — the only non-photo QR inset. */
export function isOfficialCeleventicQrCenter(value?: string | null): boolean {
  const url = trimUrl(value);
  if (!url) return false;
  const path = pathnameOf(url);
  return path === CELEVENTIC_OFFICIAL_LOGO || path === CELEVENTIC_LOGO_MARK || path.startsWith("/brand/");
}

/**
 * Organizer-uploaded photograph (Studio hero, cover, or QR branding).
 * Unsplash / template / demo scenery URLs never count.
 */
export function isOrganizerUploadedQrCenter(value?: string | null): boolean {
  const url = trimUrl(value);
  if (!url || isStockQrCenter(url)) return false;
  if (url.startsWith("data:image/")) return true;
  return isUploadedMediaUrl(url);
}

/** A `center=` query may pin an uploaded photo, the family album portrait, or the official logo. */
export function isPinnedQrCenterAllowed(value?: string | null): boolean {
  return (
    isOrganizerUploadedQrCenter(value) ||
    isOfficialCeleventicQrCenter(value) ||
    isFamilyAlbumQrCenter(value)
  );
}

function firstUploaded(values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (isOrganizerUploadedQrCenter(value)) return value!.trim();
  }
  return null;
}

export type QrCenterResolutionInput = {
  heroImageUrl?: string | null;
  coverImageUrl?: string | null;
  introImageUrl?: string | null;
  galleryUrls?: Array<string | null | undefined> | null;
  mediaUrls?: Array<string | null | undefined> | null;
  qrCenterImageUrl?: string | null;
};

/**
 * Guest-facing QR inset.
 * 1. Uploaded invitation hero
 * 2. Event cover photograph (hero equivalent)
 * 3. Explicit QR-center upload (real photo only — not stock, not intro/gallery dump)
 * 4. Official Celeventic logo
 */
export function resolveQrCenterMark(input: QrCenterResolutionInput): QrCenterMark {
  const hero = firstUploaded([input.heroImageUrl, input.coverImageUrl]);
  if (hero) {
    return {
      url: hero,
      source: input.heroImageUrl && isOrganizerUploadedQrCenter(input.heroImageUrl) ? "hero" : "couple",
      logoSize: "hero",
    };
  }

  const qrUpload = firstUploaded([input.qrCenterImageUrl]);
  if (qrUpload) return { url: qrUpload, source: "qr-upload", logoSize: "hero" };

  return { url: CELEVENTIC_OFFICIAL_LOGO, source: "logo", logoSize: "balanced" };
}

export function extractDesignQrPhotoSources(designConfig: unknown): {
  heroImageUrl: string | null;
  introImageUrl: string | null;
  mediaUrls: string[];
} {
  if (!designConfig || typeof designConfig !== "object") {
    return { heroImageUrl: null, introImageUrl: null, mediaUrls: [] };
  }
  const design = designConfig as {
    media?: Array<{ url?: unknown; type?: unknown; role?: unknown }>;
    experience?: { aureliaWedding?: { heroImageUrl?: unknown } };
  };
  const media = Array.isArray(design.media) ? design.media : [];
  const images = media.filter((item) => {
    const type = typeof item?.type === "string" ? item.type : "image";
    return type === "image" && typeof item?.url === "string";
  });
  const byRole = (role: string) =>
    images.find((item) => item.role === role)?.url as string | undefined;

  const weddingHero =
    typeof design.experience?.aureliaWedding?.heroImageUrl === "string"
      ? design.experience.aureliaWedding.heroImageUrl
      : null;

  return {
    heroImageUrl: firstUploaded([byRole("hero"), weddingHero]),
    introImageUrl: firstUploaded([byRole("intro")]),
    mediaUrls: images
      .filter((item) => item.role !== "background")
      .map((item) => String(item.url)),
  };
}
