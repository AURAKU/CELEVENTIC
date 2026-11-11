import { isCeleCardPhotoUrl } from "@/lib/digital-business-card/portraits";

export type CeleCardQrCenter =
  | { kind: "photo"; src: string }
  | { kind: "mark" };

/**
 * Guide QR PNGs include an 8-module quiet zone. Scale just enough to crop the
 * extra margin. Stay near 1.1 so finder patterns survive iPhone Camera,
 * Android Camera / Google Lens, and Windows Camera.
 */
export const CELECARD_QR_TILE_FILL = 1.08;
/**
 * Center mark as a fraction of the tile. Error-correction H survives about 30%
 * damage. Keep the well under that so a logo still leaves a scannable URL.
 */
export const CELECARD_QR_CENTER_WELL = 0.22;

/** Photo sits in the QR. Official CeleYou logo sits there when no photo is set. */
export function resolveCeleCardQrCenter(avatarUrl?: string | null): CeleCardQrCenter {
  if (isCeleCardPhotoUrl(avatarUrl) && avatarUrl) return { kind: "photo", src: avatarUrl };
  return { kind: "mark" };
}
