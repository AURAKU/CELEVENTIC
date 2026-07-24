import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * Regression coverage for the exact reported bug: the UI repeats "Video is taking longer than
 * expected to process…" forever because `celeventic-video-worker` isn't draining the queue.
 * `maybeKickStaleQueuedAsset` (src/lib/video/inline-fallback.ts) is the self-healing fix — this
 * exercises all four branches against the real dev database:
 *
 *   1. Worker confirmed alive (fresh heartbeat)              -> asset left untouched, no matter how stale.
 *   2. Not stale enough yet (just queued)                    -> asset left untouched, no matter the worker state.
 *   3. Worker confirmed dead + small/medium file              -> fire-and-forget inline kick (asset leaves QUEUED).
 *   4. Worker confirmed dead + oversized file                 -> immediate FAILED with an actionable reason.
 */

let testUserId: string;
let heartbeatDir: string;

before(async () => {
  heartbeatDir = await mkdtemp(path.join(os.tmpdir(), "celeventic-heartbeat-test-"));
  process.env.VIDEO_WORKER_HEARTBEAT_DIR = heartbeatDir;
  process.env.VIDEO_INLINE_FALLBACK_AFTER_MS = "0"; // any past queuedAt counts as "stale enough" for these tests

  const { prisma } = await import("../../../prisma");
  const user = await prisma.user.create({
    data: { name: "Inline Fallback Test User", email: `inline-fallback-test-${randomUUID()}@example.test` },
  });
  testUserId = user.id;
});

after(async () => {
  const { prisma } = await import("../../../prisma");
  await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  await prisma.$disconnect();
  await rm(heartbeatDir, { recursive: true, force: true }).catch(() => {});
  delete process.env.VIDEO_WORKER_HEARTBEAT_DIR;
  delete process.env.VIDEO_INLINE_FALLBACK_AFTER_MS;
  delete process.env.VIDEO_INLINE_FALLBACK_MAX_MB;
});

// Fresh heartbeat dir before every test so "worker alive" vs "worker dead" is deterministic.
beforeEach(async () => {
  await rm(heartbeatDir, { recursive: true, force: true }).catch(() => {});
});

async function writeFreshHeartbeat() {
  const { mkdir } = await import("node:fs/promises");
  await mkdir(heartbeatDir, { recursive: true });
  await writeFile(path.join(heartbeatDir, "heartbeat.json"), JSON.stringify({ pid: 1234, updatedAt: new Date().toISOString() }));
}

function minutesAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 1000);
}

async function createQueuedAsset(overrides: Partial<Record<string, unknown>> = {}) {
  const { prisma } = await import("../../../prisma");
  const id = randomUUID();
  return prisma.videoAsset.create({
    data: {
      id,
      category: "PREMIUM",
      status: "QUEUED",
      ownerType: "USER",
      ownerId: testUserId,
      originalKey: `raw/premium/test-owner/${id}.mp4`,
      originalFilename: "clip.mp4",
      originalMimeType: "video/mp4",
      originalExtension: "mp4",
      sizeBytes: BigInt(1024),
      queuedAt: minutesAgo(5),
      context: { originalStorage: "local" },
      ...overrides,
    },
  });
}

async function cleanupAsset(id: string) {
  const { prisma } = await import("../../../prisma");
  await prisma.backgroundJob.deleteMany({ where: { queue: "video-process" } }).catch(() => {});
  await prisma.videoAsset.delete({ where: { id } }).catch(() => {});
}

describe("maybeKickStaleQueuedAsset", () => {
  it("leaves the asset alone when the worker heartbeat is fresh (alive, just legitimately busy)", async () => {
    await writeFreshHeartbeat();
    const { maybeKickStaleQueuedAsset } = await import("../../inline-fallback");
    const asset = await createQueuedAsset();
    try {
      const result = await maybeKickStaleQueuedAsset(asset);
      assert.equal(result.status, "QUEUED", "a video-worker confirmed alive must never be second-guessed by the inline fallback");
    } finally {
      await cleanupAsset(asset.id);
    }
  });

  it("leaves the asset alone when it hasn't been QUEUED long enough yet, even if the worker looks dead", async () => {
    process.env.VIDEO_INLINE_FALLBACK_AFTER_MS = "600000"; // 10 minutes — this test's asset was queued 5s ago
    const { maybeKickStaleQueuedAsset } = await import("../../inline-fallback");
    const asset = await createQueuedAsset({ queuedAt: new Date() });
    try {
      const result = await maybeKickStaleQueuedAsset(asset);
      assert.equal(result.status, "QUEUED");
    } finally {
      await cleanupAsset(asset.id);
      process.env.VIDEO_INLINE_FALLBACK_AFTER_MS = "0";
    }
  });

  it("kicks off inline processing (asset leaves QUEUED) for a small/medium file once the worker is confirmed dead and stale enough", async () => {
    // No heartbeat file exists (beforeEach wiped the dir) — worker is "confirmed dead".
    const { maybeKickStaleQueuedAsset } = await import("../../inline-fallback");
    const { prisma } = await import("../../../prisma");
    const asset = await createQueuedAsset({ sizeBytes: BigInt(1024) }); // well under the 200MB default cap
    try {
      const result = await maybeKickStaleQueuedAsset(asset);
      // Fire-and-forget: THIS call's return value is still the pre-kick (QUEUED) asset...
      assert.equal(result.status, "QUEUED");

      // ...but the kicked processQueuedVideoAsset() call must actually be running: poll briefly
      // for the DB row to leave QUEUED (it will fail fast here since no real file backs this
      // originalKey — the point is proving the kick fired at all, not a full successful transcode).
      let reloaded = await prisma.videoAsset.findUniqueOrThrow({ where: { id: asset.id } });
      const deadline = Date.now() + 5000;
      while (reloaded.status === "QUEUED" && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 50));
        reloaded = await prisma.videoAsset.findUniqueOrThrow({ where: { id: asset.id } });
      }
      assert.notEqual(reloaded.status, "QUEUED", "inline fallback must actually invoke processing, not leave the asset stuck");
    } finally {
      await cleanupAsset(asset.id);
    }
  });

  it("marks an oversized file FAILED immediately (actionable message) once the worker is confirmed dead, instead of leaving it stuck", async () => {
    process.env.VIDEO_INLINE_FALLBACK_MAX_MB = "1"; // 1MB cap for this test
    const { maybeKickStaleQueuedAsset } = await import("../../inline-fallback");
    const asset = await createQueuedAsset({ sizeBytes: BigInt(5 * 1024 * 1024) }); // 5MB > 1MB cap
    try {
      const result = await maybeKickStaleQueuedAsset(asset);
      assert.equal(result.status, "FAILED");
      assert.ok(result.failureReason);
      assert.match(result.failureReason!, /worker/i);
    } finally {
      await cleanupAsset(asset.id);
      delete process.env.VIDEO_INLINE_FALLBACK_MAX_MB;
    }
  });

  it("does nothing when disabled via VIDEO_INLINE_FALLBACK_ENABLED=false", async () => {
    process.env.VIDEO_INLINE_FALLBACK_ENABLED = "false";
    const { maybeKickStaleQueuedAsset } = await import("../../inline-fallback");
    const asset = await createQueuedAsset();
    try {
      const result = await maybeKickStaleQueuedAsset(asset);
      assert.equal(result.status, "QUEUED");
    } finally {
      await cleanupAsset(asset.id);
      delete process.env.VIDEO_INLINE_FALLBACK_ENABLED;
    }
  });
});
