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

export function computePixelCrop(
  naturalWidth: number,
  naturalHeight: number,
  containerW: number,
  containerH: number,
  frameW: number,
  frameH: number,
  zoom: number,
  offsetX: number,
  offsetY: number
): PixelCrop {
  const baseScale = containerW / naturalWidth;
  const scale = baseScale * zoom;
  const renderedW = naturalWidth * scale;
  const renderedH = naturalHeight * scale;

  const frameLeft = (containerW - frameW) / 2;
  const frameTop = (containerH - frameH) / 2;

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

export async function cropImageToBlob(
  imageSrc: string,
  crop: PixelCrop,
  options?: { mimeType?: string; quality?: number; shape?: CropShape }
): Promise<Blob> {
  const shape = options?.shape ?? "rect";
  const usePng = shape !== "rect" || options?.mimeType === "image/png";
  const mimeType = options?.mimeType ?? (usePng ? "image/png" : "image/jpeg");
  const quality = options?.quality ?? 0.92;

  const img = await loadImage(imageSrc);
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
  const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
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
  const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
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
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });
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
  portrait: ["4:5", "5:7", "9:16", "1:1", "circle"] as CropAspectPreset[],
} as const;
