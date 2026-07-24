import { prisma } from "@/lib/prisma";
import { dispatchJob } from "@/lib/queue";
import type { VideoAsset } from "@prisma/client";
import {
  headVideoObject,
  getVideoObjectRange,
  getFullVideoObject,
  putVideoObject,
  buildPublicVideoUrl,
  deleteVideoObject,
} from "@/lib/video/s3-video";
import { storeUploadFile } from "@/lib/uploads/file-storage";
import { validateFinalSize, validateVideoSignature } from "@/lib/video/validation";
import { parseMp4Metadata } from "@/lib/video/mp4-metadata";
import { categoryMaxBytes, getVideoCategoryLimits } from "@/lib/video/limits";
import {
  buildMediaConvertJobPlan,
  createMediaConvertJob,
  getMediaConvertJobStatus,
  isMediaConvertConfigured,
  isVideoProcessingEnabled,
} from "@/lib/video/mediaconvert";
import { processVideoFile } from "@/lib/video/video-processor";
import { vendorMediaService } from "@/services/vendor-os/vendor-media.service";
import { eventMemoryUploadService } from "@/services/memory/event-memory-upload.service";
import type { VideoCategory } from "@/lib/video/constants";

/**
 * Which engine transcodes queued videos for the universal (S3-backed) upload pipeline.
 * "mediaconvert" — AWS Elemental MediaConvert (multi-rendition + HLS, requires AWS creds).
 * "ffmpeg"       — VPS-local ffmpeg via `src/lib/video/video-processor.ts` (single MP4 + poster,
 *                  no HLS/ABR in v1 — see docs/video-processing.md). This is what Hostinger
 *                  production uses today.
 * Explicit `VIDEO_PROCESSOR` env wins; otherwise auto-detect based on what's configured.
 */
export type VideoProcessorMode = "ffmpeg" | "mediaconvert";

export function getVideoProcessorMode(): VideoProcessorMode {
  const explicit = process.env.VIDEO_PROCESSOR?.trim().toLowerCase();
  if (explicit === "ffmpeg" || explicit === "mediaconvert") return explicit;
  return isMediaConvertConfigured() ? "mediaconvert" : "ffmpeg";
}

export class DuplicateFinalizationError extends Error {
  constructor() {
    super("This upload has already been finalized.");
    this.name = "DuplicateFinalizationError";
  }
}

export class OwnershipError extends Error {
  constructor() {
    super("You do not have access to this upload.");
    this.name = "OwnershipError";
  }
}

export function assertOwnership(asset: VideoAsset, ownerId: string) {
  if (asset.ownerId !== ownerId) throw new OwnershipError();
}

const HEADER_SNIFF_BYTES = 262_144; // 256KB — enough for ftyp/EBML/RIFF headers and most moov atoms.

/**
 * Runs once, right after the browser confirms the S3 upload finished (single PUT or
 * multipart complete). Verifies the object really exists with the right size, sniffs
 * its real container from the bytes (never trusting the client), extracts best-effort
 * metadata, and queues MediaConvert processing. Idempotent — safe to call twice for the
 * same asset; the second call is a no-op that returns the already-finalized asset.
 */
