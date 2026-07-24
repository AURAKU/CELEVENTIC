import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAssetAccess, UploadAuthError } from "@/lib/video/principal";
import { checkUploadRateLimit } from "@/lib/video/quota";
import { queueLocalVideoUpload } from "@/lib/video/processing";
import { serializeVideoAsset } from "@/lib/video/serialize";
import { isFormDataFile } from "@/lib/uploads/form-data-file";

// Node runtime required: reads the multipart body into memory before handing off to the
// background worker (no ffmpeg spawned in this route anymore — see `queueLocalVideoUpload`).
export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Local-disk + VPS FFmpeg fallback for the universal video pipeline. `VideoUploader` posts
 * here directly (instead of a presigned S3 PUT) whenever `/api/uploads/video/presign`
 * reports `strategy: "local"` — i.e. S3 isn't configured/usable on this environment.
 *
 * ASYNC (v2): the whole raw file arrives in this single request, but this route only persists
 * the bytes to disk and queues background processing — it never runs ffmpeg inline. Holding
 * the HTTP connection open for the several minutes a large transcode can take was the direct
 * cause of `Upload error: ECONNRESET` under load (idle-timeout on the client/proxy/server
 * killing the socket mid-transcode). The response now returns `202 Accepted` with the asset
 * in `QUEUED` state as soon as the bytes are safely on disk; the caller polls
 * `GET /api/uploads/video/:id` (already built into `VideoUploader.pollUntilReady`) until the
 * background worker (`video-jobs-worker` / pm2 `celeventic-video-worker`) flips it to
 * READY/FAILED.
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
  // NOTE: deliberately NOT `file instanceof File` — the global `File` class doesn't exist on
  // Node < 20 (Node 18's `undici`-backed `Request.formData()` still parses file parts into a
  // File-like object, but there is no global `File` constructor to check against on that
  // runtime), which crashed every request here with an uncaught `ReferenceError: File is not
  // defined` -> framework-level 500 before this route's own try/catch ever ran. Duck-type
  // instead — every FormData file entry is a Blob-like object with `arrayBuffer()`, regardless
  // of Node version or which `File` implementation (undici vs. Node's own) produced it.
  if (!isFormDataFile(file)) {
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
    const queued = await queueLocalVideoUpload(asset.id, buffer);
    if (queued.status === "FAILED") {
      // Fast, synchronous validation (size/signature/duration) failed before we ever queued
      // anything — safe and correct to report immediately rather than round-tripping through
      // a poll for something we already know the answer to.
      return NextResponse.json({ success: true, data: serializeVideoAsset(queued) }, { status: 200 });
    }
    // 202 Accepted: bytes are safely persisted, transcoding happens in the background.
    return NextResponse.json({ success: true, data: serializeVideoAsset(queued) }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 }
    );
  }
}
