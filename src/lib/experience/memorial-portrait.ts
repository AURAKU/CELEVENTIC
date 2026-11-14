/**
 * Resolve the honouree portrait for memorial envelopes and covers.
 * Catalogue stock art is only a template fallback when no event media exists.
 */

type MemorialMediaItem = {
  url?: string | null;
  role?: string | null;
  type?: string | null;
};

export function resolveMemorialHonoureePortraitUrl(input: {
  coverImageUrl?: string | null;
  media?: MemorialMediaItem[] | null;
}): string | null {
  const media = Array.isArray(input.media) ? input.media : [];
  const pick = (role: string) => {
    const hit = media.find(
      (item) =>
        item.role === role &&
        item.type !== "video" &&
        typeof item.url === "string" &&
        item.url.trim().length > 0
    );
    return hit?.url?.trim() || null;
  };
  return (
    pick("envelope") ||
    pick("intro") ||
    pick("hero") ||
    input.coverImageUrl?.trim() ||
    null
  );
}
