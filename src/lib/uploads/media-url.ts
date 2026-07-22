/**
 * Normalize uploaded media URLs so files load in dev, production, and CDN.
 * Legacy paths `/uploads/...` are served via `/api/uploads/...`.
 * AWS S3 / CloudFront absolute URLs pass through for edge delivery.
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
  if (url.startsWith("/uploads/") || url.startsWith("/api/uploads/")) return true;
  if (!url.startsWith("https://") && !url.startsWith("http://")) return false;
  try {
    const host = new URL(url).hostname;
    return (
      host.endsWith(".amazonaws.com") ||
      host.endsWith(".cloudfront.net") ||
      host.includes("celeventic") // custom CDN domains often include brand
    );
  } catch {
    return false;
  }
}

/**
 * Whether `next/image` should skip the optimizer for this src.
 *
 * Absolute http(s) / data / blob URLs always skip optimization. Demo Unsplash
 * assets and user-uploaded CDNs are already web-sized; missing or stale
 * `images.remotePatterns` must never crash invitation, gallery, or portal pages.
 * Relative `/public` assets still go through the optimizer.
 */
export function shouldUnoptimizeNextImage(url: string | null | undefined): boolean {
  if (!url) return true;
  const src = url.trim();
  if (!src) return true;
  if (src.startsWith("blob:") || src.startsWith("data:")) return true;
  if (isUploadedMediaUrl(src)) return true;
  if (/^https?:\/\//i.test(src)) return true;
  return false;
}
