import QRCode from "qrcode";
import sharp from "sharp";
import { readFile } from "fs/promises";
import path from "path";
import {
  CELEVENTIC_LOGO_MARK,
  CELEVENTIC_OFFICIAL_LOGO,
  QR_DEFAULT_LOGO_SIZE,
  QR_DEFAULT_SIZE,
  QR_LOGO_SIZE_PRESETS,
  type QrDisplayMode,
  type QrExportSize,
  type QrLogoSizePreset,
} from "@/lib/qr/qr-constants";
import { readUploadFile } from "@/lib/uploads/file-storage";

/** Error correction H supports ~30% overlay coverage */
const ERROR_LEVEL = "H" as const;
/** Quiet zone in modules (ISO recommends 4) */
const QR_MARGIN = 4;
/**
 * White frame grows beyond the logo mark. Keep framed inset ≤ ~27% of QR width
 * (see QR_LOGO_SIZE_PRESETS) so scans stay reliable with error-correction H.
 */
const FRAME_PAD_RATIO = 0.12;
/** Corner radius as a fraction of the white frame — modest so the mark isn't clipped */
const FRAME_RADIUS_RATIO = 0.14;
/**
 * Extra inset past the geometric corner-clearance so contain-fitted marks
 * never kiss the rounded stroke.
 */
const LOGO_CORNER_CLEARANCE_RATIO = 0.02;
/** Minimum pad as a fraction of the white frame (keeps a visible white ring) */
const LOGO_MIN_PAD_RATIO = 0.06;

const BRAND_DARK = "#0B8A83";
const BRAND_LIGHT = "#FFFFFF";

/** Pass mode — pure black/white, wider quiet zone, smaller logo for screen scanning */
const PASS_DARK = "#000000";
const PASS_LIGHT = "#FFFFFF";
const PASS_MARGIN = 8;
const PASS_LOGO_RATIOS: Record<QrLogoSizePreset, number> = {
  subtle: 0.12,
  balanced: 0.14,
  bold: 0.15,
};

function resolveLogoRatio(mode: QrDisplayMode, logoSize: QrLogoSizePreset = QR_DEFAULT_LOGO_SIZE): number {
  if (mode === "pass") return PASS_LOGO_RATIOS[logoSize];
  return QR_LOGO_SIZE_PRESETS[logoSize];
}

function colorsForMode(mode: QrDisplayMode, logoSize: QrLogoSizePreset = QR_DEFAULT_LOGO_SIZE) {
  return mode === "pass"
    ? { dark: PASS_DARK, light: PASS_LIGHT, margin: PASS_MARGIN, logoRatio: resolveLogoRatio(mode, logoSize) }
    : { dark: BRAND_DARK, light: BRAND_LIGHT, margin: QR_MARGIN, logoRatio: resolveLogoRatio(mode, logoSize) };
}

/** Geometry for the white inset + contained logo (shared by PNG + SVG). */
function logoInsetLayout(qrSize: number, logoRatio: number) {
  const logoSizePx = Math.round(qrSize * logoRatio);
  const frameSize = Math.round(logoSizePx * (1 + FRAME_PAD_RATIO * 2));
  const radius = Math.max(4, Math.round(frameSize * FRAME_RADIUS_RATIO));
  // Square marks need pad ≥ R(1 − 1/√2) so corners stay inside the rounded disc.
  // Using full R wasted white space and made contain-fitted logos look clipped/tiny.
  const cornerClear = Math.ceil(
    radius * (1 - 1 / Math.SQRT2) + frameSize * LOGO_CORNER_CLEARANCE_RATIO
  );
  const pad = Math.max(cornerClear, Math.round(frameSize * LOGO_MIN_PAD_RATIO));
  const innerLogo = Math.max(8, frameSize - 2 * pad);
  return { logoSizePx, frameSize, radius, pad, innerLogo };
}

/**
 * Load an image from disk. Web paths (`/brand/...`) always resolve under `public/`.
 * Real OS absolute paths (tests, `src/app/icon.png`) are tried as-is.
 */
