import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAssetAccess, UploadAuthError } from "@/lib/video/principal";
import { checkUploadRateLimit } from "@/lib/video/quota";
import { completeMultipartUpload, abortMultipartUpload } from "@/lib/video/s3-video";
import { finalizeVideoUpload } from "@/lib/video/processing";
import { serializeVideoAsset } from "@/lib/video/serialize";

interface CompleteRequestBody {
  assetId?: string;
  guestToken?: string;
  parts?: { partNumber: number; etag: string }[];
}

export async function POST(req: Request) {
  let body: CompleteRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.assetId || !Array.isArray(body.parts) || body.parts.length === 0) {
    return NextResponse.json({ error: "assetId and parts are required." }, { status: 400 });
  }

  const asset = await prisma.videoAsset.findUnique({ where: { id: body.assetId } });
  if (!asset) return NextResponse.json({ error: "Upload not found." }, { status: 404 });

  try {
    await assertAssetAccess(asset, { guestToken: body.guestToken });
  } catch (error) {
    if (error instanceof UploadAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  // Idempotency guard — a duplicate/late complete call (double-click, retried request after a
  // slow response) must not re-run S3 completion or re-queue processing.
  if (asset.status !== "UPLOADING") {
    return NextResponse.json({ success: true, data: serializeVideoAsset(asset), alreadyFinalized: true });
  }
  if (!asset.multipartUploadId) {
    return NextResponse.json({ error: "No active multipart upload for this asset." }, { status: 409 });
  }

  const rate = await checkUploadRateLimit("complete", asset.ownerId ?? asset.id);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  try {
    await completeMultipartUpload(asset.originalKey, asset.multipartUploadId, body.parts);
  } catch (error) {
    await abortMultipartUpload(asset.originalKey, asset.multipartUploadId);
    await prisma.videoAsset.update({
      where: { id: asset.id },
      data: { status: "FAILED", failureReason: "Failed to assemble uploaded parts. Please retry the upload." },
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to complete multipart upload." },
      { status: 502 }
    );
  }

  try {
    const finalized = await finalizeVideoUpload(asset.id);
    return NextResponse.json({ success: true, data: serializeVideoAsset(finalized) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload finalization failed." },
      { status: 500 }
    );
  }
}
