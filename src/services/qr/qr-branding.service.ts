import { prisma } from "@/lib/prisma";
import {
  generateBrandedQrDataUrl,
  generateBrandedQrPng,
  generateBrandedQrSvg,
} from "@/lib/qr/branded-qr-generator";
import { CELEVENTIC_OFFICIAL_LOGO, type QrDisplayMode, type QrExportSize, QR_DEFAULT_SIZE } from "@/lib/qr/qr-constants";
import { getCachedQrPng, setCachedQrPng } from "@/lib/qr/qr-cache";
import { buildVerifyUrl } from "@/lib/qr/parse-qr-payload";

const ADMIN_DEFAULT_KEY = "qr_default_logo_url";
/**
 * Backstop only. Clients compress before upload (see `QR_LOGO_COMPRESSION`), so
 * this exists to bound direct API calls rather than to gate the UI — the old 2MB
 * value rejected ordinary phone photos outright instead of shrinking them.
 */
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const QR_CENTER_ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export class QrBrandingService {
  async getAdminDefaultLogoUrl(): Promise<string> {
    const row = await prisma.adminSetting.findUnique({ where: { key: ADMIN_DEFAULT_KEY } });
    if (!row?.value) return CELEVENTIC_OFFICIAL_LOGO;
    const v = row.value;
    if (typeof v === "string" && v.length > 0) return v;
    if (typeof v === "object" && v !== null && "url" in v && typeof (v as { url: string }).url === "string") {
      return (v as { url: string }).url;
    }
    return CELEVENTIC_OFFICIAL_LOGO;
  }

  async setAdminDefaultLogoUrl(url: string) {
    await prisma.adminSetting.upsert({
      where: { key: ADMIN_DEFAULT_KEY },
      create: { key: ADMIN_DEFAULT_KEY, value: { url }, category: "qr_branding" },
      update: { value: { url } },
    });
  }

  /**
   * Resolve center image priority:
   * 1. Event logo (organizer)
   * 2. Event QR center upload
   * 3. Event cover image
   * 4. Organization logo
   * 5. Admin default → Celeventic official
   */
  async resolveCenterImageUrl(eventId: string): Promise<string> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        logoUrl: true,
        qrCenterImageUrl: true,
        coverImageUrl: true,
        organization: { select: { logoUrl: true } },
      },
    });

    const resolved =
      event?.logoUrl ??
      event?.qrCenterImageUrl ??
      event?.coverImageUrl ??
      event?.organization?.logoUrl ??
      null;

    if (resolved) return resolved;
    return this.getAdminDefaultLogoUrl();
  }

  async generateForToken(
    token: string,
    size: QrExportSize = QR_DEFAULT_SIZE,
    format: "png" | "svg" = "png",
    mode: QrDisplayMode = "brand"
  ): Promise<{ dataUrl: string; png: Buffer; svg: string; url: string; centerImage: string }> {
    const qr = await prisma.qrCode.findUnique({
      where: { token },
      select: { eventId: true },
    });
    const targetUrl = buildVerifyUrl(token);
    const centerImage = qr ? await this.resolveCenterImageUrl(qr.eventId) : await this.getAdminDefaultLogoUrl();

    if (format === "png" && mode === "brand") {
      const cached = await getCachedQrPng(token, size, centerImage);
      if (cached) {
        const svg = await generateBrandedQrSvg(targetUrl, centerImage, size, mode);
        return {
          dataUrl: `data:image/png;base64,${cached.toString("base64")}`,
          png: cached,
          svg,
          url: targetUrl,
          centerImage,
        };
      }
    }

    const [dataUrl, png, svg] = await Promise.all([
      generateBrandedQrDataUrl(targetUrl, centerImage, size, mode),
      generateBrandedQrPng(targetUrl, centerImage, size, mode),
      generateBrandedQrSvg(targetUrl, centerImage, size, mode),
    ]);

    if (mode === "brand") {
      await setCachedQrPng(token, size, centerImage, png);
    }

    return { dataUrl, png, svg, url: targetUrl, centerImage };
  }

  async generateForEvent(
    eventId: string,
    token: string,
    size: QrExportSize = QR_DEFAULT_SIZE,
    mode: QrDisplayMode = "brand"
  ): Promise<string> {
    const centerImage = await this.resolveCenterImageUrl(eventId);
    return generateBrandedQrDataUrl(buildVerifyUrl(token), centerImage, size, mode);
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
