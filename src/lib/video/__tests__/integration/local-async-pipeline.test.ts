import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * End-to-end regression coverage for the ECONNRESET fix: a video upload must never run ffmpeg
 * inline on the request thread. This exercises the real state machine against the local (dev)
 * database and a throwaway local-disk upload root:
 *
 *   UPLOADING -> queueLocalVideoUpload() -> QUEUED (fast, no ffmpeg call)
 *             -> processQueuedVideoAssetLocalFfmpeg() [background worker, ffmpeg mocked]
 *             -> READY, with `processedMp4Url` set
 *
 * The mocked `transcode` function stands in for the real ffmpeg pipeline (mission spec:
 * "mock worker OK") — everything else (DB writes, disk I/O, status transitions, the queue
 * dispatch row) is real.
 */

const TEST_UPLOAD_ROOT_PARENT = path.join(os.tmpdir(), "celeventic-video-pipeline-test-");
let uploadRoot: string;
let testUserId: string;

before(async () => {
  uploadRoot = await mkdtemp(TEST_UPLOAD_ROOT_PARENT);
  process.env.UPLOAD_DIR = uploadRoot;

  // `VideoAsset.ownerId` has a real FK to `User` — create a throwaway owner for these tests.
  const { prisma } = await import("../../../prisma");
  const user = await prisma.user.create({
    data: { name: "Video Pipeline Test User", email: `video-pipeline-test-${randomUUID()}@example.test` },
  });
  testUserId = user.id;
});

after(async () => {
  const { prisma } = await import("../../../prisma");
  await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  await prisma.$disconnect();
  await rm(uploadRoot, { recursive: true, force: true }).catch(() => {});
  delete process.env.UPLOAD_DIR;
});

/** Minimal-but-valid MP4 header: `ftyp` box with an `isom` brand — passes `sniffVideoContainer`/`validateVideoSignature`. */
function fakeMp4Buffer(sizeBytes = 4096): Buffer {
  const buf = Buffer.alloc(sizeBytes);
  buf.writeUInt32BE(0x18, 0);
  buf.write("ftyp", 4, "latin1");
  buf.write("isom", 8, "latin1");
  return buf;
}

async function createUploadingAsset(overrides: Partial<Record<string, unknown>> = {}) {
  const { prisma } = await import("../../../prisma");
  const id = randomUUID();
  return prisma.videoAsset.create({
    data: {
      id,
      category: "PREMIUM",
      status: "UPLOADING",
      ownerType: "USER",
      ownerId: testUserId,
      originalKey: `raw/premium/test-owner/${id}.mp4`,
      originalFilename: "clip.mp4",
      originalMimeType: "video/mp4",
      originalExtension: "mp4",
      sizeBytes: BigInt(0),
      ...overrides,
    },
  });
}

async function cleanupAsset(id: string) {
  const { prisma } = await import("../../../prisma");
  await prisma.backgroundJob.deleteMany({ where: { queue: "video-process" } }).catch(() => {});
  await prisma.videoAsset.delete({ where: { id } }).catch(() => {});
}

