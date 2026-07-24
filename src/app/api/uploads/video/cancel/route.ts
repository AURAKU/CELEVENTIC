import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAssetAccess, UploadAuthError } from "@/lib/video/principal";
import { abortMultipartUpload, deleteVideoObject } from "@/lib/video/s3-video";

async function cancelAsset(assetId: string, guestToken: string | null | undefined) {
  const asset = await prisma.videoAsset.findUnique({ where: { id: assetId } });
  if (!asset) return NextResponse.json({ error: "Upload not found." }, { status: 404 });

  try {
    await assertAssetAccess(asset, { guestToken });
  } catch (error) {
    if (error instanceof UploadAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  // Idempotent: cancelling an already-cancelled/finished upload is a safe no-op.
  if (asset.status === "CANCELLED") {
    return NextResponse.json({ success: true, data: { id: asset.id, status: asset.status } });
  }
  if (asset.status === "READY") {
    return NextResponse.json({ error: "Cannot cancel a video that has already finished processing." }, { status: 409 });
  }

  if (asset.multipartUploadId && asset.status === "UPLOADING") {
    await abortMultipartUpload(asset.originalKey, asset.multipartUploadId);
  }
  await deleteVideoObject(asset.originalKey);

  const updated = await prisma.videoAsset.update({
    where: { id: asset.id },
    data: { status: "CANCELLED", cancelledAt: new Date(), failureReason: "Cancelled by user." },
  });

  return NextResponse.json({ success: true, data: { id: updated.id, status: updated.status } });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  let assetId = url.searchParams.get("assetId");
  let guestToken = url.searchParams.get("guestToken");

  if (!assetId) {
    try {
      const body = await req.json();
      assetId = body.assetId ?? null;
      guestToken = body.guestToken ?? guestToken;
    } catch {
      // no JSON body — fall through to the missing-assetId error below
    }
  }

  if (!assetId) return NextResponse.json({ error: "assetId is required." }, { status: 400 });
  return cancelAsset(assetId, guestToken);
}
