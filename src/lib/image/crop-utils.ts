import { canvasHasAlpha } from "@/lib/image/smart-compress";

/** Crop frame aspect presets */
export type CropAspectPreset =
  | "free"
  | "1:1"
  | "4:5"
  | "9:16"
  | "16:9"
  | "5:7"
  | "4:6"
  | "3:1"
  | "3:4"
  | "3:2"
  | "circle"
  | "rounded-square";

export type CropShape = "rect" | "circle" | "rounded";

export const CROP_ASPECT_OPTIONS: { id: CropAspectPreset; label: string; ratio: number | null }[] = [
  { id: "1:1", label: "Square 1:1", ratio: 1 },
  { id: "4:5", label: "Portrait 4:5", ratio: 4 / 5 },
  { id: "9:16", label: "Story 9:16", ratio: 9 / 16 },
  { id: "16:9", label: "Landscape 16:9", ratio: 16 / 9 },
  { id: "5:7", label: "Invitation 5:7", ratio: 5 / 7 },
  { id: "4:6", label: "Flyer 4:6", ratio: 4 / 6 },
  { id: "3:1", label: "Ticket banner", ratio: 3 },
  { id: "3:4", label: "Story card", ratio: 3 / 4 },
  { id: "3:2", label: "Photo 3:2", ratio: 3 / 2 },
  { id: "circle", label: "Circle", ratio: 1 },
  { id: "rounded-square", label: "Rounded square", ratio: 1 },
  { id: "free", label: "Custom crop", ratio: null },
];

export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getCropShape(preset: CropAspectPreset): CropShape {
  if (preset === "circle") return "circle";
  if (preset === "rounded-square") return "rounded";
  return "rect";
}

export function cropAspectRatio(preset: CropAspectPreset): number | null {
  return CROP_ASPECT_OPTIONS.find((o) => o.id === preset)?.ratio ?? null;
}

export function cropFrameSize(
  containerW: number,
  containerH: number,
  aspect: CropAspectPreset
): { width: number; height: number } {
  const ratio = cropAspectRatio(aspect);
  if (!ratio) {
    return { width: Math.round(containerW * 0.85), height: Math.round(containerH * 0.75) };
  }
  const maxW = containerW * 0.88;
  const maxH = containerH * 0.82;
  let width = maxW;
  let height = width / ratio;
  if (height > maxH) {
    height = maxH;
    width = height * ratio;
  }
  return { width: Math.round(width), height: Math.round(height) };
}

export function getCropScales(
  naturalWidth: number,
  naturalHeight: number,
  containerW: number,
  containerH: number
): { containScale: number; coverScale: number } {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { containScale: 1, coverScale: 1 };
  }
  return {
    containScale: Math.min(containerW / naturalWidth, containerH / naturalHeight),
    coverScale: Math.max(containerW / naturalWidth, containerH / naturalHeight),
  };
}

export interface CropFrameRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Minimum zoom so the scaled image fully covers the crop frame (pan stays usable). */
export function minZoomToCoverFrame(
  naturalWidth: number,
  naturalHeight: number,
  containerW: number,
  containerH: number,
  frameW: number,
  frameH: number
): number {
  const { containScale } = getCropScales(naturalWidth, naturalHeight, containerW, containerH);
  if (containScale <= 0 || naturalWidth <= 0 || naturalHeight <= 0) return 1;
  return Math.max(
    1,
    frameW / (naturalWidth * containScale),
    frameH / (naturalHeight * containScale)
  );
}

export function clampCropOffset(
  offsetX: number,
  offsetY: number,
  naturalWidth: number,
  naturalHeight: number,
  containerW: number,
  containerH: number,
  frameW: number,
  frameH: number,
  zoom: number,
  frameX?: number,
  frameY?: number
): { x: number; y: number } {
  const { containScale } = getCropScales(naturalWidth, naturalHeight, containerW, containerH);
  const scale = containScale * Math.max(zoom, 0.25);
  const renderedW = naturalWidth * scale;
  const renderedH = naturalHeight * scale;
  const frameLeft = frameX ?? (containerW - frameW) / 2;
  const frameTop = frameY ?? (containerH - frameH) / 2;
  const centerX = (containerW - renderedW) / 2;
  const centerY = (containerH - renderedH) / 2;

  let minX = frameLeft + frameW - renderedW - centerX;
  let maxX = frameLeft - centerX;
  let minY = frameTop + frameH - renderedH - centerY;
  let maxY = frameTop - centerY;

  if (minX > maxX) {
    const mid = (minX + maxX) / 2;
    minX = mid;
    maxX = mid;
  }
  if (minY > maxY) {
    const mid = (minY + maxY) / 2;
    minY = mid;
    maxY = mid;
  }

  return {
    x: Math.min(maxX, Math.max(minX, offsetX)),
    y: Math.min(maxY, Math.max(minY, offsetY)),
  };
}

