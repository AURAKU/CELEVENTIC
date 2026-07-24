import { prisma } from "@/lib/prisma";
import { abortMultipartUpload, deleteVideoObject, deleteVideoObjectsByPrefix } from "@/lib/video/s3-video";
import { deleteUploadFile } from "@/lib/uploads/file-storage";
import { DEFAULT_ABANDONED_UPLOAD_HOURS } from "@/lib/video/constants";
import type { VideoAsset } from "@prisma/client";

function abandonedThresholdHours(): number {
  const raw = Number(process.env.VIDEO_ABANDONED_UPLOAD_HOURS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_ABANDONED_UPLOAD_HOURS;
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
 *     configured on this environment — see `processLocalVideoUpload`).
 * Storage failures are swallowed by the underlying helpers; the DB row is always removed last
 * so a partial storage cleanup never leaves an orphaned VideoAsset behind. The FK from
 * `EventMemoryUpload.videoAssetId` is `onDelete: SetNull`, so guestbook rows survive intact.
 */
export async function deleteVideoAssetAndStorage(asset: VideoAsset): Promise<void> {
  if (asset.multipartUploadId && asset.status === "UPLOADING") {
    await abortMultipartUpload(asset.originalKey, asset.multipartUploadId);
  }
  await deleteVideoObject(asset.originalKey);

  const categorySlug = (asset.category as string).toLowerCase();
  await deleteVideoObjectsByPrefix(`processed/videos/${categorySlug}/${asset.id}/`);

  const localBase = `videos/${categorySlug}/${asset.id}`;
  await deleteUploadFile(`${localBase}/video.mp4`);
  await deleteUploadFile(`${localBase}/poster.jpg`);

  await prisma.videoAsset.delete({ where: { id: asset.id } }).catch(() => {
    // Already gone (idempotent double-delete) — nothing left to do.
  });
}
