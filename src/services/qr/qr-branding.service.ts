import { prisma } from "@/lib/prisma";
import {
  generateBrandedQrDataUrl,
  generateBrandedQrPng,
  generateBrandedQrSvg,
} from "@/lib/qr/branded-qr-generator";
import {
  CELEVENTIC_OFFICIAL_LOGO,
  QR_DEFAULT_LOGO_SIZE,
  QR_DEFAULT_SIZE,
  parseQrLogoSize,
  type QrDashboardLogoSize,
  type QrDisplayMode,
  type QrExportSize,
  type QrLogoSizePreset,
} from "@/lib/qr/qr-constants";
import { getCachedQrPng, setCachedQrPng } from "@/lib/qr/qr-cache";
import { buildVerifyUrl } from "@/lib/qr/parse-qr-payload";
import {
  extractDesignQrPhotoSources,
  resolveQrCenterMark,
} from "@/lib/qr/qr-center-resolution";

const ADMIN_DEFAULT_KEY = "qr_default_logo_url";
const ADMIN_LOGO_SIZE_KEY = "qr_default_logo_size";
/**
 * Backstop only. Clients compress before upload (see `QR_LOGO_COMPRESSION`), so
 * this exists to bound direct API calls rather than to gate the UI — the old 2MB
 * value rejected ordinary phone photos outright instead of shrinking them.
 */
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const QR_CENTER_ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type AdminLogoValue = { url?: string; logoSize?: string };

function readAdminLogoUrl(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "object" && value !== null && "url" in value) {
    const url = (value as AdminLogoValue).url;
    if (typeof url === "string" && url.length > 0) return url;
  }
  return null;
}

export class QrBrandingService {
  async getAdminDefaultLogoUrl(): Promise<string> {
    const row = await prisma.adminSetting.findUnique({ where: { key: ADMIN_DEFAULT_KEY } });
    return readAdminLogoUrl(row?.value) ?? CELEVENTIC_OFFICIAL_LOGO;
  }

  async getAdminDefaultLogoSize(): Promise<QrDashboardLogoSize> {
    const sizeRow = await prisma.adminSetting.findUnique({ where: { key: ADMIN_LOGO_SIZE_KEY } });
    if (sizeRow?.value != null) {
      if (typeof sizeRow.value === "string") return parseQrLogoSize(sizeRow.value);
      if (typeof sizeRow.value === "object" && sizeRow.value !== null && "logoSize" in sizeRow.value) {
        return parseQrLogoSize((sizeRow.value as AdminLogoValue).logoSize);
      }
    }
    // Legacy: logo size may live next to the URL object
    const logoRow = await prisma.adminSetting.findUnique({ where: { key: ADMIN_DEFAULT_KEY } });
    if (logoRow?.value && typeof logoRow.value === "object" && logoRow.value !== null && "logoSize" in logoRow.value) {
      return parseQrLogoSize((logoRow.value as AdminLogoValue).logoSize);
    }
    return QR_DEFAULT_LOGO_SIZE;
  }

  async setAdminDefaultLogoUrl(url: string) {
    const existing = await prisma.adminSetting.findUnique({ where: { key: ADMIN_DEFAULT_KEY } });
    const prev =
      existing?.value && typeof existing.value === "object" && existing.value !== null
        ? (existing.value as AdminLogoValue)
        : {};
    const logoSize = parseQrLogoSize(prev.logoSize);
    await prisma.adminSetting.upsert({
      where: { key: ADMIN_DEFAULT_KEY },
      create: { key: ADMIN_DEFAULT_KEY, value: { url, logoSize }, category: "qr_branding" },
      update: { value: { url, logoSize } },
    });
  }

  async setAdminDefaultLogoSize(logoSize: QrLogoSizePreset) {
    const size = parseQrLogoSize(logoSize);
    await prisma.adminSetting.upsert({
      where: { key: ADMIN_LOGO_SIZE_KEY },
      create: { key: ADMIN_LOGO_SIZE_KEY, value: { logoSize: size }, category: "qr_branding" },
      update: { value: { logoSize: size } },
    });

    // Keep size mirrored on the logo row when present
    const logoRow = await prisma.adminSetting.findUnique({ where: { key: ADMIN_DEFAULT_KEY } });
    const url = readAdminLogoUrl(logoRow?.value);
    if (url) {
      await prisma.adminSetting.update({
        where: { key: ADMIN_DEFAULT_KEY },
        data: { value: { url, logoSize: size } },
      });
    }
  }

