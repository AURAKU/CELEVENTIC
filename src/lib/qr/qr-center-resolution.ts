import { CELEVENTIC_OFFICIAL_LOGO, type QrLogoSizePreset } from "@/lib/qr/qr-constants";

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

/** Catalogue / brand / WhatsApp art is never an organizer photo. */
export function isStockQrCenter(value?: string | null): boolean {
  const url = trimUrl(value);
  if (!url) return true;
  return STOCK_CENTER_RE.test(pathnameOf(url));
}

/** Organizer-uploaded photograph (Studio hero, gallery, cover, QR branding). */
export function isOrganizerUploadedQrCenter(value?: string | null): boolean {
  const url = trimUrl(value);
  if (!url || isStockQrCenter(url)) return false;
  if (url.startsWith("data:image/")) return true;
  if (/^https?:\/\//i.test(url)) return true;
  return (
    url.startsWith("/uploads/") ||
    url.startsWith("/api/uploads/") ||
    url.startsWith("/api/media/")
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
 * 2. First uploaded couple / gallery photograph
 * 3. Explicit QR-center upload (only if it is a real photo, not stock art)
 * 4. Official Celeventic logo
 */
export function resolveQrCenterMark(input: QrCenterResolutionInput): QrCenterMark {
  const hero = firstUploaded([input.heroImageUrl]);
  if (hero) return { url: hero, source: "hero", logoSize: "hero" };

  const couple = firstUploaded([
    input.coverImageUrl,
    input.introImageUrl,
    ...(input.galleryUrls ?? []),
    ...(input.mediaUrls ?? []),
  ]);
  if (couple) return { url: couple, source: "couple", logoSize: "hero" };

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