export async function finalizeVideoUpload(assetId: string): Promise<VideoAsset> {
  const asset = await prisma.videoAsset.findUniqueOrThrow({ where: { id: assetId } });

  if (asset.status !== "UPLOADING") {
    // Already finalized (or cancelled) — return current state instead of redoing work.
    return asset;
  }

  const head = await headVideoObject(asset.originalKey);
  if (!head.exists) {
    return failAsset(asset.id, "Upload did not complete — object not found in storage.");
  }

  const limits = await getVideoCategoryLimits(asset.category as VideoCategory);
  const maxBytes = categoryMaxBytes(limits);
  const sizeCheck = validateFinalSize(head.sizeBytes, Number(asset.sizeBytes), maxBytes);
  if (!sizeCheck.valid) {
    await deleteVideoObject(asset.originalKey);
    return failAsset(asset.id, sizeCheck.reason ?? "Upload failed size validation.");
  }

  const header = await getVideoObjectRange(asset.originalKey, 0, HEADER_SNIFF_BYTES - 1);
  if (!header) {
    return failAsset(asset.id, "Could not read the uploaded file to verify its format.");
  }

  const sigCheck = validateVideoSignature(header, asset.originalExtension);
  if (!sigCheck.valid) {
    await deleteVideoObject(asset.originalKey);
    return failAsset(asset.id, sigCheck.reason ?? "Uploaded file failed format verification.");
  }

  const mp4Meta = ["mp4", "mov", "m4v", "3gp", "3g2"].includes(asset.originalExtension)
    ? parseMp4Metadata(header)
    : { durationSeconds: null, width: null, height: null };

  if (limits.maxDurationSeconds && mp4Meta.durationSeconds && mp4Meta.durationSeconds > limits.maxDurationSeconds) {
    await deleteVideoObject(asset.originalKey);
    return failAsset(
      asset.id,
      `Video is too long for this category. Max ${Math.round(limits.maxDurationSeconds)}s.`
    );
  }

  const updated = await prisma.videoAsset.update({
    where: { id: asset.id },
    data: {
      status: "QUEUED",
      sizeBytes: BigInt(head.sizeBytes),
      detectedContainer: sigCheck.detectedContainer,
      detectedVideoCodec: sigCheck.detectedVideoCodec,
      durationSeconds: mp4Meta.durationSeconds,
      width: mp4Meta.width,
      height: mp4Meta.height,
      uploadedAt: new Date(),
      queuedAt: new Date(),
    },
  });

  const sideEffect = await runPreQueueSideEffects(updated);
  if (!sideEffect.ok) {
    await deleteVideoObject(updated.originalKey);
    return failAsset(updated.id, sideEffect.reason);
  }

  await dispatchJob("video-process", { assetId: updated.id });
  return updated;
}

/**
 * Local-disk + VPS FFmpeg fallback for the universal video pipeline — used automatically
 * when S3 isn't configured/usable on this environment (see `storage-strategy.ts`), e.g.
 * Hostinger production without AWS creds. Unlike the S3 path, the raw bytes are already in
 * memory (the browser posted them straight to our API instead of to S3), so there is no
 * separate "finalize then queue then worker polls" dance — everything happens synchronously
 * in one call: validate → transcode with `processVideoFile` (ffmpeg) → store the processed
 * MP4 + poster via `storeUploadFile` (local disk, or S3 if it becomes available mid-flight)
 * → mark READY/FAILED. Idempotent: a duplicate call on an already-finalized asset is a no-op.
 */
export async function processLocalVideoUpload(assetId: string, buffer: Buffer): Promise<VideoAsset> {
  const asset = await prisma.videoAsset.findUniqueOrThrow({ where: { id: assetId } });
  if (asset.status !== "UPLOADING") {
    return asset;
  }

  const limits = await getVideoCategoryLimits(asset.category as VideoCategory);
  const maxBytes = categoryMaxBytes(limits);

  const sizeCheck = validateFinalSize(buffer.length, Number(asset.sizeBytes), maxBytes);
  if (!sizeCheck.valid) {
    return failAsset(asset.id, sizeCheck.reason ?? "Upload failed size validation.");
  }

  const header = buffer.subarray(0, Math.min(buffer.length, 262_144));
  const sigCheck = validateVideoSignature(header, asset.originalExtension);
  if (!sigCheck.valid) {
    return failAsset(asset.id, sigCheck.reason ?? "Uploaded file failed format verification.");
  }

  const mp4Meta = ["mp4", "mov", "m4v", "3gp", "3g2"].includes(asset.originalExtension)
    ? parseMp4Metadata(header)
    : { durationSeconds: null, width: null, height: null };

  if (limits.maxDurationSeconds && mp4Meta.durationSeconds && mp4Meta.durationSeconds > limits.maxDurationSeconds) {
    return failAsset(asset.id, `Video is too long for this category. Max ${Math.round(limits.maxDurationSeconds)}s.`);
  }

  const uploaded = await prisma.videoAsset.update({
    where: { id: asset.id },
    data: {
      status: "PROCESSING",
      sizeBytes: BigInt(buffer.length),
      detectedContainer: sigCheck.detectedContainer,
      detectedVideoCodec: sigCheck.detectedVideoCodec,
      durationSeconds: mp4Meta.durationSeconds,
      width: mp4Meta.width,
      height: mp4Meta.height,
      uploadedAt: new Date(),
      queuedAt: new Date(),
      processingStartedAt: new Date(),
      attempts: { increment: 1 },
    },
  });

  const sideEffect = await runPreQueueSideEffects(uploaded);
  if (!sideEffect.ok) {
    return failAsset(uploaded.id, sideEffect.reason);
  }

  try {
    const result = await processVideoFile(buffer, { extensionHint: asset.originalExtension });
    if (!result.success || !result.outputBuffer) {
      throw new Error(result.error ?? "We couldn't process this video for playback.");
    }

    if (
      limits.maxDurationSeconds &&
      result.metadata.durationSeconds &&
      result.metadata.durationSeconds > limits.maxDurationSeconds
    ) {
      throw new Error(`Video is too long for this category. Max ${Math.round(limits.maxDurationSeconds)}s.`);
    }

    const baseSubPath = `${(asset.category as string).toLowerCase()}/${asset.id}`;
    const { url: processedMp4Url } = await storeUploadFile("videos", baseSubPath, "video.mp4", result.outputBuffer);

    let posterUrl: string | null = null;
    if (result.posterBuffer) {
      const poster = await storeUploadFile("videos", baseSubPath, "poster.jpg", result.posterBuffer).catch(() => null);
      posterUrl = poster?.url ?? null;
    }

    const updated = await prisma.videoAsset.update({
      where: { id: asset.id },
      data: {
        status: "READY",
        readyAt: new Date(),
        processedMp4Url,
        processedMp4Renditions: { original: processedMp4Url },
        hlsUrl: null,
        posterUrl,
        thumbnailUrl: posterUrl,
        thumbnailUrls: posterUrl ? [posterUrl] : [],
        durationSeconds: result.metadata.durationSeconds ?? uploaded.durationSeconds,
        width: result.metadata.width ?? uploaded.width,
        height: result.metadata.height ?? uploaded.height,
        detectedVideoCodec: result.metadata.hadHevc ? "hevc" : uploaded.detectedVideoCodec,
      },
      include: { memoryUpload: true },
    });

    await runReadySideEffects(updated);
    return updated;
  } catch (error) {
    return failAsset(uploaded.id, error instanceof Error ? error.message : "Video processing failed.");
  }
}

