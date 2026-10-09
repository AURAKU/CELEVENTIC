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
