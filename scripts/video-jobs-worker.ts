/**
 * Standalone background worker for the Celeventic job queue — run this as a separate
 * long-lived process on the VPS (pm2/systemd), NOT inside the Next.js server.
 *
 * It only orchestrates: creating MediaConvert jobs and polling their status, draining the
 * lightweight `inspiration-analyze` / `campaign-send` queues, and sweeping abandoned
 * multipart uploads. It never receives large payloads or does FFmpeg-heavy work itself —
 * all real transcoding happens in AWS Elemental MediaConvert.
 *
 * Usage:
 *   npm run jobs:worker
 *   # or under pm2:
 *   pm2 start "npm run jobs:worker" --name celeventic-jobs-worker
 */
import { registerAllJobHandlers } from "@/lib/job-handlers";
import { processJobs } from "@/lib/queue";
import { pollActiveVideoProcessingJobs } from "@/lib/video/processing";
import { cleanupAbandonedVideoUploads } from "@/lib/video/cleanup";

const QUEUES = ["video-process", "inspiration-analyze", "campaign-send"] as const;
const TICK_MS = Number(process.env.JOB_WORKER_TICK_MS) || 15_000;
const CLEANUP_EVERY_N_TICKS = 20; // ~5 minutes at the default 15s tick

let stopping = false;
let tick = 0;

async function runOnce() {
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
