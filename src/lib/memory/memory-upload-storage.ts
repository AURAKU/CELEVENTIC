import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";

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

export async function storeMemoryFile(
  eventId: string,
  file: File
): Promise<{ url: string; thumbnailUrl: string | null; mediaType: "image" | "video"; sizeBytes: number }> {
  const ext = EXT_MAP[file.type] ?? ".bin";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "memories", eventId);
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(dir, safeName);
  await writeFile(filePath, buffer);

  const url = `/uploads/memories/${eventId}/${safeName}`;
  let thumbnailUrl: string | null = null;

  if (ALLOWED_IMAGE.has(file.type)) {
    try {
      const thumbName = `thumb-${safeName.replace(ext, ".jpg")}`;
      const thumbBuffer = await sharp(buffer)
        .resize(400, 400, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();
      await writeFile(path.join(dir, thumbName), thumbBuffer);
      thumbnailUrl = `/uploads/memories/${eventId}/${thumbName}`;
    } catch {
      thumbnailUrl = url;
    }
  }

  return {
    url,
    thumbnailUrl,
    mediaType: ALLOWED_IMAGE.has(file.type) ? "image" : "video",
    sizeBytes: file.size,
  };
}
