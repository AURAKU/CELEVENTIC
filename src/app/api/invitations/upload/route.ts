import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { invitationInspirationService } from "@/services/invitations/invitation-inspiration.service";
import { getInvitationMediaLimits } from "@/lib/invitation/media-limits";
import { storeUploadFile } from "@/lib/uploads/file-storage";
import {
  ALLOWED_VIDEO_EXTENSIONS,
  ALLOWED_VIDEO_MIME_TYPES,
  type AllowedVideoExtension,
} from "@/lib/video/constants";
import { extractExtension } from "@/lib/video/validation";
import { sniffVideoContainer } from "@/lib/video/container-sniff";
import { processVideoFile } from "@/lib/video/video-processor";

// Node runtime required: video processing uses node:child_process/fs. `maxDuration` is a
// no-op on self-hosted (pm2/systemd) but caps gracefully if ever deployed behind a platform
// that enforces one (e.g. Vercel).
export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_PDF = 15 * 1024 * 1024;

type MediaKind = "image" | "video" | "pdf";

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/jfif", "image/pjpeg"]);
const VIDEO_MIME_TYPE_SET = new Set<string>(ALLOWED_VIDEO_MIME_TYPES);

interface ResolvedUpload {
  mediaType: MediaKind;
  ext: string;
  maxBytes: number;
}

/**
 * Resolve the upload type the same way `src/lib/video/validation.ts` does for the universal
 * pipeline: never trust the browser-reported MIME alone for video (HEVC/MOV/MKV/etc. are
 * wildly inconsistent across browsers/OSes) — the file extension is the primary signal, and
 * the post-upload byte signature check below is the real authority.
 */
