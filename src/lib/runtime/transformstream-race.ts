/**
 * Detection + diagnostics for the Node.js TransformStream cancel/write race:
 *   TypeError: controller[kState].transformAlgorithm is not a function
 *
 * Root cause (verified):
 *   node:internal/webstreams/transformstream → transformStreamDefaultControllerPerformTransform
 *   Race: pending writer.write() after reader.cancel() clears transformAlgorithm.
 *   Triggered in production by Next.js App Router RSC HTML streaming
 *   (next/dist/server/stream-utils/node-web-streams-helper.js) when a client/proxy
 *   aborts mid-response. Digest (e.g. 3225108298) is Next's string-hash of
 *   message+stack — not an app route id.
 *
 * Fixed upstream in Node.js >= 24.15.0 / >= 25.8.1 (nodejs/node#62040).
 * Reproduced locally: Node 20.20.2 and 22.22.1 hit 200/200; Node 24.15.0 hits 0/200.
 *
 * This module never swallows the error — it only classifies, probes, and logs context.
 */

export const TRANSFORMSTREAM_RACE_MESSAGE =
  "controller[kState].transformAlgorithm is not a function";

/** First Node major.minor.patch known to include the upstream guard. */
export const TRANSFORMSTREAM_RACE_FIXED_NODE = "24.15.0";

export type NodeVersionParts = { major: number; minor: number; patch: number };

export function parseNodeVersion(version: string = process.version): NodeVersionParts | null {
  const m = version.trim().replace(/^v/i, "").match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

export function compareNodeVersions(a: NodeVersionParts, b: NodeVersionParts): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

export function nodeHasTransformStreamRaceFix(version: string = process.version): boolean {
  const parsed = parseNodeVersion(version);
  const fixed = parseNodeVersion(TRANSFORMSTREAM_RACE_FIXED_NODE);
  if (!parsed || !fixed) return false;
  // Node 25.8.1+ also fixed; treat any major > 24 as fixed only when >= 25.8.1 or >= 24.15.0.
  if (parsed.major > 24) {
    const fixed25 = parseNodeVersion("25.8.1");
    if (!fixed25) return parsed.major > 25;
    return compareNodeVersions(parsed, fixed25) >= 0;
  }
  return compareNodeVersions(parsed, fixed) >= 0;
}

export function isTransformStreamRaceError(error: unknown): boolean {
  if (!error) return false;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : String((error as { message?: unknown }).message ?? error);
  return message.includes(TRANSFORMSTREAM_RACE_MESSAGE);
}

export function getStreamConstructorNames(): {
  TransformStream: string;
  ReadableStream: string;
  WritableStream: string;
} {
  return {
    TransformStream: globalThis.TransformStream?.name ?? "undefined",
    ReadableStream: globalThis.ReadableStream?.name ?? "undefined",
    WritableStream: globalThis.WritableStream?.name ?? "undefined",
  };
}

export type TransformStreamRaceDiagnostics = {
  kind: "transformstream_race";
  message: string;
  digest?: string;
  routeName?: string;
  requestPath?: string;
  requestMethod?: string;
  mediaUrl?: string;
  runtime: string;
  processVersion: string;
  nodeHasFix: boolean;
  streamConstructors: ReturnType<typeof getStreamConstructorNames>;
  routerKind?: string;
  routePath?: string;
  routeType?: string;
  renderSource?: string;
  stack?: string;
};

function redactPath(path: string | undefined): string | undefined {
  if (!path) return undefined;
  // Keep pathname; redact sensitive query values (never log private tokens).
  const q = path.indexOf("?");
  const pathname = q >= 0 ? path.slice(0, q) : path;
  const query = q >= 0 ? path.slice(q + 1) : "";
  if (!query) return pathname;
  const redactedQuery = query
    .split("&")
    .map((pair) => {
      const eq = pair.indexOf("=");
      const key = eq >= 0 ? pair.slice(0, eq) : pair;
      if (/^(token|guestToken|accessToken|key|secret|password|authorization)$/i.test(key)) {
        return `${key}=[redacted]`;
      }
      return pair;
    })
    .join("&");
  return `${pathname}?${redactedQuery}`;
}

export function buildTransformStreamRaceDiagnostics(input: {
  error: unknown;
  requestPath?: string;
  requestMethod?: string;
  routeName?: string;
  mediaUrl?: string;
  routerKind?: string;
  routePath?: string;
  routeType?: string;
  renderSource?: string;
}): TransformStreamRaceDiagnostics {
  const err = input.error;
  const digest =
    typeof err === "object" && err !== null && "digest" in err
      ? String((err as { digest: unknown }).digest)
      : undefined;
  const stack = err instanceof Error ? err.stack : undefined;
  const mediaUrl = input.mediaUrl
    ? redactPath(input.mediaUrl)
    : input.requestPath && /\/(?:api\/)?uploads\//i.test(input.requestPath)
      ? redactPath(input.requestPath)
      : undefined;

  return {
    kind: "transformstream_race",
    message: TRANSFORMSTREAM_RACE_MESSAGE,
    digest,
    routeName: input.routeName ?? input.routePath,
    requestPath: redactPath(input.requestPath),
    requestMethod: input.requestMethod,
    mediaUrl,
    runtime: process.env.NEXT_RUNTIME ?? "nodejs",
    processVersion: process.version,
    nodeHasFix: nodeHasTransformStreamRaceFix(),
    streamConstructors: getStreamConstructorNames(),
    routerKind: input.routerKind,
    routePath: input.routePath,
    routeType: input.routeType,
    renderSource: input.renderSource,
    stack: stack?.split("\n").slice(0, 12).join("\n"),
  };
}

/**
 * Probe whether the current Node runtime still has the cancel/write race.
 * Safe to run in CI — never patches globals.
 */
export async function probeTransformStreamCancelWriteRace(iterations = 40): Promise<{
  hits: number;
  iterations: number;
  processVersion: string;
  vulnerable: boolean;
}> {
  const { setTimeout } = await import("node:timers/promises");
  let hits = 0;
  for (let i = 0; i < iterations; i++) {
    const stream = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk);
      },
    });
    await setTimeout(0);
    const reader = stream.readable.getReader();
    const writer = stream.writable.getWriter();
    const pendingRead = reader.read();
    await setTimeout(0);
    const pendingCancel = reader.cancel(new Error("probe-cancel"));
    const pendingLateWrite = writer.write(new Uint8Array([1, 2, 3]));
    const results = await Promise.allSettled([pendingRead, pendingCancel, pendingLateWrite]);
    if (results.some((r) => r.status === "rejected" && isTransformStreamRaceError(r.reason))) {
      hits += 1;
    }
  }
  return {
    hits,
    iterations,
    processVersion: process.version,
    vulnerable: hits > 0,
  };
}

export function formatTransformStreamRaceStartupWarning(version: string = process.version): string | null {
  if (nodeHasTransformStreamRaceFix(version)) return null;
  return (
    `[celeventic:transformstream] Node ${version} is vulnerable to ` +
    `"${TRANSFORMSTREAM_RACE_MESSAGE}" (nodejs/node#62036). ` +
    `Next.js RSC streaming can surface this as digest logs when clients abort mid-response. ` +
    `Permanent fix: upgrade to Node >= ${TRANSFORMSTREAM_RACE_FIXED_NODE} (verified 0/200 race hits). ` +
    `See docs/ops/TRANSFORMSTREAM-RACE.md`
  );
}
