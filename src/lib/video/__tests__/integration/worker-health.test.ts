import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * Regression coverage for the admin-visible "is the video worker even running?" health check
 * (src/lib/video/worker-health.ts, surfaced on /admin via src/lib/startup/system-health.ts).
 * This is what should catch — before a customer does — the exact failure mode in the mission:
 * `celeventic-video-worker` not running on Hostinger, leaving jobs PENDING forever. It's driven
 * primarily by the worker's filesystem heartbeat (see worker-heartbeat.ts), not just queue depth,
 * so a worker that's simply busy with one large video is never mistaken for "not running".
 */

let heartbeatDir: string;

async function clearVideoProcessQueue() {
  const { prisma } = await import("../../../prisma");
  await prisma.backgroundJob.deleteMany({ where: { queue: "video-process" } });
}

async function writeFreshHeartbeat() {
  await mkdir(heartbeatDir, { recursive: true });
  await writeFile(path.join(heartbeatDir, "heartbeat.json"), JSON.stringify({ pid: 1234, updatedAt: new Date().toISOString() }));
}

before(async () => {
  heartbeatDir = await mkdtemp(path.join(os.tmpdir(), "celeventic-worker-health-test-"));
  process.env.VIDEO_WORKER_HEARTBEAT_DIR = heartbeatDir;
});

beforeEach(async () => {
  await clearVideoProcessQueue();
  await rm(heartbeatDir, { recursive: true, force: true }).catch(() => {});
});

after(async () => {
  await clearVideoProcessQueue();
  const { prisma } = await import("../../../prisma");
  await prisma.$disconnect();
  await rm(heartbeatDir, { recursive: true, force: true }).catch(() => {});
  delete process.env.VIDEO_WORKER_HEARTBEAT_DIR;
});

describe("getVideoWorkerHealth", () => {
  it("reports healthy when the worker heartbeat is fresh and the video-process queue is empty", async () => {
    await writeFreshHeartbeat();
    const { getVideoWorkerHealth } = await import("../../worker-health");
    const health = await getVideoWorkerHealth();
    assert.equal(health.status, "healthy");
    assert.equal(health.workerAlive, true);
    assert.equal(health.pendingJobs, 0);
  });

  it("reports warning (not critical) when the worker is alive but backlogged", async () => {
    await writeFreshHeartbeat();
    const { prisma } = await import("../../../prisma");
    await prisma.backgroundJob.create({
      data: { queue: "video-process", payload: { assetId: "does-not-matter" }, status: "PENDING" },
    });

    const { getVideoWorkerHealth } = await import("../../worker-health");
    const health = await getVideoWorkerHealth();
    assert.equal(health.status, "warning");
    assert.equal(health.workerAlive, true);
    assert.equal(health.pendingJobs, 1);
  });

  it("reports critical when there's no heartbeat AND jobs are actually stuck — the real 'worker isn't running' case", async () => {
    // No heartbeat written this test — worker is "confirmed dead".
    const { prisma } = await import("../../../prisma");
    await prisma.backgroundJob.create({
      data: { queue: "video-process", payload: { assetId: "does-not-matter" }, status: "PENDING" },
    });

    const { getVideoWorkerHealth } = await import("../../worker-health");
    const health = await getVideoWorkerHealth();
    assert.equal(health.status, "critical");
    assert.equal(health.workerAlive, false);
    assert.ok(health.message.toLowerCase().includes("worker"));
    assert.equal(health.pendingJobs, 1);
  });

  it("reports warning (not critical) when there's no heartbeat but nothing is actually queued yet — no user impact", async () => {
    // No heartbeat, no jobs — e.g. a brand-new deploy where the worker has simply never started yet.
    const { getVideoWorkerHealth } = await import("../../worker-health");
    const health = await getVideoWorkerHealth();
    assert.equal(health.status, "warning");
    assert.equal(health.workerAlive, false);
    assert.equal(health.pendingJobs, 0);
  });
});
