import sharp from "sharp";
import { storeUploadFile } from "@/lib/uploads/file-storage";
import { processVideoFile } from "@/lib/video/video-processor";
import { sniffVideoContainer } from "@/lib/video/container-sniff";

const ALLOWED_IMAGE = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/jfif", "image/pjpeg"]);
const ALLOWED_VIDEO = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const EXT_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/jfif": ".jpg",
  "image/pjpeg": ".jpg",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

export function validateMemoryFile(
  mimeType: string,
  sizeBytes: number,
  maxImageMb: number,
  maxVideoMb: number
): { valid: boolean; reason?: string; mediaType?: "image" | "video" } {
  const isImage = ALLOWED_IMAGE.has(mimeType);
  const isVideo = ALLOWED_VIDEO.has(mimeType);
  if (!isImage && !isVideo) {
    return { valid: false, reason: "Unsupported file type. Use JPEG, PNG, WebP, MP4, or WebM." };
  }
  const maxBytes = (isImage ? maxImageMb : maxVideoMb) * 1024 * 1024;
  if (sizeBytes > maxBytes) {
    return { valid: false, reason: `File too large. Max ${isImage ? maxImageMb : maxVideoMb}MB.` };
  }
  return { valid: true, mediaType: isImage ? "image" : "video" };
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
 */
export async function storeMemoryFile(
  eventId: string,
  file: File
): Promise<{ url: string; thumbnailUrl: string | null; mediaType: "image" | "video"; sizeBytes: number }> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (ALLOWED_VIDEO.has(file.type)) {
    const sniff = sniffVideoContainer(buffer.subarray(0, 262_144));
    if (sniff.disallowed) {
      throw new Error(`File was rejected — detected as ${sniff.disallowed.label}, not a video.`);
    }
    const extHint = sniff.container ?? EXT_MAP[file.type]?.replace(".", "") ?? "mp4";
    const result = await processVideoFile(buffer, { extensionHint: extHint });
    if (!result.success || !result.outputBuffer) {
      throw new Error(
        result.error ?? "We couldn't process this video for playback. Please try again or upload an MP4 (H.264)."
      );
    }
    const safeBase = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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

  const ext = EXT_MAP[file.type] ?? ".bin";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
  const stored = await storeUploadFile("memories", eventId, safeName, buffer);
  let thumbnailUrl: string | null = null;

  try {
    const thumbName = `thumb-${safeName.replace(ext, ".jpg")}`;
    const thumbBuffer = await sharp(buffer)
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