export function computePixelCrop(
  naturalWidth: number,
  naturalHeight: number,
  containerW: number,
  containerH: number,
  frameW: number,
  frameH: number,
  zoom: number,
  offsetX: number,
  offsetY: number,
  frameX?: number,
  frameY?: number
): PixelCrop {
  const { containScale } = getCropScales(naturalWidth, naturalHeight, containerW, containerH);
  const scale = containScale * Math.max(zoom, 0.25);
  const renderedW = naturalWidth * scale;
  const renderedH = naturalHeight * scale;

  const frameLeft = frameX ?? (containerW - frameW) / 2;
  const frameTop = frameY ?? (containerH - frameH) / 2;

  const imageLeft = (containerW - renderedW) / 2 + offsetX;
  const imageTop = (containerH - renderedH) / 2 + offsetY;

  let x = (frameLeft - imageLeft) / scale;
  let y = (frameTop - imageTop) / scale;
  let width = frameW / scale;
  let height = frameH / scale;

  x = Math.max(0, Math.min(x, naturalWidth - 1));
  y = Math.max(0, Math.min(y, naturalHeight - 1));
  width = Math.min(width, naturalWidth - x);
  height = Math.min(height, naturalHeight - y);

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };
}

const MIN_FRAME = 48;

/** Keep the selection inside the container; optionally lock aspect ratio. */
export function clampFrameRect(
  frame: CropFrameRect,
  containerW: number,
  containerH: number,
  aspectRatio: number | null
): CropFrameRect {
  let { x, y, width, height } = frame;
  width = Math.max(MIN_FRAME, Math.min(width, containerW));
  height = Math.max(MIN_FRAME, Math.min(height, containerH));

  if (aspectRatio && aspectRatio > 0) {
    if (width / height > aspectRatio) {
      width = height * aspectRatio;
    } else {
      height = width / aspectRatio;
    }
    width = Math.max(MIN_FRAME, Math.min(width, containerW));
    height = Math.max(MIN_FRAME, Math.min(height, containerH));
    if (width / height > aspectRatio) width = height * aspectRatio;
    else height = width / aspectRatio;
  }

  x = Math.max(0, Math.min(x, containerW - width));
  y = Math.max(0, Math.min(y, containerH - height));

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

export type CropResizeHandle = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";

export function resizeFrameRect(
  start: CropFrameRect,
  handle: CropResizeHandle,
  dx: number,
  dy: number,
  containerW: number,
  containerH: number,
  aspectRatio: number | null
): CropFrameRect {
  let { x, y, width, height } = start;
  const right = x + width;
  const bottom = y + height;

  if (handle.includes("e")) width = Math.max(MIN_FRAME, right + dx - x);
  if (handle.includes("s")) height = Math.max(MIN_FRAME, bottom + dy - y);
  if (handle.includes("w")) {
    const nextX = Math.min(x + dx, right - MIN_FRAME);
    width = right - nextX;
    x = nextX;
  }
  if (handle.includes("n")) {
    const nextY = Math.min(y + dy, bottom - MIN_FRAME);
    height = bottom - nextY;
    y = nextY;
  }

  if (aspectRatio && aspectRatio > 0) {
    if (handle === "e" || handle === "w") {
      height = width / aspectRatio;
      if (handle === "w") y = bottom - height;
      else y = Math.min(y, containerH - height);
    } else if (handle === "n" || handle === "s") {
      width = height * aspectRatio;
      if (handle === "n") x = right - width;
      else x = Math.min(x, containerW - width);
    } else {
      // Corner: drive from the dominant delta while keeping the opposite corner fixed.
      const fromW = width;
      const fromH = height;
      if (Math.abs(dx) * aspectRatio > Math.abs(dy)) {
        height = fromW / aspectRatio;
      } else {
        width = fromH * aspectRatio;
      }
      if (handle.includes("w")) x = right - width;
      if (handle.includes("n")) y = bottom - height;
    }
  }

  return clampFrameRect({ x, y, width, height }, containerW, containerH, aspectRatio);
}

export async function cropImageToBlob(
  imageSrc: string,
  crop: PixelCrop,
  options?: { mimeType?: string; quality?: number; shape?: CropShape }
): Promise<Blob> {
  const shape = options?.shape ?? "rect";
  const quality = options?.quality ?? 0.92;

  const img = await loadImage(imageSrc);

  // A transparent source must not be encoded to JPEG — JPEG has no alpha, so the
  // canvas backing (transparent black) bakes in as a solid black background.
  // Non-rect shapes always need alpha for the mask they clip with.
  const sourceHasAlpha = canvasHasAlpha(img, img.naturalWidth, img.naturalHeight);
  const needsAlpha = shape !== "rect" || sourceHasAlpha;
  const mimeType = options?.mimeType ?? (needsAlpha ? "image/png" : "image/jpeg");

  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  if (shape === "circle") {
    ctx.save();
    ctx.beginPath();
    const r = Math.min(crop.width, crop.height) / 2;
    ctx.arc(crop.width / 2, crop.height / 2, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
    ctx.restore();
  } else if (shape === "rounded") {
    const radius = Math.min(crop.width, crop.height) * 0.12;
    ctx.save();
    roundRectPath(ctx, 0, 0, crop.width, crop.height, radius);
    ctx.clip();
    ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
    ctx.restore();
  } else {
    ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Crop failed"))),
      mimeType,
      quality
    );
  });
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export async function rotateImage90(src: string, direction: "cw" | "ccw"): Promise<string> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalHeight;
  canvas.height = img.naturalWidth;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(direction === "cw" ? Math.PI / 2 : -Math.PI / 2);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  // Intermediate edit step — keep alpha so a transparent logo survives rotation.
  const hasAlpha = canvasHasAlpha(img, img.naturalWidth, img.naturalHeight);
  const blob = await canvasToBlob(canvas, hasAlpha ? "image/png" : "image/jpeg", 0.92);
  return URL.createObjectURL(blob);
}

