/**
 * Progressive media URL selection for Memory Vault.
 * Grid cells must use lightweight derivatives; full assets load only in the viewer.
 */

export type MemoryMediaLike = {
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl?: string | null;
};

/** Prefer thumbnail/poster for grid cells — never the full media URL when a derivative exists. */
export function pickMemoryGridSrc(item: MemoryMediaLike): string {
  const thumb = item.thumbnailUrl?.trim();
  if (thumb) return thumb;
  // Fallback for legacy rows without derivatives: still return mediaUrl so the cell renders.
  return item.mediaUrl;
}

/** Full / improved quality for lightbox / playback. */
export function pickMemoryFullSrc(item: MemoryMediaLike): string {
  return item.mediaUrl;
}

/** True when the grid is using a distinct lighter asset than the full original. */
export function hasMemoryDerivative(item: MemoryMediaLike): boolean {
  const thumb = item.thumbnailUrl?.trim();
  if (!thumb) return false;
  return thumb !== item.mediaUrl;
}

export function isMemoryVideo(item: Pick<MemoryMediaLike, "mediaType">): boolean {
  return item.mediaType === "video";
}
