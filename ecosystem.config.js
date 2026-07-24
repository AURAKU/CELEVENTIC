/**
 * PM2 process definitions for Hostinger (or any VPS) production deployment.
 *
 * Two independent processes, matching the names already used throughout
 * docs/ops/VIDEO-UPLOAD-DEPLOYMENT.md and docs/ops/HOSTINGER-VPS-HEVC-DOLBY-VISION-PROMPT.md:
 *
 *   - "celeventic"             — the Next.js app (accepts uploads, serves the UI/API, CREATES
 *                                 video-process jobs but never drains them).
 *   - "celeventic-video-worker" — scripts/video-jobs-worker.ts (standalone `tsx` process). This
 *                                 is the ONLY thing that drains the BackgroundJob queue and runs
 *                                 FFmpeg. If it isn't running, every video upload will accept
 *                                 fine and then sit in QUEUED forever — see
 *                                 src/lib/video/worker-health.ts / the "Video Processing Worker"
 *                                 tile on /admin (system health) for a live check of this.
 *
 * Usage:
 *   pm2 start ecosystem.config.js            # starts BOTH processes
 *   pm2 start ecosystem.config.js --only celeventic-video-worker   # worker only
 *   pm2 start ecosystem.config.js --only celeventic                # app only
 *   pm2 save
 *
 * IMPORTANT: never run `pm2 restart all` on this box — other, unrelated apps (e.g. Spark & Drive)
 * may be running under the same PM2 daemon. Always target these two process names explicitly:
 *   pm2 restart celeventic --update-env
 *   pm2 restart celeventic-video-worker --update-env
 */
module.exports = {
  apps: [
    {
      name: "celeventic",
      cwd: __dirname,
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: "1G",
      time: true,
    },
    {
      name: "celeventic-video-worker",
      cwd: __dirname,
      script: "npm",
      args: "run jobs:worker",
      env: {
        NODE_ENV: "production",
      },
      // The worker is a lightweight orchestration loop most of the time, but spawns real ffmpeg
      // child processes (see scripts/video-jobs-worker.ts docblock) — give it more headroom than
      // the Next.js app and let PM2 bring it back immediately if it ever crashes mid-transcode.
      // The stale-processing recovery sweep (src/lib/video/cleanup.ts) picks up any job that was
      // in-flight when that happens on the very next tick after restart.
      autorestart: true,
      max_restarts: 20,
      restart_delay: 3000,
      max_memory_restart: "1500M",
      time: true,
    },
  ],
};