export async function flipImageHorizontal(src: string): Promise<string> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0);
  // Intermediate edit step — keep alpha so a transparent logo survives flipping.
  const hasAlpha = canvasHasAlpha(img, img.naturalWidth, img.naturalHeight);
  const blob = await canvasToBlob(canvas, hasAlpha ? "image/png" : "image/jpeg", 0.92);
  return URL.createObjectURL(blob);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Transform failed"))), type, quality);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("blob:") && !src.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });
}

/** Export full image without cropping */
export async function imageToBlob(
  imageSrc: string,
  options?: { mimeType?: string; quality?: number; maxEdge?: number }
): Promise<Blob> {
  const img = await loadImage(imageSrc);
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  const maxEdge = options?.maxEdge ?? 4096;
  if (Math.max(w, h) > maxEdge) {
    const r = maxEdge / Math.max(w, h);
    w = Math.round(w * r);
    h = Math.round(h * r);
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(img, 0, 0, w, h);
  // Same alpha rule as cropImageToBlob — never flatten transparency to JPEG black.
  const hasAlpha = canvasHasAlpha(img, img.naturalWidth, img.naturalHeight);
  const mimeType = options?.mimeType ?? (hasAlpha ? "image/png" : "image/jpeg");
  const quality = options?.quality ?? 0.92;
  return canvasToBlob(canvas, mimeType, quality);
}

export async function readImageDimensions(file: File): Promise<{ width: number; height: number; url: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    return { width: img.naturalWidth, height: img.naturalHeight, url };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("Invalid image");
  }
}

/** Common aspect sets for different media contexts */
export const CROP_PRESETS = {
  all: CROP_ASPECT_OPTIONS.map((o) => o.id),
  gallery: ["1:1", "4:5", "9:16", "16:9", "5:7", "4:6", "3:1", "circle", "rounded-square", "free"] as CropAspectPreset[],
  logo: ["1:1", "circle", "rounded-square", "free"] as CropAspectPreset[],
  cover: ["4:5", "9:16", "16:9", "5:7", "4:6", "3:4", "free"] as CropAspectPreset[],
  portrait: ["4:5", "5:7", "9:16", "1:1", "circle", "free"] as CropAspectPreset[],
  inspiration: ["free", "5:7", "4:5", "3:4", "9:16", "1:1", "16:9"] as CropAspectPreset[],
} as const;