/**
 * Category-specific gating that must happen before we spend money on MediaConvert: for
 * guestbook uploads this creates the moderation-queue row up front (enforcing the same
 * per-guest video limits / upload-window rules as the legacy synchronous flow) so an
 * over-quota or closed-window guest submission fails fast instead of processing for nothing.
 */
async function runPreQueueSideEffects(asset: VideoAsset): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (asset.category !== "GUESTBOOK" || !asset.eventId) return { ok: true };

  const context = (asset.context as Record<string, unknown> | null) ?? {};
  try {
    await eventMemoryUploadService.createGuestUpload({
      eventId: asset.eventId,
      uploaderName: typeof context.guestName === "string" ? context.guestName : undefined,
      uploaderPhone: typeof context.guestPhone === "string" ? context.guestPhone : undefined,
      mediaType: "video",
      mediaUrl: "",
      caption: typeof context.caption === "string" ? context.caption : undefined,
      consentGiven: true,
      videoAssetId: asset.id,
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Could not register guestbook upload." };
  }
}

async function failAsset(assetId: string, reason: string): Promise<VideoAsset> {
  return prisma.videoAsset.update({
    where: { id: assetId },
    data: { status: "FAILED", failureReason: reason },
  });
}

/**
 * BackgroundJob handler body for the `video-process` queue. Idempotent: only acts on
 * assets still in QUEUED status, so a duplicate dispatch (e.g. a retried job) is a safe no-op.
 */
export async function processQueuedVideoAsset(assetId: string): Promise<void> {
  const asset = await prisma.videoAsset.findUnique({ where: { id: assetId } });
  if (!asset || asset.status !== "QUEUED") return;

  if (!isVideoProcessingEnabled()) {
    // Ops has intentionally paused processing platform-wide — leave QUEUED for a later run.
    return;
  }

  const mode = getVideoProcessorMode();

  if (mode === "ffmpeg") {
    await processQueuedVideoAssetWithFfmpeg(asset);
    return;
  }

  if (!isMediaConvertConfigured()) {
    // Environment gap, not a defect in this video — leave QUEUED so it self-heals once
    // AWS_MEDIACONVERT_ROLE_ARN (and friends) are set, per the docs in .env.example.
    return;
  }

  await prisma.videoAsset.update({
    where: { id: asset.id },
    data: { status: "PROCESSING", processingStartedAt: new Date(), attempts: { increment: 1 } },
  });

  try {
    const plan = await buildMediaConvertJobPlan({
      assetId: asset.id,
      category: asset.category as VideoCategory,
      originalKey: asset.originalKey,
      durationSeconds: asset.durationSeconds,
      context: (asset.context as Record<string, unknown> | null) ?? null,
    });
    const job = await createMediaConvertJob(plan, asset.id);
    await prisma.videoAsset.update({
      where: { id: asset.id },
      data: {
        mediaConvertJobId: job.jobId,
        mediaConvertQueue: job.queueArn,
        thumbnailUrls: plan.willProduceHls ? { hls: true, renditions: plan.renditionNames } : { renditions: plan.renditionNames },
      },
    });
  } catch (error) {
    await prisma.videoAsset.update({
      where: { id: asset.id },
      data: {
        status: "FAILED",
        failureReason: error instanceof Error ? error.message : "MediaConvert job submission failed.",
      },
    });
  }
}

/**
 * VPS bridge: same QUEUED -> READY/FAILED contract as the MediaConvert path above, but runs
 * ffmpeg locally on this box instead of submitting an AWS job. Used automatically when
 * `VIDEO_PROCESSOR=ffmpeg` (or MediaConvert isn't configured) — i.e. production Hostinger.
 * v1 limitation: single MP4 rendition + poster, no HLS/ABR ladder (see docs/video-processing.md).
 */
async function processQueuedVideoAssetWithFfmpeg(asset: VideoAsset): Promise<void> {
  await prisma.videoAsset.update({
    where: { id: asset.id },
    data: { status: "PROCESSING", processingStartedAt: new Date(), attempts: { increment: 1 } },
  });

  try {
    const original = await getFullVideoObject(asset.originalKey);
    if (!original) {
      throw new Error("Could not download the original upload from storage for processing.");
    }

    const result = await processVideoFile(original, { extensionHint: asset.originalExtension });
    if (!result.success || !result.outputBuffer) {
      throw new Error(result.error ?? "ffmpeg processing failed.");
    }

    const prefix = `processed/videos/${(asset.category as string).toLowerCase()}/${asset.id}`;
    const mp4Key = `${prefix}/mp4/video.mp4`;
    await putVideoObject(mp4Key, result.outputBuffer, "video/mp4");
    const processedMp4Url = await buildPublicVideoUrl(mp4Key);

    let posterUrl: string | null = null;
    if (result.posterBuffer) {
      const posterKey = `${prefix}/images/poster.jpg`;
      await putVideoObject(posterKey, result.posterBuffer, "image/jpeg");
      posterUrl = await buildPublicVideoUrl(posterKey);
    }

    const updated = await prisma.videoAsset.update({
      where: { id: asset.id },
      data: {
        status: "READY",
        readyAt: new Date(),
        processedMp4Url,
        processedMp4Renditions: { original: processedMp4Url },
        hlsUrl: null,
        posterUrl,
        thumbnailUrl: posterUrl,
        thumbnailUrls: posterUrl ? [posterUrl] : [],
        durationSeconds: result.metadata.durationSeconds ?? asset.durationSeconds,
        width: result.metadata.width ?? asset.width,
        height: result.metadata.height ?? asset.height,
        detectedVideoCodec: result.metadata.hadHevc ? "hevc" : asset.detectedVideoCodec,
      },
      include: { memoryUpload: true },
    });

    await runReadySideEffects(updated);
  } catch (error) {
    await prisma.videoAsset.update({
      where: { id: asset.id },
      data: {
        status: "FAILED",
        failureReason: error instanceof Error ? error.message : "Video processing failed.",
      },
    });
  }
}

/** Exported for tests — MediaConvert's FRAME_CAPTURE output naming convention (7-digit zero-padded sequence). */
export function frameCaptureUrl(baseUrl: string, modifier: string, sequence = 0): string {
  const seq = String(sequence).padStart(7, "0");
  return `${baseUrl}${modifier}.${seq}.jpg`;
}

/**
 * Polls all in-flight MediaConvert jobs and reconciles their status into VideoAsset rows.
 * Runs on an interval from the worker script (see scripts/video-jobs-worker.ts) — this is
 * lightweight orchestration only, never heavy media processing on the VPS itself.
 */
export async function pollActiveVideoProcessingJobs(batchSize = 25): Promise<{ checked: number; completed: number; failed: number }> {
  if (!isMediaConvertConfigured()) return { checked: 0, completed: 0, failed: 0 };

  const processing = await prisma.videoAsset.findMany({
    where: { status: "PROCESSING", mediaConvertJobId: { not: null } },
    take: batchSize,
    orderBy: { processingStartedAt: "asc" },
  });

  let completed = 0;
  let failed = 0;

  for (const asset of processing) {
    try {
      const result = await getMediaConvertJobStatus(asset.mediaConvertJobId!);
      if (result.status === "COMPLETE") {
        await markVideoReady(asset, result.outputDurationMs, result.outputWidth, result.outputHeight);
        completed++;
      } else if (result.status === "ERROR" || result.status === "CANCELED") {
        await prisma.videoAsset.update({
          where: { id: asset.id },
          data: { status: "FAILED", failureReason: result.errorMessage ?? `MediaConvert job ${result.status.toLowerCase()}.` },
        });
        failed++;
      }
      // SUBMITTED / PROGRESSING — leave as-is, checked again next tick.
    } catch (error) {
      // Transient AWS API error — leave PROCESSING, will retry next poll. Log for ops visibility.
      // eslint-disable-next-line no-console
      console.error(`[video-jobs-worker] failed to poll MediaConvert job for asset ${asset.id}:`, error);
    }
  }

  return { checked: processing.length, completed, failed };
}

async function markVideoReady(
  asset: VideoAsset,
  outputDurationMs: number | null,
  outputWidth: number | null,
  outputHeight: number | null
) {
  const prefix = `processed/videos/${(asset.category as string).toLowerCase()}/${asset.id}`;
  const rendPlan = (asset.thumbnailUrls as { renditions?: string[]; hls?: boolean } | null) ?? {};
  const renditionNames = rendPlan.renditions ?? ["720p"];
  const bestRendition = renditionNames[renditionNames.length - 1];

  const mp4Base = await buildPublicVideoUrl(`${prefix}/mp4/video_${bestRendition}.mp4`);
  const renditionUrls: Record<string, string> = {};
  for (const name of renditionNames) {
    renditionUrls[name] = await buildPublicVideoUrl(`${prefix}/mp4/video_${name}.mp4`);
  }
  const posterBase = await buildPublicVideoUrl(`${prefix}/images/frame`);
  const posterUrl = frameCaptureUrl(posterBase, "_poster", 0);
  const thumbnailUrl = frameCaptureUrl(posterBase, "_thumb", 0);
  const thumbnailUrls = [0, 1, 2, 3].map((i) => frameCaptureUrl(posterBase, "_thumb", i));

  let hlsUrl: string | null = null;
  if (rendPlan.hls) {
    hlsUrl = await buildPublicVideoUrl(`${prefix}/hls/video.m3u8`);
  }

  const updated = await prisma.videoAsset.update({
    where: { id: asset.id },
    data: {
      status: "READY",
      readyAt: new Date(),
      processedMp4Url: mp4Base,
      processedMp4Renditions: renditionUrls,
      hlsUrl,
      posterUrl,
      thumbnailUrl,
      thumbnailUrls,
      durationSeconds: outputDurationMs ? outputDurationMs / 1000 : asset.durationSeconds,
      width: outputWidth ?? asset.width,
      height: outputHeight ?? asset.height,
    },
    include: { memoryUpload: true },
  });

  await runReadySideEffects(updated);
}

/** Category-specific fan-out once a video is ready: update the guestbook row / create the vendor portfolio row. */
async function runReadySideEffects(asset: VideoAsset & { memoryUpload?: { id: string } | null }) {
  if (asset.category === "GUESTBOOK" && asset.memoryUpload) {
    await prisma.eventMemoryUpload.update({
      where: { id: asset.memoryUpload.id },
      data: { mediaUrl: asset.processedMp4Url ?? "", thumbnailUrl: asset.thumbnailUrl },
    });
  }

  if (asset.category === "VENDOR_PORTFOLIO" && asset.vendorId && asset.processedMp4Url) {
    const alreadyLinked = await prisma.vendorMedia.findFirst({
      where: { vendorId: asset.vendorId, url: asset.processedMp4Url },
      select: { id: true },
    });
    if (!alreadyLinked) {
      try {
        await vendorMediaService.addMedia(asset.vendorId, {
          url: asset.processedMp4Url,
          type: "video",
          sizeBytes: Number(asset.sizeBytes),
        });
      } catch {
        // Plan limits changed between upload and processing — video stays READY/queryable
        // via VideoAsset even if it can't be auto-attached to the portfolio grid.
      }
    }
  }
}