  /**
   * Resolve center image priority:
   * 1. Uploaded invitation hero
   * 2. First uploaded couple / gallery photograph
   * 3. Explicit QR-center upload (only if it is a real photo, not stock art)
   * 4. Official Celeventic logo (`/brand/logo-full.png`)
   *
   * Template stock (Aurelia/Seraphine heroes, crests, WhatsApp marks) never
   * counts as an uploaded photograph.
   */
  async resolveCenterImageUrl(eventId: string): Promise<string> {
    const mark = await this.resolveCenterMark(eventId);
    return mark.url;
  }

  async resolveCenterMark(eventId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        qrCenterImageUrl: true,
        coverImageUrl: true,
        media: {
          orderBy: { sortOrder: "asc" },
          select: { url: true, type: true },
          take: 12,
        },
        invitations: {
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: { designConfig: true },
        },
      },
    });

    const designSources = extractDesignQrPhotoSources(event?.invitations[0]?.designConfig);
    const galleryUrls =
      event?.media
        ?.filter((item) => item.type !== "video")
        .map((item) => item.url) ?? [];

    return resolveQrCenterMark({
      heroImageUrl: designSources.heroImageUrl,
      introImageUrl: designSources.introImageUrl,
      coverImageUrl: event?.coverImageUrl,
      galleryUrls,
      mediaUrls: designSources.mediaUrls,
      qrCenterImageUrl: event?.qrCenterImageUrl,
    });
  }

  /** Event override → admin platform default → balanced */
  async resolveLogoSize(eventId: string): Promise<QrDashboardLogoSize> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { qrLogoSize: true },
    });
    if (event?.qrLogoSize) return parseQrLogoSize(event.qrLogoSize);
    return this.getAdminDefaultLogoSize();
  }

  async setEventLogoSize(eventId: string, logoSize: QrLogoSizePreset | null) {
    await prisma.event.update({
      where: { id: eventId },
      data: { qrLogoSize: logoSize ? parseQrLogoSize(logoSize) : null },
    });
  }

  async generateForToken(
    token: string,
    size: QrExportSize = QR_DEFAULT_SIZE,
    format: "png" | "svg" = "png",
    mode: QrDisplayMode = "brand"
  ): Promise<{ dataUrl: string; png: Buffer; svg: string; url: string; centerImage: string; logoSize: QrLogoSizePreset }> {
    const qr = await prisma.qrCode.findUnique({
      where: { token },
      select: { eventId: true },
    });
    const targetUrl = buildVerifyUrl(token);
    const mark = qr ? await this.resolveCenterMark(qr.eventId) : null;
    const centerImage = mark?.url ?? (await this.getAdminDefaultLogoUrl());
    const logoSize = mark?.logoSize ?? (await this.getAdminDefaultLogoSize());

    if (format === "png" && mode === "brand") {
      const cached = await getCachedQrPng(token, size, centerImage, logoSize);
      if (cached) {
        const svg = await generateBrandedQrSvg(targetUrl, centerImage, size, mode, logoSize);
        return {
          dataUrl: `data:image/png;base64,${cached.toString("base64")}`,
          png: cached,
          svg,
          url: targetUrl,
          centerImage,
          logoSize,
        };
      }
    }

    const [dataUrl, png, svg] = await Promise.all([
      generateBrandedQrDataUrl(targetUrl, centerImage, size, mode, logoSize),
      generateBrandedQrPng(targetUrl, centerImage, size, mode, logoSize),
      generateBrandedQrSvg(targetUrl, centerImage, size, mode, logoSize),
    ]);

    if (mode === "brand") {
      await setCachedQrPng(token, size, centerImage, png, logoSize);
    }

    return { dataUrl, png, svg, url: targetUrl, centerImage, logoSize };
  }

  async generateForEvent(
    eventId: string,
    token: string,
    size: QrExportSize = QR_DEFAULT_SIZE,
    mode: QrDisplayMode = "brand"
  ): Promise<string> {
    const mark = await this.resolveCenterMark(eventId);
    return generateBrandedQrDataUrl(buildVerifyUrl(token), mark.url, size, mode, mark.logoSize);
  }

  validateUpload(file: File): string | null {
    if (!QR_CENTER_ALLOWED_TYPES.has(file.type)) {
      return "Use JPEG, PNG, or WebP only.";
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return `Image must be ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB or smaller.`;
    }
    return null;
  }
}

export const qrBrandingService = new QrBrandingService();
