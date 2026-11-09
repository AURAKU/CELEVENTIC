import sharp from "sharp";
import { storeUploadFile } from "@/lib/uploads/file-storage";
import { processVideoFile } from "@/lib/video/video-processor";
import { sniffVideoContainer } from "@/lib/video/container-sniff";
import { ALLOWED_VIDEO_MIME_TYPES, ALLOWED_VIDEO_EXTENSIONS } from "@/lib/video/constants";
import { extractExtension } from "@/lib/video/validation";
import { looksLikeSvg, sniffImageFormat } from "@/lib/media/image-processor";
import {
  MEMORY_VAULT_VIDEO_UPLOADS_ENABLED,
  memoryVaultPhotosOnlyMessage,
} from "@/lib/memory/memory-vault-policy";

const SVG_MIME = new Set(["image/svg+xml", "image/svg", "text/xml+svg"]);

const ALLOWED_VIDEO = new Set<string>(ALLOWED_VIDEO_MIME_TYPES);

const EXT_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/x-png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/jfif": ".jpg",
  "image/pjpeg": ".jpg",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "image/heic-sequence": ".heic",
  "image/heif-sequence": ".heif",
  "image/avif": ".avif",
  "image/bmp": ".bmp",
  "image/x-bmp": ".bmp",
  "image/x-ms-bmp": ".bmp",
  "image/tiff": ".tiff",
  "image/x-tiff": ".tiff",
  "image/vnd.microsoft.icon": ".ico",
  "image/x-icon": ".ico",
  "image/jxl": ".jxl",
  "image/jp2": ".jp2",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

const IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "jfif",
  "jpe",
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
];

const AMBIGUOUS_MIME = new Set(["", "application/octet-stream", "binary/octet-stream"]);

function isRasterImageMime(mimeType: string): boolean {
  const mime = mimeType.toLowerCase().trim();
  if (!mime.startsWith("image/")) return false;
  return !SVG_MIME.has(mime);
}

export function validateMemoryFile(
  mimeType: string,
  sizeBytes: number,
  maxImageMb: number,
  maxVideoMb: number,
  fileName?: string
): { valid: boolean; reason?: string; mediaType?: "image" | "video" } {
  const mime = (mimeType || "").toLowerCase().trim();
  const ext = fileName ? extractExtension(fileName) : null;
  if (SVG_MIME.has(mime) || ext === "svg") {
    return {
      valid: false,
      reason: "SVG files are not accepted. Please send a JPEG, HEIC, PNG, or WebP photo.",
    };
  }
  const isImageExt = !!ext && IMAGE_EXTENSIONS.includes(ext);
  const isVideoExt = !!ext && (ALLOWED_VIDEO_EXTENSIONS as readonly string[]).includes(ext);
  const isImage =
    isRasterImageMime(mime) ||
    isImageExt ||
    (AMBIGUOUS_MIME.has(mime) && !ext);
  const isVideo =
    !isImage &&
    (ALLOWED_VIDEO.has(mime) || mime.startsWith("video/") || isVideoExt);
  if (!isImage && !isVideo) {
    return {
      valid: false,
      reason:
        "That file type isn’t supported. Try any photo your phone can take (JPEG, HEIC, PNG, WebP, and more).",
    };
  }
  // iPhone photos often arrive as application/octet-stream, which is also in the
  // video MIME allow-list. Prefer image when either path matches.
  if (isImage) {
    const maxBytes = maxImageMb * 1024 * 1024;
    if (sizeBytes > maxBytes) {
      return {
        valid: false,
        reason: `That photo is still too large after optimization (max ${maxImageMb}MB). Try another shot or export a smaller copy.`,
      };
    }
    return { valid: true, mediaType: "image" };
  }
  if (!MEMORY_VAULT_VIDEO_UPLOADS_ENABLED) {
    return { valid: false, reason: memoryVaultPhotosOnlyMessage() };
  }
  const maxBytes = maxVideoMb * 1024 * 1024;
  if (sizeBytes > maxBytes) {
    return { valid: false, reason: `File too large. Max ${maxVideoMb}MB.` };
  }
  return { valid: true, mediaType: "video" };
}

/**
 * Canonical dotted extension for storing an image (or unknown MIME fallback) from MIME.
 * Source filename extension is resolved separately via `extractExtension` (no leading dot).
 */
export function resolveMemoryOutputExtension(mimeType: string): string {
  return EXT_MAP[mimeType] ?? ".bin";
}

/** Unique, filesystem-safe base name for Memory Vault uploads (no extension). */
export function buildMemorySafeBaseName(now = Date.now(), rand = Math.random): string {
  return `${now}-${rand().toString(36).slice(2, 10)}`;
}

/**
 * Legacy generic memory upload path (`/api/memories/upload`). The main guest UI
 * (`GuestMemoryUpload`) only ever sends video through the universal `VideoUploader`
 * (`category: "GUESTBOOK"`, which always FFmpeg-transcodes. See
 * `src/lib/video/processing.ts`), but this endpoint's own MIME allowlist still accepts
 * `video/mp4|webm|quicktime` directly, so it must never store a raw, unprocessed video.
 * iPhone/Android HEVC footage inside an untouched .mp4/.mov would be unplayable in most
 * browsers. Videos are transcoded here with the same VPS FFmpeg engine
 * (`src/lib/video/video-processor.ts`) the invitations upload route uses, producing a
 * browser-universal H.264/AAC MP4 + a JPEG poster (used as `thumbnailUrl`, previously null
 * for every video on this path).
 *
 * Extension flow:
 * - `sourceExt`, from the original filename (no leading dot), type detection only
 * - `outputExt`, from MIME via `resolveMemoryOutputExtension` (leading dot), storage name
 * - videos always persist as `.mp4` after processing
 */
