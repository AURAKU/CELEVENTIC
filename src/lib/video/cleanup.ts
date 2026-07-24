import { prisma } from "@/lib/prisma";
import { abortMultipartUpload, deleteVideoObject } from "@/lib/video/s3-video";
import { DEFAULT_ABANDONED_UPLOAD_HOURS } from "@/lib/video/constants";

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
