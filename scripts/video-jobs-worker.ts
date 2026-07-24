/**
 * Standalone background worker for the Celeventic job queue — run this as a separate
 * long-lived process on the VPS (pm2/systemd), NOT inside the Next.js server. Next.js only ever
 * *creates* `BackgroundJob` rows (via `dispatchJob`); this process is the only thing that ever
 * *drains* them. If it isn't running, uploads will accept and store fine but every video will
 * sit in `QUEUED` forever — this is the #1 cause of "stuck on processing" reports.
 *
 * It orchestrates: creating MediaConvert jobs and polling their status, draining the
 * lightweight `inspiration-analyze` / `campaign-send` queues, sweeping abandoned multipart
 * uploads, and recovering jobs/videos stuck `PROCESSING` because a previous instance of this
 * very process crashed mid-job (see `recoverStalledJobs` / `recoverStalledVideoProcessing`).
 *
 * IMPORTANT — this process DOES run FFmpeg itself when `VIDEO_PROCESSOR=ffmpeg` (the default
 * whenever AWS MediaConvert isn't configured, i.e. Hostinger production today):
 * `registerAllJobHandlers` wires the `video-process` queue to `processQueuedVideoAsset`, which
 * calls `processQueuedVideoAssetLocalFfmpeg`/`processQueuedVideoAssetWithFfmpeg` — both spawn
 * real `ffmpeg`/`ffprobe` child processes in THIS process (see `src/lib/video/video-processor.ts`).
 * Only the AWS MediaConvert path (`VIDEO_PROCESSOR=mediaconvert`) is transcode-free here — it
 * just submits/polls a remote job.
 *
 * Usage:
 *   npm run jobs:worker
 *   # or under pm2 (see docs/ops/VIDEO-UPLOAD-DEPLOYMENT.md for the full runbook):
 *   pm2 start "npm run jobs:worker" --name celeventic-video-worker --update-env
 *   # or, if using the repo's ecosystem.config.js:
 *   pm2 start ecosystem.config.js --only celeventic-video-worker
 */
import { registerAllJobHandlers } from "@/lib/job-handlers";
import { processJobs, recoverStalledJobs } from "@/lib/queue";
import { pollActiveVideoProcessingJobs } from "@/lib/video/processing";
import { cleanupAbandonedVideoUploads, recoverStalledVideoProcessing } from "@/lib/video/cleanup";
import { writeWorkerHeartbeat } from "@/lib/video/worker-heartbeat";

const QUEUES = ["video-process", "inspiration-analyze", "campaign-send"] as const;
const TICK_MS = Number(process.env.JOB_WORKER_TICK_MS) || 15_000;
const CLEANUP_EVERY_N_TICKS = 20; // ~5 minutes at the default 15s tick

let stopping = false;
let tick = 0;

async function runOnce() {
  // Written FIRST, before touching any queue — guarantees a fresh heartbeat every tick even
  // when there's nothing to process (idle ticks), which is the common case. The per-job write
  // inside processJobs() (see src/lib/queue.ts) covers the other case: this tick busy with one
  // long-running video.
  await writeWorkerHeartbeat();

  for (const queue of QUEUES) {
    try {
      const { processed } = await processJobs(queue, 10);
      if (processed > 0) {
        // eslint-disable-next-line no-console
        console.log(`[jobs-worker] ${queue}: processed ${processed} job(s)`);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`[jobs-worker] ${queue}: batch failed`, error);
    }

    // Recovers jobs left stuck in PROCESSING by a *previous* worker process that crashed
    // mid-handler — always runs after this queue's processJobs() has settled every job it
    // claimed this tick, so it never races a job this same process is still legitimately running.
    try {
      const { requeued, failed } = await recoverStalledJobs(queue);
      if (requeued > 0 || failed > 0) {
        // eslint-disable-next-line no-console
        console.log(`[jobs-worker] ${queue}: recovered stale jobs — requeued=${requeued} failed=${failed}`);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`[jobs-worker] ${queue}: stale-job recovery failed`, error);
    }
  }

  // VideoAsset-level stale-PROCESSING recovery (see recoverStalledVideoProcessing docblock) —
  // this is what actually gets a video OUT of a stuck "Preparing your video…" spinner.
  try {
    const { requeued, failed } = await recoverStalledVideoProcessing();
    if (requeued > 0 || failed > 0) {
      // eslint-disable-next-line no-console
      console.log(`[jobs-worker] recovered stalled video processing — requeued=${requeued} failed=${failed}`);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[jobs-worker] stalled-video recovery failed", error);
  }

  try {
    const result = await pollActiveVideoProcessingJobs();
    if (result.checked > 0) {
      // eslint-disable-next-line no-console
      console.log(
        `[jobs-worker] video status poll: checked=${result.checked} completed=${result.completed} failed=${result.failed}`
      );
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[jobs-worker] video status poll failed", error);
  }

  tick++;
  if (tick % CLEANUP_EVERY_N_TICKS === 0) {
    try {
      const { cancelled } = await cleanupAbandonedVideoUploads();
      if (cancelled > 0) {
        // eslint-disable-next-line no-console
        console.log(`[jobs-worker] cleaned up ${cancelled} abandoned upload(s)`);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[jobs-worker] abandoned upload cleanup failed", error);
    }
  }
}

async function main() {
  registerAllJobHandlers();
  // eslint-disable-next-line no-console
  console.log(`[jobs-worker] started — tick every ${TICK_MS}ms, queues: ${QUEUES.join(", ")}`);

  process.on("SIGTERM", () => (stopping = true));
  process.on("SIGINT", () => (stopping = true));

  while (!stopping) {
    await runOnce();
    await new Promise((resolve) => setTimeout(resolve, TICK_MS));
  }
  // eslint-disable-next-line no-console
  console.log("[jobs-worker] stopped");
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("[jobs-worker] fatal error", error);
  process.exit(1);
});
