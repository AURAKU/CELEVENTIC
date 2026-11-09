/**
 * Guest album photo picker: accept every common raster the phone can produce.
 * SVG stays out (scriptable). Camera stay `image/*` so iOS still opens the camera sheet.
 */

export const ALBUM_PHOTO_ACCEPT =
  "image/*,.jpg,.jpeg,.jfif,.jpe,.png,.webp,.gif,.heic,.heif,.hif,.avif,.bmp,.dib,.tif,.tiff,.ico,.jxl,.jp2,.j2k";

/** iOS ignores a long accept list on capture=camera and may hide the camera sheet. */
export const ALBUM_CAMERA_ACCEPT = "image/*";

const PHOTO_EXT = new Set([
  "jpg",
  "jpeg",
  "jfif",
  "jpe",
  "png",
  "webp",
  "gif",
  "heic",
  "heif",
  "hif",
  "avif",
  "bmp",
  "dib",
  "tif",
  "tiff",
  "ico",
  "jxl",
  "jp2",
  "j2k",
  "dng",
]);

const VIDEO_EXT = new Set([
  "mp4",
  "mov",
  "m4v",
  "webm",
  "avi",
  "mkv",
  "wmv",
  "3gp",
  "3g2",
  "mpeg",
  "mpg",
]);

const SVG_MIME = new Set(["image/svg+xml", "image/svg", "text/xml+svg"]);

function fileExt(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function mimeOf(file: File): string {
  return (file.type || "").toLowerCase().trim();
}

/** Raster photo MIME, including empty iPhone dumps. Never SVG. */
export function isRasterImageMime(mimeType: string): boolean {
  const mime = mimeType.toLowerCase().trim();
  if (!mime) return false;
  if (SVG_MIME.has(mime)) return false;
  return mime.startsWith("image/");
}

/**
 * True for any photo a guest is likely to pick: JPEG, HEIC, PNG, WebP, GIF,
 * AVIF, BMP, TIFF, and files whose type is missing (common on iOS/Android).
 */
export function isAlbumPhotoFile(file: File): boolean {
  const mime = mimeOf(file);
  const ext = fileExt(file.name);
  if (SVG_MIME.has(mime) || ext === "svg") return false;
  if (ext && VIDEO_EXT.has(ext)) return false;
  if (mime.startsWith("video/") || mime.startsWith("audio/")) return false;
  if (isRasterImageMime(mime)) return true;
  if (PHOTO_EXT.has(ext)) return true;
  // Camera / share-sheet dumps: empty type, octet-stream, or a nameless blob.
  if (!mime || mime === "application/octet-stream" || mime === "binary/octet-stream") {
    return !ext || PHOTO_EXT.has(ext);
  }
  return false;
}

function looksHeicLike(file: File): boolean {
  const mime = mimeOf(file);
  const ext = fileExt(file.name);
  return (
    mime.includes("heic") ||
    mime.includes("heif") ||
    ext === "heic" ||
    ext === "heif" ||
    ext === "hif"
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Shrink huge camera dumps so the POST stays fast on mobile data.
 * If the browser cannot decode (typical for HEIC in Chrome), return the original
 * so the server Sharp pipeline can convert it.
 */
export async function compressAlbumPhoto(file: File): Promise<File> {
  if (!isAlbumPhotoFile(file)) return file;
  const mime = mimeOf(file);
  const ext = fileExt(file.name);
  // Flattening an animated GIF on canvas would drop every frame after the first.
  if (mime === "image/gif" || ext === "gif") return file;
  // Already small and browser-native: skip canvas work.
  if (!looksHeicLike(file) && file.size <= 1_200_000) return file;

  try {
    const { smartCompressImage, MEMORY_VAULT_IMAGE_COMPRESSION, extensionForBlob } = await import(
      "@/lib/image/smart-compress"
    );
    const timeoutMs = looksHeicLike(file) || file.size > 8_000_000 ? 16_000 : 10_000;
    const result = await withTimeout(smartCompressImage(file, MEMORY_VAULT_IMAGE_COMPRESSION), timeoutMs);
    if (result.untouched || result.blob.size >= file.size) return file;
    const ext = extensionForBlob(result.blob);
    const base = file.name.replace(/\.[^.]+$/, "") || "memory";
    return new File([result.blob], `${base}.${ext}`, {
      type: result.blob.type || "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
