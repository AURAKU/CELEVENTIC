/**
 * Smart client-side image compression.
 *
 * Accepts an image of any size and shrinks it to fit a byte budget without
 * visible quality loss at the size it will actually be displayed. Rather than
 * rejecting large uploads, callers compress first and upload the result.
 *
 * Strategy, in order of preference (each step is cheaper visually than the next):
 *   1. Cap the longest edge at `maxEdge` — pixels beyond the display size are
 *      invisible, so removing them is free quality-wise.
 *   2. Step the encoder quality down toward `minQuality`.
 *   3. Only if still over budget, shrink dimensions further (never below `minEdge`).
 *
 * Transparency is preserved: logos are commonly transparent PNGs, and encoding
 * those to JPEG flattens the alpha channel to black.
 */

export interface SmartCompressOptions {
  /** Cap for the longest edge, in px. Pixels beyond display size are invisible. */
  maxEdge?: number;
  /** Byte budget. Compression stops as soon as output fits. */
  targetBytes?: number;
  /** Encoder quality floor — never degrade past this. */
  minQuality?: number;
  /** Starting encoder quality. */
  startQuality?: number;
  /** Never shrink the longest edge below this, even to hit the budget. */
  minEdge?: number;
}

export interface SmartCompressResult {
  blob: Blob;
  width: number;
  height: number;
  /** True when the source already fit the budget and was passed through untouched. */
  untouched: boolean;
  hasAlpha: boolean;
  originalBytes: number;
}

const DEFAULTS = {
  maxEdge: 1024,
  targetBytes: 1_500_000,
  minQuality: 0.62,
  startQuality: 0.94,
  minEdge: 256,
} as const;

/**
 * Tuning for QR centre logos.
 *
 * The branded QR generator draws the logo at `size * logoRatio * 0.9`. At the
 * largest export (2048px) with bold (0.22) that is 2048 * 0.22 * 0.9 ≈ 405px,
 * so the logo is never rendered above ~405px. A 1024px cap leaves headroom and
 * is therefore invisible in the QR output while cutting multi-megabyte photos.
 */
export const QR_LOGO_COMPRESSION: SmartCompressOptions = {
  maxEdge: 1024,
  targetBytes: 1_200_000,
  minQuality: 0.7,
  startQuality: 0.95,
  minEdge: 405,
};

/**
 * Inspiration / design-reference images.
 * Keep high resolution for palette + layout analysis; shrink only what the
 * model and UI never need. Quality floor stays high so details improve clarity
 * without looking compressed.
 */
export const INSPIRATION_IMAGE_COMPRESSION: SmartCompressOptions = {
  maxEdge: 4096,
  targetBytes: 2_400_000,
  minQuality: 0.85,
  startQuality: 0.96,
  minEdge: 1280,
};

let webpSupport: boolean | null = null;

/** Whether this browser can *encode* WebP (Safari <16 can decode but not encode). */
function supportsWebpEncoding(): boolean {
  if (webpSupport !== null) return webpSupport;
  try {
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    webpSupport = c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    webpSupport = false;
  }
  return webpSupport;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("blob:") && !src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Encode failed"))), type, quality);
  });
}

/**
 * Detect a meaningful alpha channel. Samples on a downscaled copy so cost stays
 * bounded regardless of source resolution.
 */
export function canvasHasAlpha(source: CanvasImageSource, w: number, h: number): boolean {
  const sampleEdge = 64;
  const scale = Math.min(1, sampleEdge / Math.max(w, h));
  const sw = Math.max(1, Math.round(w * scale));
  const sh = Math.max(1, Math.round(h * scale));
  const c = document.createElement("canvas");
  c.width = sw;
  c.height = sh;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  ctx.drawImage(source, 0, 0, sw, sh);
  try {
    const { data } = ctx.getImageData(0, 0, sw, sh);
    // Treat near-opaque as opaque to tolerate stray anti-aliasing noise.
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 250) return true;
    }
  } catch {
    // Tainted canvas (cross-origin) — assume alpha so we never flatten to black.
    return true;
  }
  return false;
}

/**
 * Downscale in halving steps. A single large drawImage aliases badly when the
 * reduction is more than ~2x; repeated halving keeps edges and small text sharp.
 */
