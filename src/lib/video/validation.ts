import { ALLOWED_VIDEO_EXTENSIONS, type AllowedVideoExtension } from "@/lib/video/constants";
import { sniffVideoContainer, detectMp4VideoCodecHint } from "@/lib/video/container-sniff";

export interface FileDescriptor {
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  extension?: AllowedVideoExtension;
}

const EXT_SET = new Set<string>(ALLOWED_VIDEO_EXTENSIONS);

export function extractExtension(filename: string): string | null {
  const clean = filename.trim().toLowerCase();
  const idx = clean.lastIndexOf(".");
  if (idx === -1 || idx === clean.length - 1) return null;
  return clean.slice(idx + 1);
}

/**
 * Metadata-only validation, safe to run before any bytes reach the server
 * (used by both the presign API and — mirrored — by the client picker).
 * Never trusts the extension alone: MIME + extension must not both be nonsense,
 * and `application/octet-stream` is only accepted when paired with a known extension.
 */
export function validateVideoDescriptor(
  file: FileDescriptor,
  maxBytes: number
): ValidationResult {
  if (!file.filename || file.filename.length > 255) {
    return { valid: false, reason: "Invalid filename." };
  }
  if (/[\x00-\x1f\x7f]/.test(file.filename)) {
    return { valid: false, reason: "Filename contains invalid characters." };
  }
  if (/(^|[\\/])\.\.([\\/]|$)/.test(file.filename) || file.filename.includes("\\") || file.filename.includes("/")) {
    return { valid: false, reason: "Filename must not contain path separators." };
  }

  if (!Number.isFinite(file.sizeBytes) || file.sizeBytes <= 0) {
    return { valid: false, reason: "File is empty or has an invalid size." };
  }
  if (file.sizeBytes > maxBytes) {
    return {
      valid: false,
      reason: `Video too large. Max ${Math.round(maxBytes / (1024 * 1024))}MB for this category.`,
    };
  }

  const ext = extractExtension(file.filename);
  if (!ext || !EXT_SET.has(ext)) {
    return {
      valid: false,
      reason: "Unsupported video file extension. Please use MP4, MOV, WebM, AVI, MKV, or another supported video format.",
    };
  }

  // Deliberately not gating on `file.mimeType` here: browsers/OSes are wildly inconsistent
  // about what they report for video files (empty string, application/octet-stream, or a
  // completely wrong value are all common — especially for HEVC, MKV, and pro/legacy
  // containers). The extension allowlist above is the only pre-upload signal we trust;
  // the real authority is the post-upload magic-byte signature check in
  // `validateVideoSignature`, which inspects the actual uploaded bytes.
  return { valid: true, extension: ext as AllowedVideoExtension };
}

export interface SignatureCheckResult {
  valid: boolean;
  reason?: string;
  detectedContainer: string | null;
  /** Best-effort codec hint (e.g. "hevc", "h264") — informational only, never a rejection reason. */
  detectedVideoCodec: string | null;
}

const MP4_FAMILY_CONTAINERS = new Set(["mp4", "mov", "3gp"]);

/**
 * Deep, post-upload validation: inspects the actual object bytes fetched from S3
 * (never trust what the browser claimed). Rejects disguised executables/archives/HTML
 * and containers we don't recognize as one of our supported formats.
 *
 * IMPORTANT: this never rejects based on video codec. HEVC/H.265 (iPhone/Android HEVC,
 * shipped inside .mp4/.mov) is a fully supported source codec — MediaConvert transcodes it
 * to H.264/AAC for universal playback. Only the *container* is validated here.
 */
export function validateVideoSignature(headerBytes: Buffer, claimedExtension: string): SignatureCheckResult {
  if (!headerBytes || headerBytes.length < 8) {
    return { valid: false, reason: "File is corrupt, empty, or truncated.", detectedContainer: null, detectedVideoCodec: null };
  }

  const sniff = sniffVideoContainer(headerBytes);
  if (sniff.disallowed) {
    return {
      valid: false,
      reason: `File was rejected — detected as ${sniff.disallowed.label}, not a video.`,
      detectedContainer: null,
      detectedVideoCodec: null,
    };
  }

  if (sniff.container) {
    const codec = MP4_FAMILY_CONTAINERS.has(sniff.container) ? detectMp4VideoCodecHint(headerBytes) : null;
    return { valid: true, detectedContainer: sniff.container, detectedVideoCodec: codec };
  }

  // Not confidently recognized. Some pro/legacy containers (raw DV, some MXF profiles,
  // low-bitrate MPEG-TS) don't have a byte-perfect universal signature — allow through
  // only when the claimed extension itself is one of those known-ambiguous formats,
  // otherwise reject as unrecognized/corrupt.
  const ambiguousButAllowed = new Set(["dv", "mxf", "mts", "m2ts", "ts", "vob"]);
  if (ambiguousButAllowed.has(claimedExtension)) {
    return { valid: true, detectedContainer: claimedExtension, detectedVideoCodec: null };
  }

  return {
    valid: false,
    reason: "Could not verify this file is a valid video (corrupt, encrypted, or unsupported container).",
    detectedContainer: null,
    detectedVideoCodec: null,
  };
}

/** Zero-byte / suspiciously tiny "video" guard used after HeadObject confirms the real size. */
export function validateFinalSize(actualBytes: number, claimedBytes: number, maxBytes: number): ValidationResult {
  if (actualBytes <= 0) return { valid: false, reason: "Uploaded file is zero bytes." };
  if (actualBytes > maxBytes) return { valid: false, reason: "Uploaded file exceeds the category size limit." };
  // Allow generous drift (multipart part rounding) but catch gross tampering (e.g. claimed 5MB, sent 500MB).
  const drift = Math.abs(actualBytes - claimedBytes);
  const tolerance = Math.max(MIN_TOLERANCE_BYTES, claimedBytes * 0.02);
  if (claimedBytes > 0 && drift > tolerance && actualBytes > claimedBytes * 1.5) {
    return { valid: false, reason: "Uploaded file size does not match the declared size." };
  }
  return { valid: true };
}

const MIN_TOLERANCE_BYTES = 64 * 1024;
