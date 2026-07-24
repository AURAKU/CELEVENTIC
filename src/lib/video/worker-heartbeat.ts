import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Filesystem heartbeat the standalone `video-jobs-worker` process writes on every tick — and
 * after every individual job it processes (see `src/lib/queue.ts`'s `processJobs`) — so it stays
 * fresh even while the worker is legitimately busy with a single long-running transcode. This is
 * the authoritative "is the worker process actually alive" signal used by the Next.js app
 * (`worker-health.ts` for the admin dashboard, `inline-fallback.ts` for self-healing stuck
 * `QUEUED` videos) to tell "worker isn't running at all" apart from "worker is alive but busy".
 *
 * A pure queue-depth/age signal can't make that distinction: with the default
 * `VIDEO_PROCESSOR_CONCURRENCY=1`, one large upload can legitimately occupy the worker for up to
 * `VIDEO_PROCESSOR_TIMEOUT_MS` while a second, unrelated job's row sits `PENDING` the whole time
 * despite the worker being perfectly healthy — flagging that as "worker down" would be a false
 * positive with real consequences (needlessly failing a video that was always going to finish).
 *
 * Deliberately a plain JSON file, not a DB table: both the Next app and the worker already run
 * on the same single VPS filesystem (the same "single box" assumption
 * `VIDEO_PROCESSOR_CONCURRENCY`'s v1 design already makes), so this needs no schema migration
 * and behaves identically in local dev and production.
 */

const STATE_DIR = process.env.VIDEO_WORKER_HEARTBEAT_DIR
  ? path.resolve(process.env.VIDEO_WORKER_HEARTBEAT_DIR)
  : path.join(process.cwd(), "var", "video-worker");
const HEARTBEAT_PATH = path.join(STATE_DIR, "heartbeat.json");

export interface WorkerHeartbeat {
  pid: number;
  updatedAt: string;
}

/** Best-effort — a filesystem hiccup here must never break actual job processing. */
export async function writeWorkerHeartbeat(): Promise<void> {
  try {
    await mkdir(STATE_DIR, { recursive: true });
    const payload: WorkerHeartbeat = { pid: process.pid, updatedAt: new Date().toISOString() };
    await writeFile(HEARTBEAT_PATH, JSON.stringify(payload));
  } catch {
    /* best-effort — a missed heartbeat write just makes the next liveness check slightly stale */
  }
}

export async function readWorkerHeartbeat(): Promise<WorkerHeartbeat | null> {
  try {
    const raw = await readFile(HEARTBEAT_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<WorkerHeartbeat>;
    if (typeof parsed.pid !== "number" || typeof parsed.updatedAt !== "string") return null;
    return { pid: parsed.pid, updatedAt: parsed.updatedAt };
  } catch {
    return null;
  }
}

const DEFAULT_HEARTBEAT_STALE_MS = 90_000;

function heartbeatStaleThresholdMs(): number {
  const raw = Number(process.env.VIDEO_WORKER_HEARTBEAT_STALE_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_HEARTBEAT_STALE_MS;
}

export interface WorkerLiveness {
  alive: boolean;
  heartbeat: WorkerHeartbeat | null;
  ageMs: number | null;
}

/** Full liveness detail — used by `worker-health.ts` to build a richer admin-facing report. */
export async function getWorkerLiveness(): Promise<WorkerLiveness> {
  const heartbeat = await readWorkerHeartbeat();
  if (!heartbeat) return { alive: false, heartbeat: null, ageMs: null };
  const ageMs = Date.now() - new Date(heartbeat.updatedAt).getTime();
  const alive = Number.isFinite(ageMs) && ageMs >= 0 && ageMs < heartbeatStaleThresholdMs();
  return { alive, heartbeat, ageMs };
}

/** True when we have solid, current evidence the worker process is alive and ticking. */
export async function isWorkerAlive(): Promise<boolean> {
  return (await getWorkerLiveness()).alive;
}
