import { prisma } from "@/lib/prisma";
import { dispatchJob } from "@/lib/queue";
import { isWorkerAlive } from "@/lib/video/worker-heartbeat";

/**
 * Shared inline queue drain for when the standalone `jobs:worker` process is
 * offline. Used by guest-import generation, delivery, and general-pass minting.
 *
 * Deliberately does NOT call `processJobs` — that writes the video-worker
 * heartbeat and would falsely report the worker as alive.
 */

const TRUTHY = /^(1|true|yes|on)$/i;
const STALE_PROCESSING_MS = 90_000;

export function inlineKickEnabled(envKey: string, defaultEnabled = true): boolean {
  const raw = process.env[envKey]?.trim();
  if (!raw) return defaultEnabled;
  return TRUTHY.test(raw);
}

function payloadBatchId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const id = (payload as { batchId?: unknown }).batchId;
  return typeof id === "string" && id.length > 0 ? id : null;
}

async function findOpenJob(queue: string, batchId: string) {
  const jobs = await prisma.backgroundJob.findMany({
    where: { queue, status: { in: ["PENDING", "PROCESSING"] } },
    orderBy: { createdAt: "asc" },
    take: 80,
  });
  return jobs.find((job) => payloadBatchId(job.payload) === batchId) ?? null;
}

async function reclaimStaleProcessing(queue: string, batchId: string, reason: string) {
  const cutoff = new Date(Date.now() - STALE_PROCESSING_MS);
  const jobs = await prisma.backgroundJob.findMany({
    where: { queue, status: "PROCESSING", createdAt: { lt: cutoff } },
    take: 40,
  });
  for (const job of jobs) {
    if (payloadBatchId(job.payload) !== batchId) continue;
    await prisma.backgroundJob.update({
      where: { id: job.id },
      data: { status: "PENDING", error: reason },
    });
  }
}

async function claimPendingJob(queue: string, batchId: string, reclaimReason: string) {
  await reclaimStaleProcessing(queue, batchId, reclaimReason);

  let job = await findOpenJob(queue, batchId);
  if (!job) {
    await dispatchJob(queue, { batchId }, 5);
    job = await findOpenJob(queue, batchId);
  }
  if (!job || job.status !== "PENDING") return null;

  const claimed = await prisma.backgroundJob.updateMany({
    where: { id: job.id, status: "PENDING" },
    data: { status: "PROCESSING", attempts: { increment: 1 } },
  });
  if (claimed.count === 0) return null;
  return job;
}

export interface InlineQueueKickOptions {
  queue: string;
  batchId: string;
  envKey: string;
  inFlight: Set<string>;
  /** Return false to skip (finished / wrong status). */
  shouldRun: () => Promise<boolean>;
  run: (batchId: string) => Promise<void>;
  logLabel: string;
  reclaimReason?: string;
}

/**
 * Fire-and-forget: claim the batch's PENDING job and run the handler in-process
 * when the dedicated worker isn't alive.
 */
export async function maybeKickQueueJob(opts: InlineQueueKickOptions): Promise<void> {
  if (!inlineKickEnabled(opts.envKey) || opts.inFlight.has(opts.batchId)) return;
  if (!(await opts.shouldRun())) return;
  if (await isWorkerAlive()) return;

  const reclaimReason =
    opts.reclaimReason ?? `Recovered after inline ${opts.logLabel} stalled mid-job.`;

  opts.inFlight.add(opts.batchId);
  void (async () => {
    const job = await claimPendingJob(opts.queue, opts.batchId, reclaimReason);
    if (!job) return;

    try {
      await opts.run(opts.batchId);
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: { status: "COMPLETED", processedAt: new Date(), error: null },
      });
    } catch (error) {
      const attempts = job.attempts + 1;
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: attempts >= job.maxAttempts ? "FAILED" : "PENDING",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
      throw error;
    }
  })()
    .catch((error) => {
      console.error(`[${opts.logLabel}-inline] drain failed for ${opts.batchId}:`, error);
    })
    .finally(() => {
      opts.inFlight.delete(opts.batchId);
    });
}
