import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAssetAccess, UploadAuthError } from "@/lib/video/principal";
import { checkUploadRateLimit } from "@/lib/video/quota";
import { presignUploadPart, listUploadedParts, VideoStorageNotConfiguredError } from "@/lib/video/s3-video";
import { PRESIGN_EXPIRY_SECONDS } from "@/lib/video/constants";

interface PartRequestBody {
  assetId?: string;
  guestToken?: string;
  /** Omit to just list already-uploaded parts (used to resume after a refresh). */
  partNumber?: number;
}

export async function POST(req: Request) {
  let body: PartRequestBody;
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

  if (asset.status !== "UPLOADING" || !asset.multipartUploadId) {
    return NextResponse.json({ error: "Upload session is not active." }, { status: 409 });
  }

  const rate = await checkUploadRateLimit("part", asset.ownerId ?? asset.id);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  try {
    if (body.partNumber === undefined) {
      const parts = await listUploadedParts(asset.originalKey, asset.multipartUploadId);
      return NextResponse.json({ success: true, data: { parts } });
    }

    if (!Number.isInteger(body.partNumber) || body.partNumber < 1 || body.partNumber > (asset.totalParts ?? 10_000)) {
      return NextResponse.json({ error: "Invalid part number." }, { status: 400 });
    }

    const url = await presignUploadPart(asset.originalKey, asset.multipartUploadId, body.partNumber, PRESIGN_EXPIRY_SECONDS);
    return NextResponse.json({ success: true, data: { url, partNumber: body.partNumber, expiresInSeconds: PRESIGN_EXPIRY_SECONDS } });
  } catch (error) {
    if (error instanceof VideoStorageNotConfiguredError) {
      return NextResponse.json(
        { error: "Video storage is not available for this upload session. Please retry the upload." },
        { status: 503 }
      );
    }
    throw error;
  }
}
