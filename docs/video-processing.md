# Video processing — VPS FFmpeg (invitations + universal pipeline bridge)

## Why this exists

`src/app/api/invitations/upload/route.ts` accepted MOV/HEVC/etc. video uploads but returned
the **original, unconverted** file URL. Browsers that can't decode HEVC/Dolby Vision (most
non-Safari browsers, and even Safari for some Dolby Vision profiles) then fail to play the
invitation's hero/background video on the live site.

Production (Hostinger VPS) has no AWS MediaConvert configured. Invitation / local uploads
transcode via the **adaptive TypeScript FFmpeg path** in `src/lib/video/video-processor.ts`
(capability detection + HDR only when `zscale`+`tonemap` are available + plain scale fallback).
An optional VPS converter at `/usr/local/bin/celeventic-process-video` may exist on the box,
but it is **opt-in only** (`VIDEO_USE_EXTERNAL_CONVERTER=true`) — Hostinger should rely on
adaptive ffmpeg by default so a binary that hard-requires `zscale` cannot fail uploads.

## Architecture

```
Browser (MediaUploader)
  │  multipart/form-data POST
  ▼
POST /api/invitations/upload  (src/app/api/invitations/upload/route.ts)
  │  1. sniff real container from bytes (never trust extension/MIME)
  │  2. queue → processQueuedVideoAssetLocalFfmpeg → processVideoFile(buffer)
  │       a. adaptive ffprobe+ffmpeg (DEFAULT — capability detect + HDR fallback)
  │       b. optional /usr/local/bin/celeventic-process-video ONLY if
  │          VIDEO_USE_EXTERNAL_CONVERTER=true (any failure falls through to a)
  │       c. always produces: MP4 (H.264/AAC/yuv420p/faststart, ≤1080p,   │ src/lib/video/
  │          correct orientation, HDR→SDR when zscale available) + poster │ video-processor.ts
  │  3. store original (private, `invitations/<userId>/originals/`)      ─┘
  │     + processed MP4 + poster (`invitations/<userId>/`) via
  │     storeUploadFile() — local disk or S3, whichever is configured
  ▼
data.url = playbackUrl (processed MP4)   ← never the raw upload
data.video = { playbackUrl, posterUrl, thumbnailUrl, originalUrl, status, ... }
```

The same engine (`src/lib/video/video-processor.ts`) also backs the **universal** S3+MediaConvert
pipeline (`src/lib/video/processing.ts`) when `VIDEO_PROCESSOR=ffmpeg` — see below.

## Output contract (always, regardless of which engine ran)

- **Container/codec**: MP4, H.264 (`profile: main`), AAC audio (or silent via `-an` if the
  source has no audio track) — this is what every modern browser can play natively.
- **Pixel format**: `yuv420p` (the only format guaranteed compatible everywhere).
- **Fast start**: `+faststart` — the `moov` atom is relocated to the front so playback (and
  byte-range seeking) can start before the whole file downloads.
- **Resolution**: capped at 1920×1080 on the long edge, **never upscaled** past the source
  (`force_original_aspect_ratio=decrease`), with a **portrait/landscape-aware** bounding box
  (`computeScaleBounds` in `video-processor.ts`) — a naive `min(1920,iw):min(1080,ih)` box alone
  would squeeze a 1080×1920 phone clip into a 1080×1080 square instead of preserving its native
  portrait resolution; the box is swapped to `1080×1920` (accounting for `-autorotate`'s effect
  on the *effective*, post-rotation orientation) whenever the source is portrait.
- **Orientation**: baked into the pixels via ffmpeg's `-autorotate` (applies the container's
  display-matrix/rotate-tag rotation during transcode — phone-shot portrait video plays upright
  everywhere, not just in players that respect the metadata tag). No second `transpose`/`rotate`
  filter is ever added on top, which would double-rotate the frame.
- **HDR/Dolby Vision → SDR**: `buildVideoFilter()` in `video-processor.ts` is the single source of
  truth for this decision (three pipelines: `sdr`, `hdr-tonemap`, `hdr-fallback`). When `ffprobe`
  reports a PQ (`smpte2084`) or HLG (`arib-std-b67`) transfer function **and** the running ffmpeg
  registers both `zscale` and `tonemap`, a `zscale`/`tonemap`/`zscale` filter chain (`hdr-tonemap`)
  tone-maps to SDR BT.709 before encoding. If either filter is missing (`hdr-fallback`), we use
  the plain scale/format pipeline instead (no `zscale`/`tonemap`/`gbrpf32le` at all) and stamp
  explicit BT.709 color metadata (`-color_primaries/-color_trc/-colorspace bt709`) on the output
  so players never guess a stale HDR tag — the upload still succeeds (readable everywhere, just
  not tone-mapped) rather than failing solely because an optional filter is unavailable. If the
  `hdr-tonemap` graph is attempted but fails unexpectedly at **runtime** (e.g. a build with a
  broken/partial `libzimg`), the incomplete output file is removed and the transcode retries
  exactly once with the `hdr-fallback` pipeline (logged via `console.warn` for `pm2 logs`
  visibility) instead of failing the whole upload.
