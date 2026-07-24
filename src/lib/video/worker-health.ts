import { prisma } from "@/lib/prisma";
import { getWorkerLiveness } from "@/lib/video/worker-heartbeat";

/**
 * Answers the single most common video-support question — "is the background worker even
 * running?" — for the admin system-health dashboard. Primary signal is the worker's own
 * filesystem heartbeat (`worker-heartbeat.ts`), which correctly distinguishes "not running" from
 * "running but busy with a previous large video" (a pure queue-depth check cannot make that
 * distinction — see that module's docblock). Queue depth/backlog is still reported as secondary,
 * useful context even when the worker is confirmed alive.
 */

export type VideoWorkerHealthStatus = "healthy" | "warning" | "critical";

export interface VideoWorkerHealth {
  status: VideoWorkerHealthStatus;
  message: string;
  workerAlive: boolean;
  heartbeatAgeMs: number | null;
  pendingJobs: number;
  oldestPendingAgeMs: number | null;
  stuckProcessingAssets: number;
  lastCompletedAt: string | null;
}

const START_HERE =
  "Start it with `npm run jobs:worker` (locally) or, on Hostinger, " +
  '`pm2 start ecosystem.config.js --only celeventic-video-worker` (or ' +
  '`pm2 start "npm run jobs:worker" --name celeventic-video-worker --update-env`), then `pm2 save`.';

export async function getVideoWorkerHealth(): Promise<VideoWorkerHealth> {
  const [liveness, oldestPending, pendingJobs, stuckProcessingAssets, lastCompleted] = await Promise.all([
    getWorkerLiveness(),
    prisma.backgroundJob.findFirst({
      where: { queue: "video-process", status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.backgroundJob.count({ where: { queue: "video-process", status: "PENDING" } }),
    prisma.videoAsset.count({ where: { status: "PROCESSING" } }),
    prisma.backgroundJob.findFirst({
      where: { queue: "video-process", status: "COMPLETED" },
      orderBy: { processedAt: "desc" },
      select: { processedAt: true },
    }),
  ]);

  const oldestPendingAgeMs = oldestPending ? Date.now() - oldestPending.createdAt.getTime() : null;
  const lastCompletedAt = lastCompleted?.processedAt ? lastCompleted.processedAt.toISOString() : null;

  if (!liveness.alive) {
    const hasImpact = pendingJobs > 0 || stuckProcessingAssets > 0;
    return {
      status: hasImpact ? "critical" : "warning",
      message: hasImpact
        ? `No heartbeat from celeventic-video-worker — ${pendingJobs} job(s) queued and ${stuckProcessingAssets} video(s) stuck PROCESSING. ${START_HERE}`
        : `No heartbeat from celeventic-video-worker yet (nothing queued right now, so no user impact so far). ${START_HERE}`,
      workerAlive: false,
      heartbeatAgeMs: liveness.ageMs,
      pendingJobs,
      oldestPendingAgeMs,
      stuckProcessingAssets,
      lastCompletedAt,
    };
  }

  if (pendingJobs > 0) {
    return {
      status: "warning",
      message: `Worker is alive and ticking, but ${pendingJobs} video job(s) are backlogged — normal under heavy load with the default VIDEO_PROCESSOR_CONCURRENCY=1.`,
      workerAlive: true,
      heartbeatAgeMs: liveness.ageMs,
      pendingJobs,
      oldestPendingAgeMs,
      stuckProcessingAssets,
      lastCompletedAt,
    };
  }

  return {
    status: "healthy",
    message: "Video worker is alive and draining the queue normally.",
    workerAlive: true,
    heartbeatAgeMs: liveness.ageMs,
    pendingJobs: 0,
    oldestPendingAgeMs: null,
    stuckProcessingAssets,
    lastCompletedAt,
  };
}
