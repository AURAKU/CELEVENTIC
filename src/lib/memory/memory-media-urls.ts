/**
 * Progressive media URL selection for Memory Vault.
 * Grid cells must use lightweight derivatives; full assets load only in the viewer.
 */

export type MemoryMediaLike = {
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl?: string | null;
};

/**
 * Server `processImageBuffer` writes `${base}.webp` (optimised/large) plus
 * `${base}-medium.webp` / `${base}-large.webp` / `${base}-thumb.webp`.
 * Derive sibling URLs from the stored master when the naming convention matches.
 */
export function deriveMemoryVariantUrls(mediaUrl: string): {
  medium: string | null;
  large: string | null;
  original: string | null;
} {
  const url = mediaUrl?.trim() ?? "";
  if (!url || !/\.webp(\?|#|$)/i.test(url)) {
    return { medium: null, large: null, original: null };
  }
  if (/-(thumb|medium|large|original)\.webp(\?|#|$)/i.test(url)) {
    return { medium: null, large: null, original: null };
  }
  return {
    medium: url.replace(/\.webp(\?|#|$)/i, "-medium.webp$1"),
    large: url.replace(/\.webp(\?|#|$)/i, "-large.webp$1"),
    original: url.replace(/\.webp(\?|#|$)/i, "-original.jpg$1"),
  };
}

/** Prefer thumbnail/poster for grid cells — never the full media URL when a derivative exists. */
export function pickMemoryGridSrc(item: MemoryMediaLike): string {
  const thumb = item.thumbnailUrl?.trim();
  if (thumb) return thumb;
  // Fallback for legacy rows without derivatives: still return mediaUrl so the cell renders.
  return item.mediaUrl;
}

/**
 * Best display master for lightbox / playback.
 * Prefer the large WebP sibling when naming matches; otherwise the stored mediaUrl
 * (already the server optimised ~2000px asset when processing succeeded).
 */
export function pickMemoryFullSrc(item: MemoryMediaLike): string {
  if (isMemoryVideo(item)) return item.mediaUrl;
  const { large } = deriveMemoryVariantUrls(item.mediaUrl);
  return large || item.mediaUrl;
}

/**
 * Responsive srcset for photo lightbox — browser picks the lightest sharp asset.
 * Order: medium (1200) → large/master (2000). Thumbnail stays out of lightbox.
 */
export function pickMemoryPhotoSrcSet(item: MemoryMediaLike): string | null {
  if (isMemoryVideo(item)) return null;
  const full = pickMemoryFullSrc(item);
  const { medium, large } = deriveMemoryVariantUrls(item.mediaUrl);
  const parts: string[] = [];
  if (medium) parts.push(`${medium} 1200w`);
  if (large && large !== full) parts.push(`${large} 2000w`);
  parts.push(`${full} 2000w`);
  // Deduplicate identical URLs
  const seen = new Set<string>();
  const unique = parts.filter((entry) => {
    const url = entry.split(" ")[0]!;
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
  return unique.length > 1 ? unique.join(", ") : null;
}

/** Map srcset URLs through a public resolver (CDN / uploads prefix). */
export function resolveMemoryPhotoSrcSet(
  item: MemoryMediaLike,
  resolve: (url: string) => string
): string | undefined {
  const raw = pickMemoryPhotoSrcSet(item);
  if (!raw) return undefined;
  return raw
    .split(", ")
    .map((part) => {
      const [url, descriptor] = part.split(" ");
      if (!url) return part;
      return descriptor ? `${resolve(url)} ${descriptor}` : resolve(url);
    })
    .join(", ");
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