describe("local async video pipeline (202 + background worker, no inline ffmpeg)", () => {
  it("queueLocalVideoUpload persists bytes + flips to QUEUED without ever invoking ffmpeg", async () => {
    const { queueLocalVideoUpload } = await import("../../processing");
    const { readUploadFile } = await import("../../../uploads/file-storage");
    const { prisma } = await import("../../../prisma");

    const asset = await createUploadingAsset();
    try {
      const buffer = fakeMp4Buffer(8192);
      const queued = await queueLocalVideoUpload(asset.id, buffer);

      assert.equal(queued.status, "QUEUED", "asset must be QUEUED immediately — never PROCESSING/READY inline");
      assert.equal(Number(queued.sizeBytes), buffer.length);
      assert.equal(queued.detectedContainer, "mp4");

      // The raw bytes must already be safely on disk before the HTTP response would return.
      const persisted = await readUploadFile(queued.originalKey);
      assert.ok(persisted, "original bytes must be persisted to local storage");
      assert.equal(persisted!.length, buffer.length);
      assert.ok(persisted!.equals(buffer));

      // A background job must have been dispatched for the worker to pick up later.
      const jobs = await prisma.backgroundJob.findMany({ where: { queue: "video-process" } });
      const job = jobs.find((j) => (j.payload as { assetId?: string })?.assetId === asset.id);
      assert.ok(job, "video-process job must be dispatched for the worker to pick up");
      assert.equal(job!.status, "PENDING");

      // Tagged so the dispatcher routes this asset to the local-disk ffmpeg branch, not S3.
      const context = queued.context as Record<string, unknown> | null;
      assert.equal(context?.originalStorage, "local");
    } finally {
      await cleanupAsset(asset.id);
    }
  });

  it("processQueuedVideoAssetLocalFfmpeg (worker, ffmpeg mocked) takes a QUEUED asset to READY with a working playbackUrl", async () => {
    const { queueLocalVideoUpload, processQueuedVideoAssetLocalFfmpeg } = await import("../../processing");
    const { serializeVideoAsset } = await import("../../serialize");

    const asset = await createUploadingAsset();
    try {
      const queued = await queueLocalVideoUpload(asset.id, fakeMp4Buffer());

      const fakeTranscode = async () => ({
        success: true as const,
        method: "ffmpeg-transcode" as const,
        outputBuffer: Buffer.from("fake-transcoded-mp4-bytes"),
        posterBuffer: Buffer.from("fake-poster-jpeg-bytes"),
        metadata: {
          durationSeconds: 12.5,
          width: 1280,
          height: 720,
          hadHevc: false,
          hadHdr: false,
          hasAudio: true,
        },
      });

      const ready = await processQueuedVideoAssetLocalFfmpeg(queued, { transcode: fakeTranscode });

      assert.equal(ready.status, "READY");
      assert.ok(ready.processedMp4Url, "processedMp4Url must be set once READY");
      assert.ok(ready.processedMp4Url!.includes("videos/premium/"));
      assert.equal(ready.durationSeconds, 12.5);
      assert.equal(ready.width, 1280);
      assert.equal(ready.height, 720);
      assert.ok(ready.posterUrl);
      assert.ok(ready.readyAt);

      // This is exactly the shape `GET /api/uploads/video/:id` (the poll endpoint) returns —
      // simulating what `VideoUploader.pollUntilReady` / `MediaUploader`'s poller consume.
      const polled = serializeVideoAsset(ready);
      assert.equal(polled.status, "READY");
      assert.equal(polled.processedMp4Url, ready.processedMp4Url);
    } finally {
      await cleanupAsset(asset.id);
    }
  });

  it("processQueuedVideoAssetLocalFfmpeg marks FAILED (not stuck) when the transcode fails", async () => {
    const { queueLocalVideoUpload, processQueuedVideoAssetLocalFfmpeg } = await import("../../processing");

    const asset = await createUploadingAsset();
    try {
      const queued = await queueLocalVideoUpload(asset.id, fakeMp4Buffer());
      const failingTranscode = async () => ({
        success: false as const,
        method: "none" as const,
        outputBuffer: null,
        posterBuffer: null,
        metadata: { durationSeconds: null, width: null, height: null, hadHevc: false, hadHdr: false, hasAudio: false },
        error: "simulated ffmpeg failure",
      });

      const failed = await processQueuedVideoAssetLocalFfmpeg(queued, { transcode: failingTranscode });
      assert.equal(failed.status, "FAILED");
      assert.equal(failed.failureReason, "simulated ffmpeg failure");
    } finally {
      await cleanupAsset(asset.id);
    }
  });

  it("queueLocalVideoUpload rejects (fails fast, never queues) a file that isn't a real video", async () => {
    const { queueLocalVideoUpload } = await import("../../processing");
    const { prisma } = await import("../../../prisma");

    const asset = await createUploadingAsset();
    try {
      const notAVideo = Buffer.from("<!doctype html><html>not a video</html>");
      const result = await queueLocalVideoUpload(asset.id, notAVideo);

      assert.equal(result.status, "FAILED");
      assert.ok(result.failureReason);

      const jobs = await prisma.backgroundJob.findMany({ where: { queue: "video-process" } });
      assert.equal(
        jobs.find((j) => (j.payload as { assetId?: string })?.assetId === asset.id),
        undefined,
        "no job should ever be dispatched for a synchronously-rejected upload"
      );
    } finally {
      await cleanupAsset(asset.id);
    }
  });
});
