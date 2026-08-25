import sharp from "sharp";
import { storeUploadFile } from "@/lib/uploads/file-storage";
import { processVideoFile } from "@/lib/video/video-processor";
import { sniffVideoContainer } from "@/lib/video/container-sniff";
import { ALLOWED_VIDEO_MIME_TYPES, ALLOWED_VIDEO_EXTENSIONS } from "@/lib/video/constants";
import { extractExtension } from "@/lib/video/validation";

const ALLOWED_IMAGE = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/jfif",
  "image/pjpeg",
  "image/heic",
  "image/heif",
  "image/avif",
  "image/jpg",
]);
const ALLOWED_VIDEO = new Set<string>(ALLOWED_VIDEO_MIME_TYPES);

const EXT_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/jfif": ".jpg",
  "image/pjpeg": ".jpg",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "image/avif": ".avif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "jfif", "heic", "heif", "avif"];

export function validateMemoryFile(
  mimeType: string,
  sizeBytes: number,
  maxImageMb: number,
  maxVideoMb: number,
  fileName?: string
): { valid: boolean; reason?: string; mediaType?: "image" | "video" } {
  const ext = fileName ? extractExtension(fileName) : null;
  const isImage =
    ALLOWED_IMAGE.has(mimeType) || (!!ext && IMAGE_EXTENSIONS.includes(ext));
  const isVideo =
    ALLOWED_VIDEO.has(mimeType) ||
    mimeType.startsWith("video/") ||
    (!!ext && (ALLOWED_VIDEO_EXTENSIONS as readonly string[]).includes(ext));
  if (!isImage && !isVideo) {
    return {
      valid: false,
      reason:
        "That file type isn’t supported. Try any common photo (JPEG, HEIC, PNG, WebP) or a video (MP4/MOV).",
    };
  }
  const maxBytes = (isImage ? maxImageMb : maxVideoMb) * 1024 * 1024;
  if (sizeBytes > maxBytes) {
    return {
      valid: false,
      reason: isImage
        ? `That photo is still too large after optimization (max ${maxImageMb}MB). Try another shot or export a smaller copy.`
        : `File too large. Max ${maxVideoMb}MB.`,
    };
  }
  return { valid: true, mediaType: isImage ? "image" : "video" };
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
 * (`category: "GUESTBOOK"`, which always FFmpeg-transcodes — see
 * `src/lib/video/processing.ts`), but this endpoint's own MIME allowlist still accepts
 * `video/mp4|webm|quicktime` directly, so it must never store a raw, unprocessed video —
 * iPhone/Android HEVC footage inside an untouched .mp4/.mov would be unplayable in most
 * browsers. Videos are transcoded here with the same VPS FFmpeg engine
 * (`src/lib/video/video-processor.ts`) the invitations upload route uses, producing a
 * browser-universal H.264/AAC MP4 + a JPEG poster (used as `thumbnailUrl`, previously null
 * for every video on this path).
 *
 * Extension flow:
 * - `sourceExt` — from the original filename (no leading dot), type detection only
 * - `outputExt` — from MIME via `resolveMemoryOutputExtension` (leading dot), storage name
 * - videos always persist as `.mp4` after processing
 */
export async function storeMemoryFile(
  eventId: string,
  file: File
): Promise<{ url: string; thumbnailUrl: string | null; mediaType: "image" | "video"; sizeBytes: number }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  // Source filename extension (no leading dot), used only for type detection.
  const sourceExt = extractExtension(file.name);
  const isVideoUpload =
    ALLOWED_VIDEO.has(file.type) ||
    file.type.startsWith("video/") ||
    (!!sourceExt && (ALLOWED_VIDEO_EXTENSIONS as readonly string[]).includes(sourceExt));

  if (isVideoUpload) {
    const sniff = sniffVideoContainer(buffer.subarray(0, 262_144));
    if (sniff.disallowed) {
      throw new Error(`File was rejected — detected as ${sniff.disallowed.label}, not a video.`);
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

  // Dotted extension for the stored image object (MIME → safe suffix).
  const outputExt = resolveMemoryOutputExtension(file.type);
  const safeName = `${buildMemorySafeBaseName()}${outputExt}`;
  try {
    const { processImageBuffer } = await import("@/lib/media/image-processor");
    const processed = await processImageBuffer(buffer, {
      category: "memories",
      subPath: eventId,
      baseName: safeName.replace(/\.[^.]+$/, ""),
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
    /* fall through to legacy sharp thumb path */
  }

  const stored = await storeUploadFile("memories", eventId, safeName, buffer);
  let thumbnailUrl: string | null = null;

  try {
    const thumbName = `thumb-${safeName.replace(outputExt, ".jpg")}`;
    const thumbBuffer = await sharp(buffer)
      .rotate()
      .resize(400, 400, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
    const thumb = await storeUploadFile("memories", eventId, thumbName, thumbBuffer);
    thumbnailUrl = thumb.url;
  } catch {
    thumbnailUrl = stored.url;
  }

  return {
    url: stored.url,
    thumbnailUrl,
    mediaType: "image",
    sizeBytes: file.size,
  };
}