async function readLocalImage(relativeOrAbsolute: string): Promise<Buffer | null> {
  const candidates: string[] = [];
  const isOsAbsolute =
    path.isAbsolute(relativeOrAbsolute) &&
    /^\/(Users|home|var|tmp|opt|private|Volumes|mnt)\b/.test(relativeOrAbsolute);

  if (isOsAbsolute) {
    candidates.push(relativeOrAbsolute);
  } else {
    // Strip leading slash so path.join never treats `/brand/...` as filesystem root.
    candidates.push(path.join(process.cwd(), "public", relativeOrAbsolute.replace(/^\/+/, "")));
    if (!relativeOrAbsolute.startsWith("/")) {
      candidates.push(relativeOrAbsolute);
    }
  }

  for (const filePath of candidates) {
    try {
      return await readFile(filePath);
    } catch {
      // try next
    }
  }
  return null;
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
  // Prefer the full wordmark for guest-facing invites; square mark as backup.
  const candidates = [CELEVENTIC_OFFICIAL_LOGO, CELEVENTIC_LOGO_MARK];
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
      // Read through the storage layer (local disk and/or S3).
      buf = await readUploadFile(imageUrl.slice("/api/uploads/".length));
    } else if (imageUrl.startsWith("/uploads/")) {
      buf = await readUploadFile(imageUrl.slice("/uploads/".length));
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

/**
 * Fit the full uploaded mark inside a square with letterboxing (never crop).
 * Output is always `innerLogo × innerLogo` PNG with transparent padding.
 */
async function containLogoPng(logoSource: Buffer, innerLogo: number): Promise<Buffer> {
  return sharp(logoSource)
    .ensureAlpha()
    .resize(innerLogo, innerLogo, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();
}

async function buildLogoOverlay(
  size: QrExportSize,
  centerImageUrl?: string | null,
  mode: QrDisplayMode = "brand",
  logoSize: QrLogoSizePreset = QR_DEFAULT_LOGO_SIZE
) {
  const { logoRatio } = colorsForMode(mode, logoSize);
  const logoSource = await loadCenterImageBuffer(centerImageUrl);
  const { frameSize, radius, pad, innerLogo } = logoInsetLayout(size, logoRatio);
  const shadowBlur = Math.max(4, Math.round(frameSize * 0.04));
  const shadowOffset = Math.max(2, Math.round(frameSize * 0.02));
  const canvasSize = frameSize + shadowBlur * 2 + shadowOffset;

  const resizedLogo = await containLogoPng(logoSource, innerLogo);

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
        top: shadowBlur + pad,
        left: shadowBlur + pad,
      },
    ])
    .png()
    .toBuffer();

  const offset = Math.round((size - canvasSize) / 2);
  return { logoOnFrame, offset };
}

/**
 * Generate a branded QR PNG with centered logo in a white rounded-square frame.
 * Always uses error-correction H so larger center logos remain scannable.
 * Uploaded marks are always object-fit: contain (never cropped) inside the inset.
 */
export async function generateBrandedQrPng(
  targetUrl: string,
  centerImageUrl?: string | null,
  size: QrExportSize = QR_DEFAULT_SIZE,
  mode: QrDisplayMode = "brand",
  logoSize: QrLogoSizePreset = QR_DEFAULT_LOGO_SIZE
): Promise<Buffer> {
  const { dark, light, margin } = colorsForMode(mode, logoSize);
  const qrBuffer = await QRCode.toBuffer(targetUrl, {
    type: "png",
    width: size,
    margin,
    errorCorrectionLevel: ERROR_LEVEL,
    color: { dark, light },
  });

  const { logoOnFrame, offset } = await buildLogoOverlay(size, centerImageUrl, mode, logoSize);

  return sharp(qrBuffer)
    .composite([{ input: logoOnFrame, top: offset, left: offset }])
    .png({ compressionLevel: 6 })
    .toBuffer();
}

/** Branded QR as SVG (print-friendly vector base + embedded contained logo) */
export async function generateBrandedQrSvg(
  targetUrl: string,
  centerImageUrl?: string | null,
  size: QrExportSize = QR_DEFAULT_SIZE,
  mode: QrDisplayMode = "brand",
  logoSize: QrLogoSizePreset = QR_DEFAULT_LOGO_SIZE
): Promise<string> {
  const { dark, light, margin, logoRatio } = colorsForMode(mode, logoSize);
  const qrSvg = await QRCode.toString(targetUrl, {
    type: "svg",
    width: size,
    margin,
    errorCorrectionLevel: ERROR_LEVEL,
    color: { dark, light },
  });

  const logoSource = await loadCenterImageBuffer(centerImageUrl);
  const { frameSize, radius, pad, innerLogo } = logoInsetLayout(size, logoRatio);
  const frameX = Math.round((size - frameSize) / 2);
  const frameY = frameX;
  const logoX = frameX + pad;
  const logoY = frameY + pad;
  // Same contain pipeline as PNG — never embed a raw JPEG as image/png.
  const contained = await containLogoPng(logoSource, innerLogo);
  const logoB64 = contained.toString("base64");

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
  mode: QrDisplayMode = "brand",
  logoSize: QrLogoSizePreset = QR_DEFAULT_LOGO_SIZE
): Promise<string> {
  const png = await generateBrandedQrPng(targetUrl, centerImageUrl, size, mode, logoSize);
  return `data:image/png;base64,${png.toString("base64")}`;
}

export function brandedQrDownloadUrl(token: string, size?: QrExportSize): string {
  const params = new URLSearchParams({ token, download: "1" });
  if (size) params.set("size", String(size));
  return `/api/qr/image?${params.toString()}`;
}

/** @deprecated use QR_DEFAULT_SIZE */
export const BRANDED_QR_SIZE = QR_DEFAULT_SIZE;
