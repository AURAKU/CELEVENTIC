import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAssetAccess, UploadAuthError } from "@/lib/video/principal";
import { serializeVideoAsset } from "@/lib/video/serialize";
import { deleteVideoAssetAndStorage } from "@/lib/video/cleanup";
import { maybeKickStaleQueuedAsset } from "@/lib/video/inline-fallback";

/**
 * The video status poll route — `VideoUploader`/`MediaUploader` hit this every few seconds while
 * an asset is QUEUED/PROCESSING. Also doubles as the self-healing checkpoint for stuck QUEUED
 * assets (see `maybeKickStaleQueuedAsset`): every poll gives us a free, cheap opportunity to
 * notice "this has been QUEUED a while and the worker heartbeat is gone" and either kick off an
 * inline fallback transcode or fail fast with an actionable reason — without any dedicated cron.
 */
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const url = new URL(req.url);
  const guestToken = url.searchParams.get("guestToken");

  const asset = await prisma.videoAsset.findUnique({ where: { id } });
  if (!asset) return NextResponse.json({ error: "Upload not found." }, { status: 404 });

  try {
    await assertAssetAccess(asset, { guestToken });
  } catch (error) {
    if (error instanceof UploadAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  const current = await maybeKickStaleQueuedAsset(asset);
  return NextResponse.json({ success: true, data: serializeVideoAsset(current) });
}

/**
 * Deletes a video upload outright — the counterpart to `/api/uploads/video/cancel`, which
 * deliberately refuses to touch assets that already reached READY. This is what powers the
 * "Remove" button on a finished video card (`VideoUploader`'s ready state): once a user has
 * uploaded/processed a video and decides not to keep it, this removes both the DB record and
 * its storage (raw + processed derivatives, S3 or local-disk, whichever the environment used).
 * Idempotent and safe to call on any status, including already-cancelled/failed uploads — a
 * missing asset is treated as "already deleted" rather than an error.
 */
export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const url = new URL(req.url);
  const guestToken = url.searchParams.get("guestToken");

  const asset = await prisma.videoAsset.findUnique({ where: { id } });
  if (!asset) return NextResponse.json({ success: true, data: { id, deleted: true } });

  try {
    await assertAssetAccess(asset, { guestToken });
  } catch (error) {
    if (error instanceof UploadAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  await deleteVideoAssetAndStorage(asset);

  return NextResponse.json({ success: true, data: { id: asset.id, deleted: true } });
}
