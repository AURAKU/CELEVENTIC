import {
  buildTransformStreamRaceDiagnostics,
  formatTransformStreamRaceStartupWarning,
  isTransformStreamRaceError,
} from "@/lib/runtime/transformstream-race";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const warning = formatTransformStreamRaceStartupWarning();
    if (warning) {
      console.warn(warning);
    }

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

/**
 * Temporary diagnostics for the TransformStream race — never swallows/suppresses.
 * Next.js still logs the original error; we add route/runtime context beside it.
 */
export async function onRequestError(
  err: unknown,
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string | string[] };
  },
  context: {
    routerKind: "Pages Router" | "App Router";
    routePath: string;
    routeType: string;
    renderSource?: string;
  }
) {
  if (!isTransformStreamRaceError(err)) return;

  const diagnostics = buildTransformStreamRaceDiagnostics({
    error: err,
    requestPath: request.path,
    requestMethod: request.method,
    routeName: context.routePath,
    routerKind: context.routerKind,
    routePath: context.routePath,
    routeType: context.routeType,
    renderSource: context.renderSource,
  });

  console.error("[celeventic:transformstream-race]", diagnostics);
}
