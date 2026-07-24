import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAssetAccess, UploadAuthError } from "@/lib/video/principal";
import { checkUploadRateLimit } from "@/lib/video/quota";
import { processLocalVideoUpload } from "@/lib/video/processing";
import { serializeVideoAsset } from "@/lib/video/serialize";

// Node runtime required: video processing shells out to ffmpeg via node:child_process.
// maxDuration is a no-op on self-hosted (pm2/systemd) — real bound is
// VIDEO_PROCESSOR_TIMEOUT_MS in src/lib/video/video-processor.ts — but set generously here
// in case this is ever deployed behind a platform that enforces one.
export const runtime = "nodejs";
export const maxDuration = 900;

/**
 * Local-disk + VPS FFmpeg fallback for the universal video pipeline. `VideoUploader` posts
 * here directly (instead of a presigned S3 PUT) whenever `/api/uploads/video/presign`
 * reports `strategy: "local"` — i.e. S3 isn't configured/usable on this environment. The
 * whole raw file arrives in this single request; the response already carries the final
 * READY/FAILED asset (processing is synchronous), so the client never needs to poll.
 */
export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }

  const assetIdField = formData.get("assetId");
  const guestTokenField = formData.get("guestToken");
  const file = formData.get("file");

  if (typeof assetIdField !== "string" || !assetIdField) {
    return NextResponse.json({ error: "assetId is required." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A video file is required." }, { status: 400 });
  }
  const guestToken = typeof guestTokenField === "string" ? guestTokenField : null;

  const asset = await prisma.videoAsset.findUnique({ where: { id: assetIdField } });
  if (!asset) return NextResponse.json({ error: "Upload not found." }, { status: 404 });

  try {
    await assertAssetAccess(asset, { guestToken });
  } catch (error) {
    if (error instanceof UploadAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  // Idempotency guard — matches the S3 `/complete` route contract: a duplicate call on an
  // already-finalized asset just returns current state instead of redoing work.
  if (asset.status !== "UPLOADING") {
    return NextResponse.json({ success: true, data: serializeVideoAsset(asset), alreadyFinalized: true });
  }

  const rate = await checkUploadRateLimit("complete", asset.ownerId ?? asset.id);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const finalized = await processLocalVideoUpload(asset.id, buffer);
    if (finalized.status === "FAILED") {
      return NextResponse.json({ success: true, data: serializeVideoAsset(finalized) }, { status: 200 });
    }
    return NextResponse.json({ success: true, data: serializeVideoAsset(finalized) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 }
    );
  }
}
