import { isCeleCardPhotoUrl } from "@/lib/digital-business-card/portraits";

export type CeleCardQrCenter =
  | { kind: "photo"; src: string }
  | { kind: "mark" };

/**
 * Guide QR PNGs include an 8-module quiet zone. Scale the bitmap so modules
 * fill the white tile. The tile, on a dark card, is the camera quiet zone.
 */
export const CELECARD_QR_TILE_FILL = 1.26;
/** Center portrait or house mark as a fraction of the tile. */
export const CELECARD_QR_CENTER_WELL = 0.44;

/** Photo sits in the QR. House mark or CeleYou logo sits there when no photo is set. */
export function resolveCeleCardQrCenter(avatarUrl?: string | null): CeleCardQrCenter {
  if (isCeleCardPhotoUrl(avatarUrl) && avatarUrl) return { kind: "photo", src: avatarUrl };
  return { kind: "mark" };
}
