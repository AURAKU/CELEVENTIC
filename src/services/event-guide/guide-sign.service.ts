import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import sharp from "sharp";
import { generateBrandedQrPng } from "@/lib/qr/branded-qr-generator";
import { qrBrandingService } from "@/services/qr/qr-branding.service";
import { createAuditLog } from "@/lib/audit";
import { ensureReadable, relativeLuminance } from "@/lib/event-guide/theme";
import {
  SIGN_SIZES,
  SIGN_TEMPLATES,
  computeSignLayout,
  resolveSignCopy,
  type SignQrLayout,
  type SignSizeKey,
  type SignTemplateKey,
} from "@/lib/event-guide/signage";
import type { GuideThemeTokens } from "@/lib/event-guide/types";

/** QR export resolution — plenty for A3 at 300dpi without bloating the PDF. */
const QR_SOURCE_PX = 2048;

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "event"
  );
}

/**
 * Signs print on white or near-white stock regardless of the on-screen theme
 * background, so the label shade is measured against the paper it lands on.
 */
function signLabelColor(theme: GuideThemeTokens): string {
  return ensureReadable(theme.colors.secondary, theme.colors.background ?? "#ffffff").color;
}

function toRgb(hex: string, fallback: [number, number, number] = [0.15, 0.13, 0.1]) {
  const raw = hex.trim().replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (full.length !== 6) return rgb(...fallback);
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  if ([r, g, b].some(Number.isNaN)) return rgb(...fallback);
  return rgb(r, g, b);
}

/** Centre a single line, trimming rather than overflowing the margins. */
function drawCentred(
  page: PDFPage,
  text: string,
  options: { y: number; size: number; font: PDFFont; color: ReturnType<typeof rgb>; maxWidth: number }
) {
  let line = text;
  let width = options.font.widthOfTextAtSize(line, options.size);
  while (width > options.maxWidth && line.length > 4) {
    line = `${line.slice(0, -2).trimEnd()}…`;
    width = options.font.widthOfTextAtSize(line, options.size);
  }
  page.drawText(line, {
    x: (page.getWidth() - width) / 2,
    y: options.y,
    size: options.size,
    font: options.font,
    color: options.color,
  });
}

export interface SignRequest {
  eventId: string;
  actorId: string;
  eventTitle: string;
  celebrants: string | null;
  dateLabel: string | null;
  venue: string | null;
  theme: GuideThemeTokens;
  template: SignTemplateKey;
  size: SignSizeKey;
  layout: SignQrLayout;
  onlineUrl: string;
  offlineUrl: string | null;
  wifiName: string | null;
}

