import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { invitationInspirationService } from "@/services/invitations/invitation-inspiration.service";
import { getInvitationMediaLimits } from "@/lib/invitation/media-limits";
import { storeUploadFile } from "@/lib/uploads/file-storage";
import { ALLOWED_VIDEO_EXTENSIONS, ALLOWED_VIDEO_MIME_TYPES } from "@/lib/video/constants";
import { extractExtension } from "@/lib/video/validation";
import { sniffVideoContainer } from "@/lib/video/container-sniff";
import { createAndQueueLocalVideoAsset } from "@/lib/video/processing";
import { serializeVideoAsset } from "@/lib/video/serialize";

// Node runtime required: reads multipart bodies into memory. Video no longer runs ffmpeg
// inline here (see `handleVideoUpload`) — only image/PDF processing is synchronous now, so
// this route always returns quickly regardless of `maxDuration`.
export const runtime = "nodejs";
export const maxDuration = 60;

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
      return await handleVideoUpload(buffer, resolved, role, file, session.user.id);
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
 * Video path: byte-sniff the real container (never trust the client), persist the raw bytes
 * immediately, and queue background transcoding to a browser-universal MP4 (H.264/AAC/
 * yuv420p/faststart, <=1080p, correct orientation, SDR) via the same `VideoAsset` + worker
 * pipeline the rest of the app uses.
 *
 * ASYNC (v2): this used to call `processVideoFile` inline and hold the request open for the
 * full ffmpeg run — on large uploads that produced `Upload error: ECONNRESET` (client/proxy
 * idle-timeout killing the socket mid-transcode). Now the response returns `202 Accepted` the
 * instant the bytes are safely on disk, carrying `video.assetId` + `video.pollUrl`; the
 * caller polls `GET /api/uploads/video/:id` (the same generic endpoint `VideoUploader` uses)
 * until `status` is `READY` (then `video.playbackUrl` is the final MP4) or `FAILED`.
 */
async function handleVideoUpload(
  buffer: Buffer,
  resolved: ResolvedUpload,
  role: string,
  file: File,
  userId: string
) {
  const sniff = sniffVideoContainer(buffer.subarray(0, 262_144));
  if (sniff.disallowed) {
    return NextResponse.json(
      { error: `File was rejected — detected as ${sniff.disallowed.label}, not a video.` },
      { status: 400 }
    );
  }

  const extHint = String(sniff.container ?? resolved.ext.replace(".", ""));

  // "PREMIUM" carries no artificial duration cap and a generous size ceiling in the shared
  // video pipeline (see limits.ts) — this route's own `resolved.maxBytes` check above (run by
  // the caller before this function) remains the real, pre-existing size gate, so behavior
  // for callers of this legacy endpoint is unchanged from before this refactor.
  const asset = await createAndQueueLocalVideoAsset({
    category: "PREMIUM",
    ownerId: userId,
    context: { role, source: "invitations-upload" },
    originalFilename: file.name,
    originalMimeType: file.type || "application/octet-stream",
    originalExtension: extHint,
    buffer,
  });

  if (asset.status === "FAILED") {
    console.error("Invitation video queueing failed:", asset.failureReason);
    return NextResponse.json(
      {
        error:
          asset.failureReason ??
          "We couldn't process this video for playback. Please try again shortly, or upload an MP4 (H.264) exported from your device.",
      },
      { status: 503 }
    );
  }

  const serialized = serializeVideoAsset(asset);

  // Deliberately NOT running `invitationInspirationService.analyze()` here (unlike the
  // image/PDF path below) — it would bake today's (still-empty) `url` into `designConfig`.
  // The client re-applies the design once polling reaches READY and has the real
  // `playbackUrl`, so there's nothing useful to analyze yet.
  return NextResponse.json(
    {
      success: true,
      data: {
        url: "",
        type: "video" as const,
        role,
        name: file.name,
        size: file.size,
        video: {
          assetId: serialized.id,
          pollUrl: `/api/uploads/video/${serialized.id}`,
          playbackUrl: serialized.processedMp4Url,
          posterUrl: serialized.posterUrl,
          thumbnailUrl: serialized.thumbnailUrl,
          originalUrl: null,
          status: serialized.status,
          durationSeconds: serialized.durationSeconds,
          width: serialized.width,
          height: serialized.height,
        },
      },
    },
    { status: 202 }
  );
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