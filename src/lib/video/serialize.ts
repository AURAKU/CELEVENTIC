import type { VideoAsset } from "@prisma/client";

/**
 * VideoAsset has BigInt columns (sizeBytes, partSizeBytes) which `JSON.stringify`/`NextResponse.json`
 * cannot serialize directly. This is the single place API routes should use to shape a
 * VideoAsset for a client response — also a good chokepoint to avoid ever leaking internal
 * fields (multipartUploadId, mediaConvertJobId, context) to guest/anonymous callers.
 */
export function serializeVideoAsset(asset: VideoAsset) {
  return {
    id: asset.id,
    category: asset.category,
    status: asset.status,
    progress: asset.progress,
    originalFilename: asset.originalFilename,
    originalMimeType: asset.originalMimeType,
    originalExtension: asset.originalExtension,
    sizeBytes: Number(asset.sizeBytes),
    detectedContainer: asset.detectedContainer,
    detectedVideoCodec: asset.detectedVideoCodec,
    durationSeconds: asset.durationSeconds,
    width: asset.width,
    height: asset.height,
    processedMp4Url: asset.processedMp4Url,
    processedMp4Renditions: asset.processedMp4Renditions,
    hlsUrl: asset.hlsUrl,
    posterUrl: asset.posterUrl,
    thumbnailUrl: asset.thumbnailUrl,
    thumbnailUrls: asset.thumbnailUrls,
    failureReason: asset.failureReason,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    uploadedAt: asset.uploadedAt,
    readyAt: asset.readyAt,
  };
}

export type SerializedVideoAsset = ReturnType<typeof serializeVideoAsset>;