export class GuideSignService {
  /**
   * Render a welcome-board sign.
   *
   * The QR is printed on a solid white plate with a generous quiet zone. Venue
   * card stock and warm uplighting are exactly the conditions where a code
   * printed straight onto a coloured background stops scanning.
   */
  async buildPdf(input: SignRequest): Promise<{ buffer: Buffer; filename: string }> {
    const layout = computeSignLayout(input.size, input.layout);
    const copy = resolveSignCopy({
      eventTitle: input.eventTitle,
      celebrants: input.celebrants,
      dateLabel: input.dateLabel,
      venue: input.venue,
      template: input.template,
      layout: input.layout,
      wifiName: input.wifiName,
    });

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([layout.size.width, layout.size.height]);
    const serif = await pdf.embedFont(StandardFonts.TimesRoman);
    const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
    const sans = await pdf.embedFont(StandardFonts.Helvetica);
    const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const ink = toRgb(input.theme.colors.text);
    const primary = toRgb(input.theme.colors.primary);
    // Every use of the accent on a sign is small print — the eyebrow, the QR
    // labels and the Wi-Fi warning. Printed on matte card under warm lighting a
    // decorative gold is unreadable at 9pt, so signs use the derived shade.
    const secondary = toRgb(signLabelColor(input.theme));
    const contentWidth = layout.size.width - layout.margin * 2;

    page.drawRectangle({
      x: 0,
      y: 0,
      width: layout.size.width,
      height: layout.size.height,
      color: toRgb(input.theme.colors.background, [0.98, 0.97, 0.95]),
    });

    drawCentred(page, copy.eyebrow.toUpperCase(), {
      y: layout.eyebrowY,
      size: 11 * layout.fontScale,
      font: sansBold,
      color: secondary,
      maxWidth: contentWidth,
    });

    drawCentred(page, copy.title, {
      y: layout.titleY,
      size: 30 * layout.fontScale,
      font: serifBold,
      color: primary,
      maxWidth: contentWidth,
    });

    if (copy.celebrants) {
      drawCentred(page, copy.celebrants, {
        y: layout.celebrantsY,
        size: 17 * layout.fontScale,
        font: serif,
        color: ink,
        maxWidth: contentWidth,
      });
    }

    if (copy.detail) {
      drawCentred(page, copy.detail, {
        y: layout.detailY,
        size: 11 * layout.fontScale,
        font: sans,
        color: ink,
        maxWidth: contentWidth,
      });
    }

    const rule = SIGN_TEMPLATES[input.template].ruleWeight * layout.fontScale;
    page.drawLine({
      start: { x: layout.size.width / 2 - 40 * layout.fontScale, y: layout.detailY - 16 * layout.fontScale },
      end: { x: layout.size.width / 2 + 40 * layout.fontScale, y: layout.detailY - 16 * layout.fontScale },
      thickness: rule,
      color: secondary,
    });

    const centre = await qrBrandingService.resolveCenterImageUrl(input.eventId).catch(() => null);
    const logoSize = await qrBrandingService.resolveLogoSize(input.eventId).catch(() => undefined);

    const drawQr = async (
      url: string,
      box: { x: number; y: number; size: number },
      label: string | null
    ) => {
      const png = await generateBrandedQrPng(url, centre, QR_SOURCE_PX, "brand", logoSize);
      const image = await pdf.embedPng(png);

      // Printed quiet zone: a white plate wider than the code on every side.
      page.drawRectangle({
        x: box.x - layout.quietZone,
        y: box.y - layout.quietZone,
        width: box.size + layout.quietZone * 2,
        height: box.size + layout.quietZone * 2,
        color: rgb(1, 1, 1),
      });
      page.drawImage(image, { x: box.x, y: box.y, width: box.size, height: box.size });

      if (label) {
        const size = 10 * layout.fontScale;
        const width = sansBold.widthOfTextAtSize(label.toUpperCase(), size);
        page.drawText(label.toUpperCase(), {
          x: box.x + (box.size - width) / 2,
          y: box.y + box.size + layout.quietZone + 6 * layout.fontScale,
          size,
          font: sansBold,
          color: secondary,
        });
      }
    };

    await drawQr(input.onlineUrl, layout.qr, copy.primaryLabel);
    if (layout.secondaryQr && input.offlineUrl) {
      await drawQr(input.offlineUrl, layout.secondaryQr, copy.secondaryLabel);
    }

    drawCentred(page, copy.instruction, {
      y: layout.instructionY,
      size: 13 * layout.fontScale,
      font: serif,
      color: primary,
      maxWidth: contentWidth,
    });

    drawCentred(page, copy.supporting, {
      y: layout.instructionY - 18 * layout.fontScale,
      size: 10 * layout.fontScale,
      font: sans,
      color: ink,
      maxWidth: contentWidth,
    });

    if (copy.footer) {
      drawCentred(page, copy.footer, {
        y: layout.footerY,
        size: 9 * layout.fontScale,
        font: sans,
        color: secondary,
        maxWidth: contentWidth,
      });
    }

    const bytes = await pdf.save();
    await createAuditLog({
      userId: input.actorId,
      action: "CREATE",
      entity: "event_guide_sign",
      entityId: input.eventId,
      details: { size: input.size, template: input.template, layout: input.layout, format: "pdf" },
    });

    return {
      buffer: Buffer.from(bytes),
      filename: `${slugify(input.eventTitle)}-event-guide-sign-${input.size}.pdf`,
    };
  }

  /**
   * PNG of the same sign, rendered from the same layout so the two exports can
   * never drift. Sized for a 150dpi print or an on-screen welcome display.
   */
  async buildPng(input: SignRequest): Promise<{ buffer: Buffer; filename: string }> {
    const layout = computeSignLayout(input.size, input.layout);
    const copy = resolveSignCopy({
      eventTitle: input.eventTitle,
      celebrants: input.celebrants,
      dateLabel: input.dateLabel,
      venue: input.venue,
      template: input.template,
      layout: input.layout,
      wifiName: input.wifiName,
    });

    const scale = 150 / 72;
    const width = Math.round(layout.size.width * scale);
    const height = Math.round(layout.size.height * scale);
    const centre = await qrBrandingService.resolveCenterImageUrl(input.eventId).catch(() => null);
    const logoSize = await qrBrandingService.resolveLogoSize(input.eventId).catch(() => undefined);

    const composites: sharp.OverlayOptions[] = [];
    const place = async (url: string, box: { x: number; y: number; size: number }) => {
      const png = await generateBrandedQrPng(url, centre, QR_SOURCE_PX, "brand", logoSize);
      const target = Math.round(box.size * scale);
      composites.push({
        input: await sharp(png).resize(target, target).png().toBuffer(),
        left: Math.round(box.x * scale),
        // pdf-lib measures from the bottom; sharp from the top.
        top: Math.round((layout.size.height - box.y - box.size) * scale),
      });
    };

    await place(input.onlineUrl, layout.qr);
    if (layout.secondaryQr && input.offlineUrl) {
      await place(input.offlineUrl, layout.secondaryQr);
    }

    const textLayer = Buffer.from(this.svgTextLayer(width, height, scale, layout, copy, input.theme));
    composites.unshift({ input: textLayer, left: 0, top: 0 });

    // QR plates sit above the text layer so the quiet zone is never overprinted.
    const plates = [layout.qr, ...(layout.secondaryQr && input.offlineUrl ? [layout.secondaryQr] : [])];
    for (const [index, box] of plates.entries()) {
      const pad = Math.round(layout.quietZone * scale);
      const plateSize = Math.round(box.size * scale) + pad * 2;
      composites.splice(1 + index, 0, {
        input: await sharp({
          create: {
            width: plateSize,
            height: plateSize,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 },
          },
        })
          .png()
          .toBuffer(),
        left: Math.round(box.x * scale) - pad,
        top: Math.round((layout.size.height - box.y - box.size) * scale) - pad,
      });
    }