export async function storeMemoryFile(
  eventId: string,
  file: File
): Promise<{ url: string; thumbnailUrl: string | null; mediaType: "image" | "video"; sizeBytes: number }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (looksLikeSvg(buffer)) {
    throw new Error("SVG files are not accepted. Please send a JPEG, HEIC, PNG, or WebP photo.");
  }
  // Magic bytes beat MIME. iPhone/Android dumps often arrive as octet-stream with no name.
  const sniffedImage = sniffImageFormat(buffer);
  // Source filename extension (no leading dot), used only for type detection.
  const sourceExt = extractExtension(file.name);
  const mime = (file.type || "").toLowerCase().trim();
  const isImageUpload =
    !!sniffedImage ||
    isRasterImageMime(mime) ||
    (!!sourceExt && IMAGE_EXTENSIONS.includes(sourceExt)) ||
    (AMBIGUOUS_MIME.has(mime) &&
      !(!!sourceExt && (ALLOWED_VIDEO_EXTENSIONS as readonly string[]).includes(sourceExt)));
  const isVideoUpload =
    !isImageUpload &&
    (ALLOWED_VIDEO.has(mime) ||
      mime.startsWith("video/") ||
      (!!sourceExt && (ALLOWED_VIDEO_EXTENSIONS as readonly string[]).includes(sourceExt)));

  if (isVideoUpload && !MEMORY_VAULT_VIDEO_UPLOADS_ENABLED) {
    throw new Error(memoryVaultPhotosOnlyMessage());
  }

  if (isVideoUpload) {
    const sniff = sniffVideoContainer(buffer.subarray(0, 262_144));
    if (sniff.disallowed) {
      throw new Error(`File was rejected. Detected as ${sniff.disallowed.label}, not a video.`);
    }
    const extHint = sniff.container ?? EXT_MAP[file.type]?.replace(".", "") ?? sourceExt ?? "mp4";
    const result = await processVideoFile(buffer, { extensionHint: extHint });
    if (!result.success || !result.outputBuffer) {
      throw new Error(
        result.error ?? "We couldn't process this video for playback. Please try again or upload an MP4 (H.264)."
      );
    }
    const safeBase = buildMemorySafeBaseName();
    const { url } = await storeUploadFile("memories", eventId, `${safeBase}.mp4`, result.outputBuffer);
    let thumbnailUrl: string | null = null;
    if (result.posterBuffer) {
      const poster = await storeUploadFile("memories", eventId, `${safeBase}-poster.jpg`, result.posterBuffer).catch(
        () => null
      );
      thumbnailUrl = poster?.url ?? null;
    }
    return { url, thumbnailUrl, mediaType: "video", sizeBytes: result.outputBuffer.length };
  }

  // Preserve animated GIF instead of flattening it through Sharp.
  if (sniffedImage === "gif") {
    const safeBase = buildMemorySafeBaseName();
    const stored = await storeUploadFile("memories", eventId, `${safeBase}.gif`, buffer);
    let thumbnailUrl: string | null = stored.url;
    try {
      const thumbBuffer = await sharp(buffer, { animated: false, pages: 1 })
        .rotate()
        .resize(400, 400, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();
      const thumb = await storeUploadFile("memories", eventId, `${safeBase}-thumb.jpg`, thumbBuffer);
      thumbnailUrl = thumb.url;
    } catch {
      thumbnailUrl = stored.url;
    }
    return { url: stored.url, thumbnailUrl, mediaType: "image", sizeBytes: file.size };
  }

  const safeBase = buildMemorySafeBaseName();
  try {
    const { processImageBuffer } = await import("@/lib/media/image-processor");
    const processed = await processImageBuffer(buffer, {
      category: "memories",
      subPath: eventId,
      baseName: safeBase,
      keepOriginal: true,
    });
    if (processed.status === "READY") {
      return {
        url: processed.optimisedUrl || processed.originalUrl,
        thumbnailUrl: processed.thumbnailUrl,
        mediaType: "image",
        sizeBytes: processed.byteSize || file.size,
      };
    }
  } catch {
    /* last-chance JPEG convert below */
  }

  try {
    const converted = await sharp(buffer, { failOn: "error", animated: false })
      .rotate()
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
    const stored = await storeUploadFile("memories", eventId, `${safeBase}.jpg`, converted);
    let thumbnailUrl = stored.url;
    try {
      const thumbBuffer = await sharp(converted)
        .resize(400, 400, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();
      const thumb = await storeUploadFile("memories", eventId, `${safeBase}-thumb.jpg`, thumbBuffer);
      thumbnailUrl = thumb.url;
    } catch {
      thumbnailUrl = stored.url;
    }
    return { url: stored.url, thumbnailUrl, mediaType: "image", sizeBytes: converted.length };
  } catch {
    throw new Error("We couldn't read that photo. Try JPEG, HEIC, PNG, or WebP.");
  }
}
