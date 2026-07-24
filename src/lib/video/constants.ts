/**
 * Universal video upload constants shared by client components and API routes.
 * Keep this the single source of truth for accepted formats — never hardcode
 * an `accept` string or extension list anywhere else.
 */

export type VideoCategory =
  | "EVENT_SHORT"
  | "INVITATION_BACKGROUND"
  | "VENDOR_PORTFOLIO"
  | "GUESTBOOK"
  | "PREMIUM"
  | "ADMIN";

export const VIDEO_CATEGORIES: VideoCategory[] = [
  "EVENT_SHORT",
  "INVITATION_BACKGROUND",
  "VENDOR_PORTFOLIO",
  "GUESTBOOK",
  "PREMIUM",
  "ADMIN",
];

export function isVideoCategory(value: unknown): value is VideoCategory {
  return typeof value === "string" && (VIDEO_CATEGORIES as string[]).includes(value);
}

/**
 * Broad consumer + pro video formats: phone captures, DSLR/mirrorless, WhatsApp/TikTok/IG
 * exports, screen recordings, and professional camera containers (MXF, MTS/M2TS, DV).
 */
export const ALLOWED_VIDEO_EXTENSIONS = [
  "mp4",
  "mov",
  "m4v",
  "webm",
  "avi",
  "mkv",
  "wmv",
  "flv",
  "mpg",
  "mpeg",
  "m2v",
  "mts",
  "m2ts",
  "ts",
  "3gp",
  "3g2",
  "ogv",
  "vob",
  "asf",
  "dv",
  "mxf",
] as const;

export type AllowedVideoExtension = (typeof ALLOWED_VIDEO_EXTENSIONS)[number];

/** MIME types browsers commonly report for the extensions above (best-effort — browsers are inconsistent). */
export const ALLOWED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-m4v",
  "video/webm",
  "video/avi",
  "video/x-msvideo",
  "video/x-matroska",
  "video/x-ms-wmv",
  "video/x-flv",
  "video/mpeg",
  "video/mp2t",
  "video/3gpp",
  "video/3gpp2",
  "video/ogg",
  "video/dvd",
  "video/x-ms-asf",
  "video/x-dv",
  "application/mxf",
  /** HEVC/H.265 is a codec, not a container — it ships inside .mp4/.mov (iPhone, Android, some
   *  screen recorders). A handful of browsers/OSes report one of these instead of video/mp4|quicktime. */
  "video/hevc",
  "video/h265",
  "video/x-hevc",
  /** Some browsers/OSes cannot resolve a MIME type for niche or pro containers. */
  "application/octet-stream",
] as const;

/** Video codec fourCCs/names we recognize as HEVC/H.265 — never a rejection reason by themselves. */
export const HEVC_CODEC_IDENTIFIERS = ["hevc", "h265", "h.265", "hev1", "hvc1"] as const;

export function isHevcCodec(codec: string | null | undefined): boolean {
  if (!codec) return false;
  const normalized = codec.toLowerCase();
  return (HEVC_CODEC_IDENTIFIERS as readonly string[]).some((id) => normalized.includes(id));
}

/** Extension → canonical MIME used when tagging S3 objects and MediaConvert outputs. */
export const EXTENSION_MIME_MAP: Record<AllowedVideoExtension, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  webm: "video/webm",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  wmv: "video/x-ms-wmv",
  flv: "video/x-flv",
  mpg: "video/mpeg",
  mpeg: "video/mpeg",
  m2v: "video/mpeg",
  mts: "video/mp2t",
  m2ts: "video/mp2t",
  ts: "video/mp2t",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2",
  ogv: "video/ogg",
  vob: "video/dvd",
  asf: "video/x-ms-asf",
  dv: "video/x-dv",
  mxf: "application/mxf",
};

/**
 * The exact `accept` attribute required across every video file input in the app.
 * Combines the wildcard (covers correctly-typed browsers) with explicit extensions
 * (covers browsers/OSes that report `application/octet-stream` or nothing at all).
 */
export const VIDEO_ACCEPT_ATTR = `video/*,${ALLOWED_VIDEO_EXTENSIONS.map((ext) => `.${ext}`).join(",")}`;

/** Executable / script / archive signatures we must reject even if renamed with a video extension. */
export const DISALLOWED_SIGNATURE_LABELS = [
  "Windows executable (PE/EXE)",
  "Unix/Linux executable (ELF)",
  "macOS executable (Mach-O)",
  "Shell script",
  "HTML document",
  "ZIP/Office archive",
  "RAR archive",
  "7-Zip archive",
  "Java archive",
  "PDF document",
] as const;

/** Multipart threshold — files at/above this use S3 multipart upload; below use single presigned PUT. */
export const MULTIPART_THRESHOLD_BYTES = 8 * 1024 * 1024; // 8MB

/** S3 multipart requires parts >= 5MB (except the last part). */
export const MIN_PART_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const DEFAULT_PART_SIZE_BYTES = 16 * 1024 * 1024; // 16MB
export const MAX_PARTS = 10_000; // hard S3 ceiling

/** Presigned URL lifetime — kept short per security requirements (5–15 minutes). */
export const PRESIGN_EXPIRY_SECONDS = 10 * 60; // 10 minutes
export const MIN_PRESIGN_EXPIRY_SECONDS = 5 * 60;
export const MAX_PRESIGN_EXPIRY_SECONDS = 15 * 60;

/** Abandoned multipart uploads older than this are auto-aborted & cancelled. */
export const DEFAULT_ABANDONED_UPLOAD_HOURS = 24;

/** Videos longer than this get an HLS/ABR rendition in addition to MP4. */
export const HLS_MIN_DURATION_SECONDS = 90;

export const RAW_VIDEO_KEY_PREFIX = "uploads/raw/videos";
export const PROCESSED_VIDEO_KEY_PREFIX = "processed/videos";