    const buffer = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: this.rgbaFromHex(input.theme.colors.background),
      },
    })
      .composite(composites)
      .png()
      .toBuffer();

    await createAuditLog({
      userId: input.actorId,
      action: "CREATE",
      entity: "event_guide_sign",
      entityId: input.eventId,
      details: { size: input.size, template: input.template, layout: input.layout, format: "png" },
    });

    return {
      buffer,
      filename: `${slugify(input.eventTitle)}-event-guide-sign-${input.size}.png`,
    };
  }

  private rgbaFromHex(hex: string) {
    const raw = hex.trim().replace("#", "");
    const full =
      raw.length === 3
        ? raw
            .split("")
            .map((c) => c + c)
            .join("")
        : raw;
    if (full.length !== 6) return { r: 251, g: 248, b: 243, alpha: 1 };
    return {
      r: parseInt(full.slice(0, 2), 16) || 0,
      g: parseInt(full.slice(2, 4), 16) || 0,
      b: parseInt(full.slice(4, 6), 16) || 0,
      alpha: 1,
    };
  }

  private svgTextLayer(
    width: number,
    height: number,
    scale: number,
    layout: ReturnType<typeof computeSignLayout>,
    copy: ReturnType<typeof resolveSignCopy>,
    theme: GuideThemeTokens
  ): string {
    const esc = (value: string) =>
      value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
    // SVG y grows downward; the layout is in PDF coordinates.
    const y = (pdfY: number) => (layout.size.height - pdfY) * scale;
    const cx = width / 2;
    const ink = theme.colors.text;
    const line = (
      text: string | null,
      pdfY: number,
      size: number,
      fill: string,
      family: string,
      weight = "400",
      spacing = "0"
    ) =>
      text
        ? `<text x="${cx}" y="${y(pdfY)}" text-anchor="middle" font-family="${family}" font-size="${size * scale}" font-weight="${weight}" letter-spacing="${spacing}" fill="${esc(fill)}">${esc(text)}</text>`
        : "";

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
${line(copy.eyebrow.toUpperCase(), layout.eyebrowY, 11, signLabelColor(theme), "Helvetica, Arial, sans-serif", "700", `${3 * scale}`)}
${line(copy.title, layout.titleY, 30, theme.colors.primary, "Georgia, 'Times New Roman', serif", "700")}
${line(copy.celebrants, layout.celebrantsY, 17, ink, "Georgia, 'Times New Roman', serif")}
${line(copy.detail, layout.detailY, 11, ink, "Helvetica, Arial, sans-serif")}
${line(copy.instruction, layout.instructionY, 13, theme.colors.primary, "Georgia, 'Times New Roman', serif")}
${line(copy.supporting, layout.instructionY - 18, 10, ink, "Helvetica, Arial, sans-serif")}
${line(copy.footer, layout.footerY, 9, signLabelColor(theme), "Helvetica, Arial, sans-serif")}
${
  copy.primaryLabel
    ? `<text x="${(layout.qr.x + layout.qr.size / 2) * scale}" y="${y(layout.qr.y + layout.qr.size + layout.quietZone + 6)}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${10 * scale}" font-weight="700" fill="${esc(signLabelColor(theme))}">${esc(copy.primaryLabel.toUpperCase())}</text>`
    : ""
}
${
  copy.secondaryLabel && layout.secondaryQr
    ? `<text x="${(layout.secondaryQr.x + layout.secondaryQr.size / 2) * scale}" y="${y(layout.secondaryQr.y + layout.secondaryQr.size + layout.quietZone + 6)}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${10 * scale}" font-weight="700" fill="${esc(signLabelColor(theme))}">${esc(copy.secondaryLabel.toUpperCase())}</text>`
    : ""
}
</svg>`;
  }

  /** Warn before printing an unreadable board. */
  signContrastWarning(theme: GuideThemeTokens): string | null {
    const background = relativeLuminance(theme.colors.background);
    const title = relativeLuminance(theme.colors.primary);
    if (background === null || title === null) return null;
    const lighter = Math.max(background, title);
    const darker = Math.min(background, title);
    const ratio = (lighter + 0.05) / (darker + 0.05);
    return ratio < 3
      ? "The title colour is very close to the sign background. Printed on card it will be hard to read from a distance."
      : null;
  }
}

export const guideSignService = new GuideSignService();
export { SIGN_SIZES, SIGN_TEMPLATES };