- **Poster**: one JPEG frame (~10% into the clip, capped at 3s), scaled to ≤1280px wide.
- **Preflight validation**: `ffprobe` output is checked for an actual decodable video stream
  before any transcode is attempted (never trust a probe blindly), and HEVC sources are checked
  against `ffmpeg-capabilities.ts`'s `hasHevcDecoder` so a build with no HEVC decoder fails fast
  with a clear message instead of dying deep inside an opaque ffmpeg decode error.

### Fast path: remux instead of re-encode

If `ffprobe` reports the source is *already* H.264/AAC/yuv420p/≤1080p/unrotated/SDR, we skip
the expensive re-encode and just do `-c copy -movflags +faststart` (fast — just relocates
`moov`). Anything else (HEVC, WebM/VP9, AVI, MKV, HDR, rotated, oversized, etc.) gets a full
transcode.

## Where it's used

| Path | File | Sync/Async | Engine selection |
|---|---|---|---|
| Invitations builder upload | `src/app/api/invitations/upload/route.ts` → `createAndQueueLocalVideoAsset` | **Async (v2)** — `202 Accepted`, `BackgroundJob` queue + `npm run jobs:worker` | Always `processVideoFile` in `video-processor.ts` (adaptive ffmpeg by default) |
| Universal S3 pipeline (Studio 2.0 hero/background/gallery, vendor portfolio, guestbook, event shorts) | `src/lib/video/processing.ts` → `processQueuedVideoAsset` | Async (`BackgroundJob` queue + `npm run jobs:worker`) | `VIDEO_PROCESSOR` env — `ffmpeg` (default when MediaConvert isn't configured) or `mediaconvert` |
| Universal pipeline, **local-disk fallback** (used automatically when S3 isn't configured/usable) | `src/app/api/uploads/video/local/route.ts` → `queueLocalVideoUpload` in `src/lib/video/processing.ts` | **Async (v2)** — same `202` + queue/worker pattern as above (ECONNRESET fix) | Always `processVideoFile` in `video-processor.ts` (adaptive ffmpeg by default) |

The invitations route and the local-fallback route both funnel through the exact same
`processQueuedVideoAssetLocalFfmpeg` → `processVideoFile` call chain in the background worker —
there is only ever one place (`buildVideoFilter` in `video-processor.ts`) that decides the FFmpeg
filter graph, so there's nothing to keep in sync between the two entry points.

All three paths produce the same `VideoAsset`-shaped output contract (`processedMp4Url`,
`posterUrl`, `thumbnailUrl`, `status`), so `VideoUploader`/`VideoPlayer` on the client don't
need to know which engine (or storage backend) ran. `src/lib/video/storage-strategy.ts` is the
single decision point for "does this upload go to S3 or local disk?" — see
`docs/ops/VIDEO-UPLOAD-DEPLOYMENT.md` for the operational picture.

## Environment variables

See `.env.example` for the full annotated list. Key ones:

```
VIDEO_PROCESSOR=ffmpeg                 # or "mediaconvert" — blank auto-detects
# VIDEO_USE_EXTERNAL_CONVERTER=true    # OFF by default — Hostinger should use adaptive ffmpeg
# CELEVENTIC_VIDEO_CONVERTER_PATH=/usr/local/bin/celeventic-process-video
# FFMPEG_PATH=/usr/bin/ffmpeg          # override if not on PATH
# FFPROBE_PATH=/usr/bin/ffprobe
VIDEO_PROCESSOR_TIMEOUT_MS=900000      # 15 min hard kill per ffmpeg/converter run
VIDEO_PROCESSOR_CONCURRENCY=1          # v1 limitation — see below
```

## v1 limitations (documented per spec — synchronous + concurrency=1)

1. **Synchronous invitations upload.** The `/api/invitations/upload` request blocks until
   transcoding finishes (bounded by `VIDEO_PROCESSOR_TIMEOUT_MS`). This is the fastest path to
   a correct fix and matches how the route already worked (client waits for a JSON response
   with the final URL). For a typical phone clip (<60s, <150MB) on a modern VPS core, a
   `veryfast` x264 transcode is usually well under a minute. **Upgrade path**: switch this
   route to the same `UPLOADING → QUEUED → PROCESSING → READY/FAILED` async pattern already
   used by `src/lib/video/processing.ts` (dispatch a `BackgroundJob`, return immediately with
   `status: "PROCESSING"`, have the client poll or subscribe) if upload volume/size grows.
2. **Concurrency = 1 by default.** `VIDEO_PROCESSOR_CONCURRENCY` bounds how many ffmpeg/converter
   processes run at once *process-wide* (a `Semaphore` in `video-processor.ts`), so concurrent
   invitation uploads queue rather than fight over CPU. Raise only after load-testing the VPS
   instance size — each concurrent 1080p x264 `veryfast` encode is CPU-intensive.
3. **No HLS/ABR in the FFmpeg bridge path** (`processQueuedVideoAssetWithFfmpeg`). MediaConvert
   produces an HLS ladder for longer videos; the FFmpeg bridge produces a single progressive MP4
   only. `VideoPlayer` already falls back to progressive MP4 when no `hlsSrc` is provided, so
   playback still works — just without adaptive bitrate switching.
4. **External converter is opt-in, not presence-based.**
   `/usr/local/bin/celeventic-process-video` may exist on Hostinger, but it is only attempted
   when `VIDEO_USE_EXTERNAL_CONVERTER=true|1|yes`. Default is the adaptive TypeScript
   `ffprobe`+`ffmpeg` path (capability detection + HDR fallback). When opted in, this
   implementation calls
   `celeventic-process-video --input <in> --output <out.mp4> --poster <poster.jpg> --max-width 1920 --max-height 1080`
   and treats **any** failure (non-zero exit, missing/empty/partial output, wrong flags,
   timeout, zscale missing) as "unavailable": partial artifacts are cleared and processing
   always falls through to adaptive ffmpeg — so playback correctness never depends on that
   binary's exact CLI surface or filter graph. Leave the opt-in unset on Hostinger unless the
   binary has been verified to work on that host's ffmpeg build.

## Deployment (VPS)

```bash
cd /var/www/CELEVENTIC     # or your deploy path
git fetch origin
git checkout feature/universal-video-upload-hevc   # or main, once merged
git pull

npm install
npx prisma generate
# No new Prisma models/columns were required for this fix (invitation media already lives in
# the InvitationDesignConfig JSON, not a DB table) — `prisma db push` is a no-op for this change
# specifically, but still safe/additive if you're also deploying the broader universal-video
# branch's VideoAsset model for the first time.
npx prisma db push

rm -rf .next
npm run build

# Verify ffmpeg/ffprobe are present (adaptive path — required on Hostinger):
which ffmpeg ffprobe
# Optional binary is ignored unless VIDEO_USE_EXTERNAL_CONVERTER=true:
# which /usr/local/bin/celeventic-process-video

pm2 restart celeventic --update-env
# If also deploying the universal pipeline's async worker:
pm2 restart celeventic-jobs-worker --update-env || pm2 start "npm run jobs:worker" --name celeventic-jobs-worker --update-env
pm2 save
```

**Hostinger note:** keep `VIDEO_USE_EXTERNAL_CONVERTER` unset/false so invitation upload →
queue → `processQueuedVideoAssetLocalFfmpeg` → `processVideoFile` always hits adaptive ffmpeg
(capability detection + zscale-safe HDR fallback). Do not enable the external binary unless it
has been verified not to hard-fail on missing `zscale`.

**Do not run `pm2 restart all`** — restart only `celeventic` (and `celeventic-jobs-worker` if
present); leave any other apps on the box (e.g. Spark & Drive) untouched.

### Smoke test after deploy

1. Upload an iPhone HEVC `.MOV` (ideally an HDR/Dolby Vision clip) through the invitation
   builder's media uploader.
2. Confirm the JSON response's `data.url` ends in `.mp4` and `data.video.status === "READY"`.
3. Open the invitation preview/guest link and confirm the hero video plays in Chrome, Safari
   desktop, and iPhone Safari, with correct (non-rotated) orientation and normal (non-washed-out)
   color.
4. Confirm a plain `.mp4` (already H.264) and a `.webm` upload still work (remux/transcode
   fast paths).
5. Confirm image and PDF uploads through the same route are unaffected (no video processing is
   invoked for non-video `mediaType`).

## Rollback

- **Code**: `git revert` the commit(s) on this branch, or redeploy the previous build. The
  route change is backward compatible — no schema change, no removed fields; older clients
  reading `data.url` get the exact same shape they always did (just now a working MP4 instead
  of a broken HEVC/MOV URL).
- **Disable processing without a revert**: there's no dedicated kill-switch for the invitations
  route specifically (unlike the universal pipeline's `VIDEO_PROCESSING_ENABLED`), because
  serving a broken video is never an acceptable fallback. If ffmpeg/ffprobe are somehow removed
  from the VPS, uploads will fail loudly with a 503 ("couldn't process this video") rather than
  silently degrading — install ffmpeg (`apt install -y ffmpeg`) to restore the feature.
- **Universal pipeline**: set `VIDEO_PROCESSOR=mediaconvert` (and configure
  `AWS_MEDIACONVERT_ROLE_ARN` etc.) to switch the async S3 pipeline back to AWS MediaConvert
  without any code changes.

## Testing

```bash
npm run test:video   # includes src/lib/video/__tests__/video-processor.test.ts + backfill-utils.test.ts
npm run build
```

`video-processor.test.ts` covers: ffprobe JSON parsing (duration/codec/rotation/HDR
detection), the remux-vs-transcode decision, ffmpeg argument construction (H.264/AAC/yuv420p/
faststart/no-shell-injection), the HDR tonemap filter chain, poster-frame timestamp selection,
external-converter path resolution, and the concurrency semaphore. `backfill-utils.test.ts`
covers the backfill CLI's pure logic (candidate-file filtering, URL-variant generation, JSON
deep-replace, manifest idempotency). These are pure-function tests — they do not require
ffmpeg/ffprobe to be installed and run in CI without any video tooling present.

A full manual end-to-end smoke test of the backfill CLI (real ffmpeg, synthetic HEVC/rotated/
corrupt fixtures, a sandboxed SQLite copy) was also run — see "Backfilling pre-existing videos"
below for the exact repro. It caught and fixed two real ffmpeg-version-specific bugs (see git
history): `-autorotate 1` is misparsed as a stray output argument on ffmpeg 7.x/8.x (must be
passed as a bare flag), and Prisma's `$queryRawUnsafe` auto-deserializes `Json`-typed SQLite
columns into objects (the backfill script's JSON-field updater must not assume a raw string).

## Backfilling pre-existing videos

Every video uploaded **before** this fix shipped may still be a raw MOV/HEVC/etc. file with its
un-converted URL saved in the database. `scripts/backfill-video-playback.ts` finds and fixes
those, using the exact same `processVideoFile` engine as new uploads.

```bash
# 1. See what would happen — touches nothing (no files written, no DB rows changed):
npm run video:backfill:dry-run

# 2. Convert + fix DB references (safe to interrupt — resumable, idempotent):
npm run video:backfill

# Useful flags (pass after `--`, e.g. `npm run video:backfill -- --limit=20`):
#   --limit=N          process at most N files this run
#   --user-id=<id>      only invitations/<id>/...
#   --resume            required to continue after a run that didn't exit cleanly
#   --rollback=<file>   revert every DB change from a specific rollback-*.json, then exit
```

What it does, safely:
- Scans `public/uploads/invitations/**` (or `UPLOAD_DIR` in production) for known video
  extensions, skipping anything already in a `processed/`/`originals/` directory (its own past
  output) — safe to re-run any time, including on a schedule.
- Converts each candidate with `processVideoFile` (same H.264/AAC/yuv420p/faststart/≤1080p/
  HDR→SDR/orientation contract as live uploads) and publishes the result to
  `invitations/<userId>/processed/<ts>-<uuid>-playback.mp4` (+ `-poster.jpg` + `-thumbnail.jpg`)
  via the same `storeUploadFile` helper live uploads use (local disk or S3, whichever is active).
- **Never touches or deletes the original file.**
- Rewrites every database reference it can find — `InvitationMedia.url`,
  `InvitationGalleryItem.url`, `InvitationOrder.previewUrl`/`previewVideoUrl`, and every string
  occurrence inside the `designConfig`/`sections`/`galleryUrls`/`inspirationAssets`/
  `fulfilledAddons` JSON columns on `Invitation`/`InvitationOrder` — using exact-URL and
  embedded-substring matching (handles both `/api/uploads/...`-relative and absolute URLs).
- Takes a timestamped backup of the SQLite database file (skipped automatically for non-SQLite
  `DATABASE_URL`s — back those up with your normal tooling first) into
  `var/video-backfill/backups/` before the first write of a run.
- Writes a resumable manifest (`var/video-backfill/manifest.json`, one entry per source file) and
  an append-only audit log (`var/video-backfill/audit-<runId>.jsonl`) after every file — a killed
  process picks up exactly where it left off on the next run.
- Writes a rollback manifest (`var/video-backfill/rollback-<runId>.json`) for every DB mutation
  made that run; `--rollback=<file>` replays it in reverse to restore the exact prior values.
- Corrupt/undecodable files are marked `FAILED` in the manifest (with the ffmpeg/ffprobe error)
  and skipped — they never crash the run or block the remaining files.

Run on Hostinger production after `git pull` + `npm install` + `npm run build`, from the app
directory (`/var/www/CELEVENTIC`):

```bash
npm run video:backfill:dry-run   # review first
npm run video:backfill           # then actually convert
```
