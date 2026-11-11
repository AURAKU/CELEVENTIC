/**
 * Landscape window for a portrait couple photograph.
 *
 * WhatsApp and other link previews are about 1.91:1. A centered crop of a
 * standing portrait lands on torsos. This window matches the invitation hero,
 * which keeps the faces in the upper band of the frame.
 */
export const COUPLE_SHARE_FOCUS_Y = 0.2;
export const COUPLE_SHARE_WIDTH = 1200;
export const COUPLE_SHARE_HEIGHT = 630;

export type CoupleShareCrop = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * Standing couple, heads to waist. Cuts the floor, stool legs, and shoes
 * so the share tile opens on their faces.
 */
export const HEAD_TO_WAIST_TOP = 0.02;
export const HEAD_TO_WAIST_BOTTOM = 0.56;

export function isHeadToWaistSharePhoto(url?: string | null): boolean {
  return /\/edwin-lordina\/moments\/07-stool\.(jpe?g|webp|png)(?:$|\?)/i.test(url?.trim() || "");
}

export function coupleHeadToWaistExtract(
  imageWidth: number,
  imageHeight: number,
  window: { topRatio?: number; bottomRatio?: number } = {}
): CoupleShareCrop | null {
  if (imageWidth < 2 || imageHeight < 2) return null;
  const topRatio = window.topRatio ?? HEAD_TO_WAIST_TOP;
  const bottomRatio = window.bottomRatio ?? HEAD_TO_WAIST_BOTTOM;
  const top = Math.max(0, Math.round(imageHeight * topRatio));
  const bottom = Math.min(imageHeight, Math.round(imageHeight * bottomRatio));
  const height = bottom - top;
  if (height < 2) return null;
  return { left: 0, top, width: imageWidth, height };
}

export function coupleShareCrop(
  imageWidth: number,
  imageHeight: number,
  focusY = COUPLE_SHARE_FOCUS_Y
): CoupleShareCrop | null {
  if (imageWidth < 2 || imageHeight < 2) return null;
  const scale = Math.max(COUPLE_SHARE_WIDTH / imageWidth, COUPLE_SHARE_HEIGHT / imageHeight);
  const overflowX = imageWidth * scale - COUPLE_SHARE_WIDTH;
  const overflowY = imageHeight * scale - COUPLE_SHARE_HEIGHT;
  const focus = Math.min(1, Math.max(0, focusY));
  let left = Math.round((overflowX * 0.5) / scale);
  let top = Math.round((overflowY * focus) / scale);
  let width = Math.round(COUPLE_SHARE_WIDTH / scale);
  let height = Math.round(COUPLE_SHARE_HEIGHT / scale);
  if (left < 0) left = 0;
  if (top < 0) top = 0;
  if (left + width > imageWidth) width = imageWidth - left;
  if (top + height > imageHeight) height = imageHeight - top;
  if (width < 2 || height < 2) return null;
  return { left, top, width, height };
}
