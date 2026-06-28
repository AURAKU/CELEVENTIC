/**
 * Normalize uploaded media URLs so files load in dev, production, and serverless.
 * Legacy paths `/uploads/...` are served via `/api/uploads/...`.
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }
  if (trimmed.startsWith("/api/uploads/")) return trimmed;
  if (trimmed.startsWith("/uploads/")) {
    return `/api/uploads/${trimmed.slice("/uploads/".length)}`;
  }
  return trimmed;
}

export function isUploadedMediaUrl(url: string): boolean {
  return url.startsWith("/uploads/") || url.startsWith("/api/uploads/");
}
