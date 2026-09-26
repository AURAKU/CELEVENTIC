/**
 * Guest Memory Vault policy.
 *
 * Video ingest stays in the product (dashboard, transcode pipeline) but guest
 * album collection is photos-only until this flag is turned back on.
 */
export const MEMORY_VAULT_VIDEO_UPLOADS_ENABLED: boolean = false;

export function memoryVaultPhotosOnlyMessage(): string {
  return "The album is photos only for now. Please share a photo.";
}

/** Public album lists: photos only while guest video ingest is off. */
export function resolvePublicMemoryMediaType(
  mediaRaw: string | null
): "image" | "video" | undefined {
  if (!MEMORY_VAULT_VIDEO_UPLOADS_ENABLED) return "image";
  return mediaRaw === "image" || mediaRaw === "video" ? mediaRaw : undefined;
}
