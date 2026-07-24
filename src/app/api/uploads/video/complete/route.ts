import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAssetAccess, UploadAuthError } from "@/lib/video/principal";
import { checkUploadRateLimit } from "@/lib/video/quota";
import { finalizeVideoUpload } from "@/lib/video/processing";
import { serializeVideoAsset } from "@/lib/video/serialize";

interface CompleteRequestBody {
  assetId?: string;
  guestToken?: string;
}

/** Finalizes a single-PUT (non-multipart, small file) upload after the browser's direct S3 PUT succeeds. */
export async function POST(req: Request) {
  let body: CompleteRequestBody;
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

  // Idempotency guard — duplicate finalize calls just return current state, never redo work.
  if (asset.status !== "UPLOADING") {
    return NextResponse.json({ success: true, data: serializeVideoAsset(asset), alreadyFinalized: true });
  }

  const rate = await checkUploadRateLimit("complete", asset.ownerId ?? asset.id);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
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
