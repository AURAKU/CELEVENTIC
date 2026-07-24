import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { writeWorkerHeartbeat } from "@/lib/video/worker-heartbeat";

export type JobHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, JobHandler>();

export function registerJobHandler(queue: string, handler: JobHandler) {
  handlers.set(queue, handler);
}

export async function dispatchJob(
  queue: string,
  payload: Record<string, unknown>,
  maxAttempts = 3
) {
  return prisma.backgroundJob.create({
    data: {
      queue,
      payload: payload as Prisma.InputJsonValue,
      maxAttempts,
      status: "PENDING",
    },
  });
}

export async function processJobs(queue: string, batchSize = 10) {
  const jobs = await prisma.backgroundJob.findMany({
    where: { queue, status: "PENDING" },
    take: batchSize,
    orderBy: { createdAt: "asc" },
  });

  const handler = handlers.get(queue);
  if (!handler) return { processed: 0 };

  let processed = 0;
  for (const job of jobs) {
    await prisma.backgroundJob.update({
      where: { id: job.id },
      data: { status: "PROCESSING", attempts: { increment: 1 } },
    });

    try {
      await handler(job.payload as Record<string, unknown>);
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: { status: "COMPLETED", processedAt: new Date() },
      });
      processed++;
    } catch (error) {
      const attempts = job.attempts + 1;
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: attempts >= job.maxAttempts ? "FAILED" : "PENDING",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }

    // Fine-grained liveness signal — written after EVERY job (not just once per tick) so it
    // stays fresh even while this call is stuck processing one long-running video (up to
    // VIDEO_PROCESSOR_TIMEOUT_MS). `processJobs` only ever runs inside the standalone worker
    // process (see scripts/video-jobs-worker.ts), so this never fires from the Next.js app.
    await writeWorkerHeartbeat();
  }

  return { processed };
}

const DEFAULT_STALE_JOB_MINUTES = 30;

function staleJobThresholdMs(): number {
  const raw = Number(process.env.JOB_STALE_MINUTES);
  const minutes = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_STALE_JOB_MINUTES;
  return minutes * 60 * 1000;
}

/**
 * Recovers `BackgroundJob` rows stuck in `PROCESSING` — happens when the worker process itself
 * dies mid-handler (OOM kill, `pm2 restart`, VPS reboot, an uncaught exception that bypasses the
 * try/catch in `processJobs` above) after claiming a job but before it could ever reach
 * `COMPLETED`/`FAILED`/back to `PENDING`. Without this sweep, such a row (and whatever it was
 * blocking, e.g. a `VideoAsset` stuck in `PROCESSING`) would sit there forever, since
 * `processJobs` only ever looks at `PENDING` rows.
 *
 * Uses `createdAt` as the staleness clock — `BackgroundJob` has no separate `startedAt` column,
 * and adding one would require a schema migration for a value we can approximate safely: a job
 * is claimed (`PENDING` -> `PROCESSING`) within one worker tick of being created, so `createdAt`
 * lags "actually started" by at most `JOB_WORKER_TICK_MS`. This is only safe under the
 * single-worker-process deployment model this queue assumes (see `scripts/video-jobs-worker.ts`):
 * the worker's tick loop is one sequential `await` chain, so a row can only still be genuinely
 * "in flight" here if THIS call is reached — which, because it always runs after `processJobs`
 * has already settled every job it claimed for the current tick, means any row still
 * `PROCESSING` at this point belongs to a *previous* worker process that crashed before finishing it.
 */
export async function recoverStalledJobs(queue: string, batchSize = 25): Promise<{ requeued: number; failed: number }> {
  const cutoff = new Date(Date.now() - staleJobThresholdMs());
  const stale = await prisma.backgroundJob.findMany({
    where: { queue, status: "PROCESSING", createdAt: { lt: cutoff } },
    take: batchSize,
    orderBy: { createdAt: "asc" },
  });

  let requeued = 0;
  let failed = 0;
  for (const job of stale) {
    if (job.attempts < job.maxAttempts) {
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: { status: "PENDING", error: "Recovered after the worker process appears to have restarted mid-job." },
      });
      requeued++;
    } else {
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          error: "Stuck in PROCESSING past its max attempts — the worker likely crashed repeatedly mid-job.",
        },
      });
      failed++;
    }
  }
  return { requeued, failed };
}
