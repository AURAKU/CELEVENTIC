import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAssetAccess, UploadAuthError } from "@/lib/video/principal";
import { createMultipartUpload, VideoStorageNotConfiguredError } from "@/lib/video/s3-video";
import { EXTENSION_MIME_MAP } from "@/lib/video/constants";
import { computePartPlan } from "@/lib/video/multipart-plan";

export async function POST(req: Request) {
  let body: { assetId?: string; guestToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.assetId) return NextResponse.json({ error: "assetId is required." }, { status: 400 });

  const asset = await prisma.videoAsset.findUnique({ where: { id: body.assetId } });
  if (!asset) return NextResponse.json({ error: "Upload not found." }, { status: 404 });

  try {
    await assertAssetAccess(asset, { guestToken: body.guestToken });
  } catch (error) {
    if (error instanceof UploadAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  if (asset.status !== "UPLOADING") {
    return NextResponse.json({ error: `Upload is already ${asset.status.toLowerCase()}.` }, { status: 409 });
  }

  if (asset.multipartUploadId) {
    // Already initiated (e.g. page refresh mid-upload) — return the existing session so the
    // client can resume instead of orphaning the first multipart upload on S3.
    const { partSize, totalParts } = computePartPlan(Number(asset.sizeBytes));
    return NextResponse.json({
      success: true,
      data: { uploadId: asset.multipartUploadId, partSizeBytes: partSize, totalParts, resumed: true },
    });
  }

  const contentType = EXTENSION_MIME_MAP[asset.originalExtension as keyof typeof EXTENSION_MIME_MAP] ?? "application/octet-stream";
  let uploadId: string;
  try {
    ({ uploadId } = await createMultipartUpload(asset.originalKey, contentType));
  } catch (error) {
    // Defense in depth: this asset was presigned for S3 multipart but S3 stopped being usable
    // (or a stale/local-fallback client called this route directly). Never leak the AWS error.
    if (error instanceof VideoStorageNotConfiguredError) {
      return NextResponse.json(
        { error: "Video storage is not available for this upload session. Please retry the upload." },
        { status: 503 }
      );
    }
    throw error;
  }
  const { partSize, totalParts } = computePartPlan(Number(asset.sizeBytes));

  await prisma.videoAsset.update({
    where: { id: asset.id },
    data: { multipartUploadId: uploadId, partSizeBytes: BigInt(partSize), totalParts },
  });

  return NextResponse.json({
    success: true,
    data: { uploadId, partSizeBytes: partSize, totalParts, resumed: false },
  });
}
