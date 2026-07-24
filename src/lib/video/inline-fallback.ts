import { prisma } from "@/lib/prisma";
import type { VideoAsset } from "@prisma/client";
import { isWorkerAlive } from "@/lib/video/worker-heartbeat";
import { processQueuedVideoAsset } from "@/lib/video/processing";

/**
 * Self-healing fallback for a `VideoAsset` stuck `QUEUED` because the standalone
 * `celeventic-video-worker` process isn't actually running — the #1 real-world cause of the
 * frontend's "Video is taking longer than expected…" message repeating forever. Called from the
 * video status poll route (`GET /api/uploads/video/:id`) on every request, so it self-heals the
 * very next time a client (already polling every few seconds) checks in — no separate cron/kick
 * endpoint needed, and it costs nothing extra when the real worker IS running (the heartbeat
 * check below short-circuits immediately in that case).
 *
 * Deliberately gated on `isWorkerAlive()` (a heartbeat, not queue depth/age) so a worker that's
 * simply busy with a previous large video — completely healthy, just backlogged — is never
 * mistaken for "down" and never gets a redundant/wasteful inline kick or a wrongful FAILED.
 *
 * Two outcomes once the worker is confirmed not running and the asset has waited past
 * `VIDEO_INLINE_FALLBACK_AFTER_MS`:
 *   - Small/medium files (<= `VIDEO_INLINE_FALLBACK_MAX_MB`): transcodes right here, in the
 *     Next.js server process, fire-and-forget. This NEVER blocks the calling request/response —
 *     it is kicked from an already-completed status-poll request, not an upload request, so it
 *     cannot reintroduce the `ECONNRESET` regression the async-202 rework (queueLocalVideoUpload)
 *     fixed by moving ffmpeg off the upload request thread in the first place.
 *   - Larger files (too much CPU/memory to safely run on the web server process): marks the
 *     asset `FAILED` with an honest, actionable reason instead of leaving the user staring at a
 *     vague timeout message with no path to resolution.
 */

const TRUTHY = /^(1|true|yes|on)$/i;
const DEFAULT_ENABLED = true;
const DEFAULT_AFTER_MS = 45_000; // within the "~30–60s" window the mission calls for
const DEFAULT_MAX_INLINE_MB = 200; // "small/medium" — matches the invitation-background category default

function isEnabled(): boolean {
  const raw = process.env.VIDEO_INLINE_FALLBACK_ENABLED?.trim();
  if (!raw) return DEFAULT_ENABLED;
  return TRUTHY.test(raw);
}

function afterMs(): number {
  const raw = Number(process.env.VIDEO_INLINE_FALLBACK_AFTER_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_AFTER_MS;
}

function maxInlineBytes(): number {
  const raw = Number(process.env.VIDEO_INLINE_FALLBACK_MAX_MB);
  const mb = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_INLINE_MB;
  return mb * 1024 * 1024;
}

/**
 * In-process guard only — prevents this SAME Next.js server process from starting a second
 * inline transcode for an asset that's already running one (two polls a few seconds apart,
 * both landing before the first kick has flipped status away from QUEUED). Cross-process
 * duplication (e.g. a PM2 cluster with >1 instance) is still bounded by `processQueuedVideoAsset`
 * itself only ever acting on an asset whose status is currently QUEUED — the same idempotency
 * guard that already protects every other call site of this function.
 */
const inFlight = new Set<string>();

export async function maybeKickStaleQueuedAsset(asset: VideoAsset): Promise<VideoAsset> {
  if (asset.status !== "QUEUED" || !isEnabled()) return asset;
  if (inFlight.has(asset.id)) return asset;

  const queuedAt = asset.queuedAt ?? asset.createdAt;
  const staleForMs = Date.now() - queuedAt.getTime();
  if (staleForMs < afterMs()) return asset;

  if (await isWorkerAlive()) return asset; // worker is alive & ticking — legitimately busy, leave it be.

  const sizeBytes = Number(asset.sizeBytes);
  if (sizeBytes <= maxInlineBytes()) {
    inFlight.add(asset.id);
    void processQueuedVideoAsset(asset.id)
      .catch((error) => {
        console.error(`[inline-fallback] processing failed for asset ${asset.id}:`, error);
      })
      .finally(() => inFlight.delete(asset.id));
    return asset; // still QUEUED as far as THIS response goes — the next poll (a few seconds later) will see PROCESSING/READY.
  }

  return prisma.videoAsset.update({
    where: { id: asset.id },
    data: {
      status: "FAILED",
      failureReason:
        "The video processing worker isn't running on this server, and this file is too large to process as a one-off fallback. " +
        "An administrator needs to start it (see docs/ops/VIDEO-UPLOAD-DEPLOYMENT.md — " +
        "`pm2 start ecosystem.config.js --only celeventic-video-worker`). Your upload was saved — retry once the worker is running again.",
    },
  });
}
