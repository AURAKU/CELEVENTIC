import QRCode from "qrcode";
import sharp from "sharp";
import { readFile } from "fs/promises";
import path from "path";
import {
  QR_DEFAULT_SIZE,
  type QrDisplayMode,
  type QrExportSize,
} from "@/lib/qr/qr-constants";
import { readUploadFile } from "@/lib/uploads/file-storage";

/** Error correction H supports ~30% overlay coverage */
const ERROR_LEVEL = "H" as const;
/** Quiet zone in modules (ISO recommends 4) */
const QR_MARGIN = 4;
/** Center logo occupies 19% of QR width (within 18–20% spec) */
const LOGO_RATIO = 0.19;
/** White frame padding around logo (ratio of frame size) */
const FRAME_PAD_RATIO = 0.12;

const BRAND_DARK = "#0B8A83";
const BRAND_LIGHT = "#FFFFFF";

/** Pass mode — pure black/white, wider quiet zone, smaller logo for screen scanning */
const PASS_DARK = "#000000";
const PASS_LIGHT = "#FFFFFF";
const PASS_MARGIN = 8;
const PASS_LOGO_RATIO = 0.14;

function colorsForMode(mode: QrDisplayMode) {
  return mode === "pass"
    ? { dark: PASS_DARK, light: PASS_LIGHT, margin: PASS_MARGIN, logoRatio: PASS_LOGO_RATIO }
    : { dark: BRAND_DARK, light: BRAND_LIGHT, margin: QR_MARGIN, logoRatio: LOGO_RATIO };
}

async function readLocalImage(relativeOrAbsolute: string): Promise<Buffer | null> {
  try {
    const filePath = relativeOrAbsolute.startsWith("/")
      ? path.join(process.cwd(), "public", relativeOrAbsolute)
      : relativeOrAbsolute;
    return await readFile(filePath);
  } catch {
    return null;
  }
}

async function fetchRemoteImage(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 2 * 1024 * 1024) return null;
    return buf;
  } catch {
    return null;
  }
}

/** Built-in Celeventic mark when no logo file exists on disk */
async function celeventicFallbackLogo(): Promise<Buffer> {
  const candidates = ["/brand/logo-full.png", "/brand/logo-mark.png"];
  for (const c of candidates) {
    const buf = await readLocalImage(c);
    if (buf) return buf;
  }

  const iconPath = path.join(process.cwd(), "src", "app", "icon.png");
  const iconBuf = await readLocalImage(iconPath);
  if (iconBuf) return iconBuf;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <rect width="256" height="256" rx="48" fill="${BRAND_DARK}"/>
    <text x="128" y="175" font-family="Georgia,serif" font-size="140" font-weight="700" fill="#FFFFFF" text-anchor="middle">C</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function loadCenterImageBuffer(imageUrl?: string | null): Promise<Buffer> {
  if (imageUrl) {
    let buf: Buffer | null = null;
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      buf = await fetchRemoteImage(imageUrl);
    } else if (imageUrl.startsWith("/api/uploads/")) {
      // Uploaded assets are served by a route handler, not from public/. Joining
      // this URL onto public/ yields public/api/uploads/... which never exists,
      // so every uploaded QR centre logo silently fell back to the brand mark.
      // Read through the storage layer, which knows the real upload root.
      buf = await readUploadFile(imageUrl.slice("/api/uploads/".length));
    } else {
      buf = await readLocalImage(imageUrl);
    }
    if (buf) {
      try {
        const meta = await sharp(buf).metadata();
        if (meta.width && meta.height) return buf;
      } catch {
        // invalid image — fall through
      }
    }
  }
  return celeventicFallbackLogo();
}

