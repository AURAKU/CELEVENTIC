import { prisma } from "@/lib/prisma";
import { abortMultipartUpload, deleteVideoObject, isVideoStorageReady } from "@/lib/video/s3-video";
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
 */
export async function cleanupAbandonedVideoUploads(batchSize = 50): Promise<{ cancelled: number }> {
  if (!(await isVideoStorageReady())) return { cancelled: 0 };

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