function resolveUploadKind(file: File, limits: { maxImageBytes: number; maxVideoBytes: number }): ResolvedUpload | null {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    return { mediaType: "pdf", ext: ".pdf", maxBytes: MAX_PDF };
  }
  if (IMAGE_MIME_TYPES.has(file.type)) {
    const ext = file.type === "image/jpeg" || file.type === "image/pjpeg" || file.type === "image/jfif" ? ".jpg" : `.${file.type.split("/")[1]}`;
    return { mediaType: "image", ext, maxBytes: limits.maxImageBytes };
  }

  const extFromName = extractExtension(file.name);
  const isKnownVideoExt = extFromName ? (ALLOWED_VIDEO_EXTENSIONS as readonly string[]).includes(extFromName) : false;
  const isVideoMime = file.type.startsWith("video/") || VIDEO_MIME_TYPE_SET.has(file.type);
  if (isKnownVideoExt || isVideoMime) {
    const ext = isKnownVideoExt ? `.${extFromName}` : ".mp4";
    return { mediaType: "video", ext, maxBytes: limits.maxVideoBytes };
  }

  return null;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const limits = await getInvitationMediaLimits();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const role = (formData.get("role") as string) || "hero";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const resolved = resolveUploadKind(file, limits);
    if (!resolved) {
      return NextResponse.json(
        { error: "Unsupported file type. Use JPG, PNG, WebP, PDF, or a common video format (MP4, MOV, WebM, AVI, MKV, and more)." },
        { status: 400 }
      );
    }

    if (resolved.mediaType === "video" && role === "background" && !limits.allowVideoBackground) {
      return NextResponse.json({ error: "Video backgrounds are disabled for invitations." }, { status: 403 });
    }

    if (file.size > resolved.maxBytes) {
      return NextResponse.json({ error: `File too large. Max ${Math.round(resolved.maxBytes / 1024 / 1024)}MB.` }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (resolved.mediaType === "video") {
      return await handleVideoUpload(buffer, resolved, role, file, session.user.id, formData);
    }

    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${resolved.ext}`;
    const { url } = await storeUploadFile("invitations", session.user.id, safeName, buffer);

    return NextResponse.json({
      success: true,
      data: buildAnalysisPayload({
        url,
        type: resolved.mediaType,
        role,
        name: file.name,
        size: file.size,
        formData,
      }),
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

/**
 * Video path: byte-sniff the real container (never trust the client), transcode to a
 * browser-universal MP4 (H.264/AAC/yuv420p/faststart, <=1080p, correct orientation, SDR),
 * store the processed MP4 + poster (+ the original for reference), and return a payload
 * where `data.url` is ALWAYS the playable MP4 — never the raw upload.
 *
 * Synchronous by design (v1): this VPS route processes one request's video inline, bounded
 * to `VIDEO_PROCESSOR_CONCURRENCY` (default 1) concurrent ffmpeg/converter runs process-wide.
 * See docs/video-processing.md for the async-worker upgrade path.
 */
async function handleVideoUpload(
  buffer: Buffer,
  resolved: ResolvedUpload,
  role: string,
  file: File,
  userId: string,
  formData: FormData
) {
  const sniff = sniffVideoContainer(buffer.subarray(0, 262_144));
  if (sniff.disallowed) {
    return NextResponse.json(
      { error: `File was rejected — detected as ${sniff.disallowed.label}, not a video.` },
      { status: 400 }
    );
  }

  const extHint = (sniff.container ?? resolved.ext.replace(".", "")) as AllowedVideoExtension | string;
  const baseId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const result = await processVideoFile(buffer, { extensionHint: String(extHint) });

  if (!result.success || !result.outputBuffer) {
    console.error("Invitation video processing failed:", result.error);
    return NextResponse.json(
      {
        error:
          "We couldn't process this video for playback. Please try again shortly, or upload an MP4 (H.264) exported from your device.",
        detail: process.env.NODE_ENV === "production" ? undefined : result.error,
      },
      { status: 503 }
    );
  }

  // Keep the original privately (audit/reprocessing) — never returned as the primary `url`.
  const originalName = `${baseId}-original${sniff.container ? `.${sniff.container}` : resolved.ext}`;
  const { url: originalUrl } = await storeUploadFile("invitations", `${userId}/originals`, originalName, buffer).catch(() => ({ url: null as string | null }));

  const { url: playbackUrl } = await storeUploadFile("invitations", userId, `${baseId}.mp4`, result.outputBuffer);

  let posterUrl: string | null = null;
  if (result.posterBuffer) {
    const poster = await storeUploadFile("invitations", userId, `${baseId}-poster.jpg`, result.posterBuffer).catch(() => null);
    posterUrl = poster?.url ?? null;
  }

  return NextResponse.json({
    success: true,
    data: buildAnalysisPayload({
      url: playbackUrl,
      type: "video",
      role,
      name: file.name,
      size: file.size,
      formData,
      video: {
        playbackUrl,
        posterUrl,
        thumbnailUrl: posterUrl,
        originalUrl,
        status: "READY",
        method: result.method,
        durationSeconds: result.metadata.durationSeconds,
        width: result.metadata.width,
        height: result.metadata.height,
        hadHevc: result.metadata.hadHevc,
        hadHdr: result.metadata.hadHdr,
        hasAudio: result.metadata.hasAudio,
      },
    }),
  });
}

function buildAnalysisPayload(input: {
  url: string;
  type: MediaKind;
  role: string;
  name: string;
  size: number;
  formData: FormData;
  video?: Record<string, unknown>;
}) {
  const buildMode = (input.formData.get("buildMode") as string) || "inspired";
  const clientColors = input.formData.get("colors");
  const clientBrightness = input.formData.get("brightness");
  const clientAspectRatio = input.formData.get("aspectRatio");

  let parsedColors: { hex: string; weight: number }[] | undefined;
  if (typeof clientColors === "string") {
    try {
      parsedColors = JSON.parse(clientColors);
    } catch {
      /* ignore */
    }
  }

  const analysis = invitationInspirationService.analyze({
    url: input.url,
    type: input.type,
    name: input.name,
    buildMode: buildMode as "inspired" | "similar" | "improved" | "template",
    colors: parsedColors,
    brightness: clientBrightness ? parseFloat(String(clientBrightness)) : undefined,
    aspectRatio: clientAspectRatio ? parseFloat(String(clientAspectRatio)) : undefined,
  });

  return {
    url: input.url,
    type: input.type,
    role: input.role,
    name: input.name,
    size: input.size,
    analysis,
    ...(input.video ? { video: input.video } : {}),
  };
}