async function buildLogoOverlay(
  size: QrExportSize,
  centerImageUrl?: string | null,
  mode: QrDisplayMode = "brand"
) {
  const { logoRatio } = colorsForMode(mode);
  const logoSource = await loadCenterImageBuffer(centerImageUrl);
  const logoSize = Math.round(size * logoRatio);
  const frameSize = Math.round(logoSize * (1 + FRAME_PAD_RATIO * 2));
  const innerLogo = Math.round(logoSize * 0.88);
  const radius = Math.round(frameSize * 0.18);
  const shadowBlur = Math.max(4, Math.round(frameSize * 0.04));
  const shadowOffset = Math.max(2, Math.round(frameSize * 0.02));
  const canvasSize = frameSize + shadowBlur * 2 + shadowOffset;

  const resizedLogo = await sharp(logoSource)
    .resize(innerLogo, innerLogo, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();

  const frameSvg = Buffer.from(
    `<svg width="${canvasSize}" height="${canvasSize}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="${shadowOffset}" stdDeviation="${shadowBlur / 2}" flood-color="rgba(15,23,42,0.18)"/>
        </filter>
      </defs>
      <g filter="url(#shadow)">
        <rect x="${shadowBlur}" y="${shadowBlur}" width="${frameSize}" height="${frameSize}" rx="${radius}" ry="${radius}" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
      </g>
    </svg>`
  );

  const frameBuffer = await sharp(frameSvg).png().toBuffer();
  const logoOnFrame = await sharp(frameBuffer)
    .composite([
      {
        input: resizedLogo,
        top: shadowBlur + Math.round((frameSize - innerLogo) / 2),
        left: shadowBlur + Math.round((frameSize - innerLogo) / 2),
      },
    ])
    .png()
    .toBuffer();

  const offset = Math.round((size - canvasSize) / 2);
  return { logoOnFrame, offset };
}

/**
 * Generate a branded QR PNG with centered logo in a white rounded-square frame.
 */
export async function generateBrandedQrPng(
  targetUrl: string,
  centerImageUrl?: string | null,
  size: QrExportSize = QR_DEFAULT_SIZE,
  mode: QrDisplayMode = "brand"
): Promise<Buffer> {
  const { dark, light, margin } = colorsForMode(mode);
  const qrBuffer = await QRCode.toBuffer(targetUrl, {
    type: "png",
    width: size,
    margin,
    errorCorrectionLevel: ERROR_LEVEL,
    color: { dark, light },
  });

  const { logoOnFrame, offset } = await buildLogoOverlay(size, centerImageUrl, mode);

  return sharp(qrBuffer)
    .composite([{ input: logoOnFrame, top: offset, left: offset }])
    .png({ compressionLevel: 6 })
    .toBuffer();
}

/** Branded QR as SVG (print-friendly vector base + embedded logo) */
export async function generateBrandedQrSvg(
  targetUrl: string,
  centerImageUrl?: string | null,
  size: QrExportSize = QR_DEFAULT_SIZE,
  mode: QrDisplayMode = "brand"
): Promise<string> {
  const { dark, light, margin, logoRatio } = colorsForMode(mode);
  const qrSvg = await QRCode.toString(targetUrl, {
    type: "svg",
    width: size,
    margin,
    errorCorrectionLevel: ERROR_LEVEL,
    color: { dark, light },
  });

  const logoSource = await loadCenterImageBuffer(centerImageUrl);
  const logoSize = Math.round(size * logoRatio);
  const frameSize = Math.round(logoSize * (1 + FRAME_PAD_RATIO * 2));
  const innerLogo = Math.round(logoSize * 0.88);
  const radius = Math.round(frameSize * 0.18);
  const frameX = Math.round((size - frameSize) / 2);
  const frameY = frameX;
  const logoX = frameX + Math.round((frameSize - innerLogo) / 2);
  const logoY = frameY + Math.round((frameSize - innerLogo) / 2);
  const logoB64 = logoSource.toString("base64");

  const overlay = `
    <g>
      <rect x="${frameX}" y="${frameY}" width="${frameSize}" height="${frameSize}" rx="${radius}" ry="${radius}" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2" filter="drop-shadow(0px 4px 8px rgba(15,23,42,0.15))"/>
      <image href="data:image/png;base64,${logoB64}" x="${logoX}" y="${logoY}" width="${innerLogo}" height="${innerLogo}" preserveAspectRatio="xMidYMid meet"/>
    </g>`;

  return qrSvg.replace("</svg>", `${overlay}</svg>`);
}

export async function generateBrandedQrDataUrl(
  targetUrl: string,
  centerImageUrl?: string | null,
  size: QrExportSize = QR_DEFAULT_SIZE,
  mode: QrDisplayMode = "brand"
): Promise<string> {
  const png = await generateBrandedQrPng(targetUrl, centerImageUrl, size, mode);
  return `data:image/png;base64,${png.toString("base64")}`;
}

export function brandedQrDownloadUrl(token: string, size?: QrExportSize): string {
  const params = new URLSearchParams({ token, download: "1" });
  if (size) params.set("size", String(size));
  return `/api/qr/image?${params.toString()}`;
}

/** @deprecated use QR_DEFAULT_SIZE */
export const BRANDED_QR_SIZE = QR_DEFAULT_SIZE;