function drawScaled(img: CanvasImageSource, sw: number, sh: number, dw: number, dh: number): HTMLCanvasElement {
  let curW = sw;
  let curH = sh;
  let canvas = document.createElement("canvas");
  canvas.width = curW;
  canvas.height = curH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, curW, curH);

  while (curW > dw * 2 && curH > dh * 2) {
    const nextW = Math.max(dw, Math.round(curW / 2));
    const nextH = Math.max(dh, Math.round(curH / 2));
    const next = document.createElement("canvas");
    next.width = nextW;
    next.height = nextH;
    const nctx = next.getContext("2d");
    if (!nctx) break;
    nctx.imageSmoothingEnabled = true;
    nctx.imageSmoothingQuality = "high";
    nctx.drawImage(canvas, 0, 0, nextW, nextH);
    canvas = next;
    curW = nextW;
    curH = nextH;
  }

  if (curW !== dw || curH !== dh) {
    const final = document.createElement("canvas");
    final.width = dw;
    final.height = dh;
    const fctx = final.getContext("2d");
    if (!fctx) throw new Error("Canvas unavailable");
    fctx.imageSmoothingEnabled = true;
    fctx.imageSmoothingQuality = "high";
    fctx.drawImage(canvas, 0, 0, dw, dh);
    canvas = final;
  }

  return canvas;
}

/**
 * Compress `input` to fit the byte budget, preserving transparency and avoiding
 * any resolution loss that would be visible at the target display size.
 */
export async function smartCompressImage(
  input: Blob,
  options?: SmartCompressOptions
): Promise<SmartCompressResult> {
  const maxEdge = options?.maxEdge ?? DEFAULTS.maxEdge;
  const targetBytes = options?.targetBytes ?? DEFAULTS.targetBytes;
  const minQuality = options?.minQuality ?? DEFAULTS.minQuality;
  const startQuality = options?.startQuality ?? DEFAULTS.startQuality;
  const minEdge = options?.minEdge ?? DEFAULTS.minEdge;

  const src = URL.createObjectURL(input);
  try {
    const img = await loadImage(src);
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    if (!naturalW || !naturalH) throw new Error("Invalid image");

    const hasAlpha = canvasHasAlpha(img, naturalW, naturalH);

    // Already small enough and within the display cap — don't re-encode, which
    // would only add generational loss.
    if (input.size <= targetBytes && Math.max(naturalW, naturalH) <= maxEdge) {
      return {
        blob: input,
        width: naturalW,
        height: naturalH,
        untouched: true,
        hasAlpha,
        originalBytes: input.size,
      };
    }

    // Alpha rules out JPEG. WebP keeps alpha and compresses far better than PNG;
    // PNG is the fallback when the browser can't encode WebP.
    const canWebp = supportsWebpEncoding();
    const mimeType = hasAlpha ? (canWebp ? "image/webp" : "image/png") : canWebp ? "image/webp" : "image/jpeg";
    const lossless = mimeType === "image/png";

    let edge = Math.min(maxEdge, Math.max(naturalW, naturalH));
    let best: Blob | null = null;
    let bestW = naturalW;
    let bestH = naturalH;

    // Outer loop shrinks dimensions; inner loop steps quality down.
    for (let attempt = 0; attempt < 6; attempt++) {
      const ratio = edge / Math.max(naturalW, naturalH);
      const dw = Math.max(1, Math.round(naturalW * Math.min(1, ratio)));
      const dh = Math.max(1, Math.round(naturalH * Math.min(1, ratio)));
      const canvas = drawScaled(img, naturalW, naturalH, dw, dh);

      if (lossless) {
        const blob = await toBlob(canvas, mimeType);
        best = blob;
        bestW = dw;
        bestH = dh;
        if (blob.size <= targetBytes) break;
      } else {
        let quality = startQuality;
        let fitted = false;
        while (quality >= minQuality) {
          const blob = await toBlob(canvas, mimeType, quality);
          if (!best || blob.size < best.size) {
            best = blob;
            bestW = dw;
            bestH = dh;
          }
          if (blob.size <= targetBytes) {
            best = blob;
            bestW = dw;
            bestH = dh;
            fitted = true;
            break;
          }
          quality -= 0.08;
        }
        if (fitted) break;
      }

      if (edge <= minEdge) break;
      edge = Math.max(minEdge, Math.round(edge * 0.8));
    }

    if (!best) throw new Error("Compression failed");

    // Re-encoding can enlarge an already-efficient small file; keep the smaller
    // one, but only when the original also fit the display cap.
    if (best.size >= input.size && Math.max(naturalW, naturalH) <= maxEdge) {
      return {
        blob: input,
        width: naturalW,
        height: naturalH,
        untouched: true,
        hasAlpha,
        originalBytes: input.size,
      };
    }

    return {
      blob: best,
      width: bestW,
      height: bestH,
      untouched: false,
      hasAlpha,
      originalBytes: input.size,
    };
  } finally {
    URL.revokeObjectURL(src);
  }
}

/** Filename extension matching an encoded blob's mime type. */
export function extensionForBlob(blob: Blob): string {
  if (blob.type === "image/webp") return "webp";
  if (blob.type === "image/png") return "png";
  if (blob.type === "image/jpeg") return "jpg";
  return "png";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
