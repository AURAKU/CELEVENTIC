import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { VIDEO_PROCESS_QUEUE } from "@/lib/video/queues";
import { prisma } from "@/lib/prisma";

/**
 * Runtime Prisma regression: media-health must count via `queue`, never obsolete `type`.
 * JobStatus enum is PENDING | PROCESSING | COMPLETED | FAILED (no RUNNING).
 */

const MARKER = `media-health-test-${Date.now()}`;

async function cleanup() {
  await prisma.backgroundJob.deleteMany({
    where: {
      payload: { path: "$.marker", equals: MARKER },
    },
  }).catch(async () => {
    // SQLite JSON path support varies — fall back to queue wipe of test payloads.
    const rows = await prisma.backgroundJob.findMany({
      where: { queue: { in: [VIDEO_PROCESS_QUEUE, "other-queue"] } },
      select: { id: true, payload: true },
    });
    const ids = rows
      .filter((r) => {
        const p = r.payload as { marker?: string } | null;
        return p?.marker === MARKER;
      })
      .map((r) => r.id);
    if (ids.length) {
      await prisma.backgroundJob.deleteMany({ where: { id: { in: ids } } });
    }
  });
}

before(async () => {
  await cleanup();
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("media-health BackgroundJob queue counting", () => {
  it("counts PENDING and PROCESSING video-process jobs; excludes completed and other queues", async () => {
    await prisma.backgroundJob.createMany({
      data: [
        {
          queue: VIDEO_PROCESS_QUEUE,
          payload: { marker: MARKER, assetId: "a1" },
          status: "PENDING",
        },
        {
          queue: VIDEO_PROCESS_QUEUE,
          payload: { marker: MARKER, assetId: "a2" },
          status: "PROCESSING",
        },
        {
          queue: VIDEO_PROCESS_QUEUE,
          payload: { marker: MARKER, assetId: "a3" },
          status: "COMPLETED",
          processedAt: new Date(),
        },
        {
          queue: "other-queue",
          payload: { marker: MARKER },
          status: "PENDING",
        },
      ],
    });

    const pendingJobs = await prisma.backgroundJob.count({
      where: {
        queue: VIDEO_PROCESS_QUEUE,
        status: { in: ["PENDING", "PROCESSING"] },
        payload: { path: "$.marker", equals: MARKER },
      },
    }).catch(async () => {
      // Fallback without JSON path filter — count by loading marker rows.
      const rows = await prisma.backgroundJob.findMany({
        where: {
          queue: VIDEO_PROCESS_QUEUE,
          status: { in: ["PENDING", "PROCESSING"] },
        },
        select: { payload: true },
      });
      return rows.filter((r) => (r.payload as { marker?: string })?.marker === MARKER)
        .length;
    });

    assert.equal(pendingJobs, 2);

    // Obsolete `type` filter must fail validation — proves the production bug shape.
    await assert.rejects(
      () =>
        prisma.backgroundJob.count({
          // @ts-expect-error intentional obsolete field — must not compile/query
          where: { type: "video-process" },
        }),
      /Unknown argument `type`|type/
    );
  });

  it("getMediaPipelineHealth does not throw on the canonical queue query", async () => {
    const { getMediaPipelineHealth } = await import("@/lib/media/media-health");
    const health = await getMediaPipelineHealth();
    assert.ok(["healthy", "warning", "critical"].includes(health.status));
    assert.equal(typeof health.queue.pendingJobs, "number");
    assert.ok(health.queue.pendingJobs >= 0);
  });
});
