import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

/**
 * Regression coverage for the "stuck on processing forever" root cause: the `video-jobs-worker`
 * process dying mid-transcode (pm2 restart / OOM / VPS reboot) after flipping a `VideoAsset` (and
 * its `BackgroundJob`) to `PROCESSING`, with nothing ever moving it out of that state again.
 *
 *   - `recoverStalledVideoProcessing` (src/lib/video/cleanup.ts) — VideoAsset-level sweep.
 *   - `recoverStalledJobs` (src/lib/queue.ts) — generic BackgroundJob-level sweep.
 *
 * Both are exercised against the real dev database (same pattern as local-async-pipeline.test.ts).
 */

let testUserId: string;

before(async () => {
  const { prisma } = await import("../../../prisma");
  const user = await prisma.user.create({
    data: { name: "Stale Processing Test User", email: `stale-processing-test-${randomUUID()}@example.test` },
  });
  testUserId = user.id;
});

after(async () => {
  const { prisma } = await import("../../../prisma");
  await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  await prisma.$disconnect();
});

function minutesAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 1000);
}

async function createProcessingAsset(overrides: Partial<Record<string, unknown>> = {}) {
  const { prisma } = await import("../../../prisma");
  const id = randomUUID();
  return prisma.videoAsset.create({
    data: {
      id,
      category: "PREMIUM",
      status: "PROCESSING",
      ownerType: "USER",
      ownerId: testUserId,
      originalKey: `raw/premium/test-owner/${id}.mp4`,
      originalFilename: "clip.mp4",
      originalMimeType: "video/mp4",
      originalExtension: "mp4",
      sizeBytes: BigInt(1024),
      processingStartedAt: minutesAgo(30),
      attempts: 1,
      ...overrides,
    },
  });
}

async function cleanupAsset(id: string) {
  const { prisma } = await import("../../../prisma");
  await prisma.backgroundJob.deleteMany({ where: { queue: "video-process" } }).catch(() => {});
  await prisma.videoAsset.delete({ where: { id } }).catch(() => {});
}

describe("recoverStalledVideoProcessing (worker-crash recovery, VideoAsset level)", () => {
  it("requeues a stuck PROCESSING asset back to QUEUED and dispatches a fresh job when under the attempt cap", async () => {
    const { recoverStalledVideoProcessing } = await import("../../cleanup");
    const { prisma } = await import("../../../prisma");

    const asset = await createProcessingAsset({ attempts: 1 });
    try {
      const result = await recoverStalledVideoProcessing();
      assert.ok(result.requeued >= 1, "expected at least one asset to be requeued");

      const reloaded = await prisma.videoAsset.findUniqueOrThrow({ where: { id: asset.id } });
      assert.equal(reloaded.status, "QUEUED", "stuck asset must be reset to QUEUED, not left PROCESSING forever");
      assert.equal(reloaded.processingStartedAt, null);

      const jobs = await prisma.backgroundJob.findMany({ where: { queue: "video-process" } });
      const job = jobs.find((j) => (j.payload as { assetId?: string })?.assetId === asset.id);
      assert.ok(job, "a fresh video-process job must be dispatched so the worker retries this asset");
      assert.equal(job!.status, "PENDING");
    } finally {
      await cleanupAsset(asset.id);
    }
  });

  it("marks a stuck asset FAILED (with a clear reason) once it's past the max attempt cap, instead of retrying forever", async () => {
    const { recoverStalledVideoProcessing } = await import("../../cleanup");
    const { prisma } = await import("../../../prisma");

    const asset = await createProcessingAsset({ attempts: 3 }); // default VIDEO_MAX_PROCESSING_ATTEMPTS is 3
    try {
      const result = await recoverStalledVideoProcessing();
      assert.ok(result.failed >= 1);

      const reloaded = await prisma.videoAsset.findUniqueOrThrow({ where: { id: asset.id } });
      assert.equal(reloaded.status, "FAILED");
      assert.ok(reloaded.failureReason && reloaded.failureReason.length > 0);
      assert.match(reloaded.failureReason!, /timed out|re-upload/i);
    } finally {
      await cleanupAsset(asset.id);
    }
  });

  it("never touches an asset that's still genuinely within its processing budget", async () => {
    const { recoverStalledVideoProcessing } = await import("../../cleanup");
    const { prisma } = await import("../../../prisma");

    const asset = await createProcessingAsset({ processingStartedAt: minutesAgo(1), attempts: 1 });
    try {
      await recoverStalledVideoProcessing();
      const reloaded = await prisma.videoAsset.findUniqueOrThrow({ where: { id: asset.id } });
      assert.equal(reloaded.status, "PROCESSING", "an asset well within its timeout budget must be left alone");
    } finally {
      await cleanupAsset(asset.id);
    }
  });
});

describe("recoverStalledJobs (worker-crash recovery, BackgroundJob level)", () => {
  it("resets a BackgroundJob stuck in PROCESSING back to PENDING when under maxAttempts", async () => {
    const { recoverStalledJobs } = await import("../../../queue");
    const { prisma } = await import("../../../prisma");

    const job = await prisma.backgroundJob.create({
      data: {
        queue: "video-process",
        payload: { assetId: "does-not-matter" },
        status: "PROCESSING",
        attempts: 1,
        maxAttempts: 3,
        createdAt: minutesAgo(45),
      },
    });
    try {
      const result = await recoverStalledJobs("video-process");
      assert.ok(result.requeued >= 1);

      const reloaded = await prisma.backgroundJob.findUniqueOrThrow({ where: { id: job.id } });
      assert.equal(reloaded.status, "PENDING");
    } finally {
      await prisma.backgroundJob.delete({ where: { id: job.id } }).catch(() => {});
    }
  });

  it("marks a BackgroundJob FAILED once it's stuck in PROCESSING past maxAttempts", async () => {
    const { recoverStalledJobs } = await import("../../../queue");
    const { prisma } = await import("../../../prisma");

    const job = await prisma.backgroundJob.create({
      data: {
        queue: "video-process",
        payload: { assetId: "does-not-matter" },
        status: "PROCESSING",
        attempts: 3,
        maxAttempts: 3,
        createdAt: minutesAgo(45),
      },
    });
    try {
      const result = await recoverStalledJobs("video-process");
      assert.ok(result.failed >= 1);

      const reloaded = await prisma.backgroundJob.findUniqueOrThrow({ where: { id: job.id } });
      assert.equal(reloaded.status, "FAILED");
    } finally {
      await prisma.backgroundJob.delete({ where: { id: job.id } }).catch(() => {});
    }
  });

  it("leaves a recently-claimed PROCESSING job alone", async () => {
    const { recoverStalledJobs } = await import("../../../queue");
    const { prisma } = await import("../../../prisma");

    const job = await prisma.backgroundJob.create({
      data: {
        queue: "video-process",
        payload: { assetId: "does-not-matter" },
        status: "PROCESSING",
        attempts: 1,
        maxAttempts: 3,
        createdAt: new Date(),
      },
    });
    try {
      await recoverStalledJobs("video-process");
      const reloaded = await prisma.backgroundJob.findUniqueOrThrow({ where: { id: job.id } });
      assert.equal(reloaded.status, "PROCESSING");
    } finally {
      await prisma.backgroundJob.delete({ where: { id: job.id } }).catch(() => {});
    }
  });
});
