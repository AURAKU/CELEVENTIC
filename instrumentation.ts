export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runStartupChecks } = await import("@/lib/startup/init");
    await runStartupChecks();

    // Registers in-process job handlers (video processing, inspiration, campaigns) so that
    // any code path running inside the Next.js server process can call queue.processJobs()
    // directly. The dedicated worker (scripts/video-jobs-worker.ts) re-registers these in its
    // own process — BackgroundJob handlers live in an in-memory map and don't cross processes.
    const { registerAllJobHandlers } = await import("@/lib/job-handlers");
    registerAllJobHandlers();
  }
}
