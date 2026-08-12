/**
 * Shared server-side image pipeline (Sharp).
 * Validates signatures, auto-rotates, strips risky metadata, and emits web-safe derivatives.
 */
import sharp from "sharp";
import { storeUploadFile } from "@/lib/uploads/file-storage";

export type ImageProcessStatus = "UPLOADING" | "UPLOADED" | "PROCESSING" | "READY" | "FAILED";

export interface ProcessedImageDerivatives {
  status: ImageProcessStatus;
  originalUrl: string;
  optimisedUrl: string;
  thumbnailUrl: string;
  mediumUrl: string;
  largeUrl: string;
  width: number;
  height: number;
  format: string;
  byteSize: number;
  errorMessage?: string;
}

const MAX_INPUT_BYTES = 50 * 1024 * 1024;
const MAX_DIMENSION = 8000;

/** Magic-byte sniff — never trust filename/MIME alone. */
export function sniffImageFormat(buffer: Buffer): "jpeg" | "png" | "webp" | "gif" | "avif" | "heic" | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "png";
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return "gif";
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "webp";
  // ftyp....heic / heif / avif
  if (buffer.toString("ascii", 4, 8) === "ftyp") {
    const brand = buffer.toString("ascii", 8, 12).toLowerCase();
    if (brand.startsWith("avif") || brand === "avis") return "avif";
    if (brand.startsWith("heic") || brand.startsWith("heif") || brand === "mif1") return "heic";
  }
  return null;
}

export async function processImageBuffer(
  buffer: Buffer,
  options: {
    category: string;
    subPath: string;
    baseName?: string;
    /** Keep a near-original archival copy (still auto-rotated / metadata-stripped). */
    keepOriginal?: boolean;
  }
): Promise<ProcessedImageDerivatives> {
  if (buffer.length <= 0) {
    return failed("Empty image file.");
  }
  if (buffer.length > MAX_INPUT_BYTES) {
    return failed(`Image exceeds ${MAX_INPUT_BYTES / (1024 * 1024)}MB limit.`);
  }

  const sniffed = sniffImageFormat(buffer);
  if (!sniffed) {
    return failed("Unrecognized image format.");
  }
  if (sniffed === "heic") {
    // Sharp may decode HEIC when libvips is built with support; if not, fail clearly.
  }

  const base = options.baseName ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  try {
    const masterBase = sharp(buffer, { failOn: "error", animated: false }).rotate();
    const meta = await masterBase.metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (!width || !height) return failed("Could not read image dimensions.");

    // Oversized camera dumps: downscale into the safe window instead of rejecting.
    const longest = Math.max(width, height);
    const needsDownscale = longest > MAX_DIMENSION;
    const master = needsDownscale
      ? masterBase.resize({
          width: width >= height ? MAX_DIMENSION : undefined,
          height: height > width ? MAX_DIMENSION : undefined,
          fit: "inside",
          withoutEnlargement: true,
        })
      : masterBase;

    const [thumbBuf, mediumBuf, largeBuf, optimisedBuf, originalBuf] = await Promise.all([
      master
        .clone()
        .resize(400, 400, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 78 })
        .toBuffer(),
      master
        .clone()
        .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer(),
      master
        .clone()
        .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer(),
      master
        .clone()
        .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer(),
      options.keepOriginal
        ? master
            .clone()
            .jpeg({ quality: 90, mozjpeg: true })
            .toBuffer()
        : Promise.resolve(null as Buffer | null),
    ]);

    const [thumb, medium, large, optimised, original] = await Promise.all([
      storeUploadFile(options.category, options.subPath, `${base}-thumb.webp`, thumbBuf),
      storeUploadFile(options.category, options.subPath, `${base}-medium.webp`, mediumBuf),
      storeUploadFile(options.category, options.subPath, `${base}-large.webp`, largeBuf),
      storeUploadFile(options.category, options.subPath, `${base}.webp`, optimisedBuf),
      originalBuf
        ? storeUploadFile(options.category, options.subPath, `${base}-original.jpg`, originalBuf)
        : Promise.resolve(null),
    ]);

    return {
      status: "READY",
      originalUrl: original?.url ?? optimised.url,
      optimisedUrl: optimised.url,
      thumbnailUrl: thumb.url,
      mediumUrl: medium.url,
      largeUrl: large.url,
      width,
      height,
      format: "webp",
      byteSize: optimisedBuf.length,
    };
  } catch (error) {
    return failed(error instanceof Error ? error.message : "Image processing failed.");
  }
}

function failed(errorMessage: string): ProcessedImageDerivatives {
  return {
    status: "FAILED",
    originalUrl: "",
    optimisedUrl: "",
    thumbnailUrl: "",
    mediumUrl: "",
    largeUrl: "",
    width: 0,
    height: 0,
    format: "",
    byteSize: 0,
    errorMessage,
  };
}
