import { prisma } from "@/lib/prisma";
import { abortMultipartUpload, deleteVideoObject, deleteVideoObjectsByPrefix } from "@/lib/video/s3-video";
import { deleteUploadFile } from "@/lib/uploads/file-storage";
import { dispatchJob } from "@/lib/queue";
import { DEFAULT_ABANDONED_UPLOAD_HOURS } from "@/lib/video/constants";
import type { VideoAsset } from "@prisma/client";

function abandonedThresholdHours(): number {
  const raw = Number(process.env.VIDEO_ABANDONED_UPLOAD_HOURS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_ABANDONED_UPLOAD_HOURS;
}

const DEFAULT_STALE_PROCESSING_MINUTES = 20; // ffmpeg's own 15-min hard timeout (VIDEO_PROCESSOR_TIMEOUT_MS) + a 5-min buffer.
const DEFAULT_MAX_PROCESSING_ATTEMPTS = 3;

function staleProcessingThresholdMs(): number {
  const raw = Number(process.env.VIDEO_STALE_PROCESSING_MINUTES);
  const minutes = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_STALE_PROCESSING_MINUTES;
  return minutes * 60 * 1000;
}

function maxProcessingAttempts(): number {
  const raw = Number(process.env.VIDEO_MAX_PROCESSING_ATTEMPTS);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_MAX_PROCESSING_ATTEMPTS;
}

/**
 * Recovers `VideoAsset` rows stuck in `PROCESSING` past a stale threshold — the #1 cause of
 * "processing forever" reports: the `video-jobs-worker` process dies mid-transcode (OOM kill,
 * `pm2 restart`, a VPS reboot, an ffmpeg child process that ignores SIGKILL just long enough to
 * wedge the event loop) after flipping the row to `PROCESSING` but before it can ever reach
 * `READY`/`FAILED`. `processQueuedVideoAsset` only ever acts on `QUEUED` assets, so without this
 * sweep such a row — and the "Preparing your video…" spinner bound to it — would spin forever.
 *
 * Uses `processingStartedAt` (set precisely, every time processing begins) as the staleness
 * clock, so this never misjudges a video that's still genuinely mid-transcode within ffmpeg's
 * own `VIDEO_PROCESSOR_TIMEOUT_MS` budget.
 *
 * Retries (reset to `QUEUED`, re-dispatch the `video-process` job) while `attempts` — already
 * incremented every time this asset entered `PROCESSING` — is under the cap; beyond that it's
 * marked `FAILED` with an actionable, honest message instead of spinning forever.
 */
export async function recoverStalledVideoProcessing(batchSize = 25): Promise<{ requeued: number; failed: number }> {
  const cutoff = new Date(Date.now() - staleProcessingThresholdMs());
  const maxAttempts = maxProcessingAttempts();
  const stale = await prisma.videoAsset.findMany({
    where: { status: "PROCESSING", processingStartedAt: { lt: cutoff } },
    take: batchSize,
    orderBy: { processingStartedAt: "asc" },
  });

  let requeued = 0;
  let failed = 0;
  for (const asset of stale) {
    if (asset.attempts < maxAttempts) {
      await prisma.videoAsset.update({
        where: { id: asset.id },
        data: { status: "QUEUED", processingStartedAt: null },
      });
      await dispatchJob("video-process", { assetId: asset.id });
      requeued++;
    } else {
      await prisma.videoAsset.update({
        where: { id: asset.id },
        data: {
          status: "FAILED",
          failureReason: `Video processing timed out after ${asset.attempts} attempt(s) — the worker may have restarted mid-job. Please re-upload the video.`,
        },
      });
      failed++;
    }
  }
  return { requeued, failed };
}

/**
 * Aborts + cancels uploads stuck in UPLOADING past the abandonment threshold (browser closed
 * mid-upload, network died, user gave up). Frees the S3 multipart upload (which otherwise
 * bills for stored parts indefinitely) and marks the DB row CANCELLED for a clean audit trail.
 * Safe to run repeatedly — every asset it touches transitions out of UPLOADING exactly once.
 *
 * Runs regardless of whether S3 is configured: local-disk-fallback uploads (see
 * storage-strategy.ts) can get stuck in UPLOADING too (browser closed mid-POST), and their
 * DB rows still need sweeping even though there's no S3 object to abort/delete.
 * `abortMultipartUpload`/`deleteVideoObject` are both no-ops when S3 isn't configured.
 */
export async function cleanupAbandonedVideoUploads(batchSize = 50): Promise<{ cancelled: number }> {
  const cutoff = new Date(Date.now() - abandonedThresholdHours() * 60 * 60 * 1000);
  const stale = await prisma.videoAsset.findMany({
    where: { status: "UPLOADING", createdAt: { lt: cutoff } },
    take: batchSize,
  });

  let cancelled = 0;
  for (const asset of stale) {
    if (asset.multipartUploadId) {
      await abortMultipartUpload(asset.originalKey, asset.multipartUploadId);
    }
    await deleteVideoObject(asset.originalKey);
    // Local-disk fallback originals (see `queueLocalVideoUpload`) never reach S3 — best-effort,
    // no-op if the file doesn't exist (e.g. this asset never made it past the UPLOADING step).
    await deleteUploadFile(asset.originalKey);
    await prisma.videoAsset.update({
      where: { id: asset.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        failureReason: "Abandoned upload — automatically cancelled after inactivity.",
      },
    });
    cancelled++;
  }
  return { cancelled };
}

/**
 * Permanently removes a VideoAsset — the "delete this video" action for READY (or any-status)
 * uploads, used once a video has already finished processing and cancel (which only handles
 * in-flight uploads) no longer applies. Best-effort across every storage backend the pipeline
 * can produce, since which one was used depends on the environment that processed it:
 *   - Raw original upload (S3, when configured).
 *   - ffmpeg/MediaConvert processed derivatives under `processed/videos/<category>/<id>/`
 *     (S3) — prefix-deleted so it doesn't matter whether that's a single MP4+poster or a full
 *     multi-rendition + HLS + thumbnail-frame set.
 *   - Local-disk fallback derivatives under `videos/<category>/<id>/` (used when S3 isn't
 *     configured on this environment — see `queueLocalVideoUpload` / `processQueuedVideoAssetLocalFfmpeg`).
 * Storage failures are swallowed by the underlying helpers; the DB row is always removed last
 * so a partial storage cleanup never leaves an orphaned VideoAsset behind. The FK from
 * `EventMemoryUpload.videoAssetId` is `onDelete: SetNull`, so guestbook rows survive intact.
 */
export async function deleteVideoAssetAndStorage(asset: VideoAsset): Promise<void> {
  if (asset.multipartUploadId && asset.status === "UPLOADING") {
    await abortMultipartUpload(asset.originalKey, asset.multipartUploadId);
  }
  await deleteVideoObject(asset.originalKey);
  // Local-disk fallback original (raw upload persisted by `queueLocalVideoUpload`) — no-op if
  // this asset's original ever lived in S3 instead.
  await deleteUploadFile(asset.originalKey);

  const categorySlug = (asset.category as string).toLowerCase();
  await deleteVideoObjectsByPrefix(`processed/videos/${categorySlug}/${asset.id}/`);

  const localBase = `videos/${categorySlug}/${asset.id}`;
  await deleteUploadFile(`${localBase}/video.mp4`);
  await deleteUploadFile(`${localBase}/poster.jpg`);

  await prisma.videoAsset.delete({ where: { id: asset.id } }).catch(() => {
    // Already gone (idempotent double-delete) — nothing left to do.
  });
}
