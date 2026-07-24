> ⚠️ **Update (2026-07-24):** production Hostinger does **not** have AWS MediaConvert
> configured. The invitations upload route (`src/app/api/invitations/upload`) and, when
> `VIDEO_PROCESSOR=ffmpeg` (the default when MediaConvert isn't configured), the universal
> pipeline below now transcode via `src/lib/video/video-processor.ts` using the **adaptive
> TypeScript FFmpeg path** (capability detection + HDR fallback). An optional VPS binary
> (`/usr/local/bin/celeventic-process-video`) may exist on the box but is **opt-in only** via
> `VIDEO_USE_EXTERNAL_CONVERTER=true` — leave it unset on Hostinger so missing `zscale` in that
> binary cannot fail uploads. See `docs/video-processing.md` for the current architecture.
> This document remains accurate for anyone who *does* configure AWS MediaConvert
> (`VIDEO_PROCESSOR=mediaconvert`) — both engines share the same `VideoAsset` model and are
> selected via the `VIDEO_PROCESSOR` env var.
>
> ⚠️ **Update (2026-07-24, part 2) — S3-less local fallback:** Hostinger production currently
> has **no AWS S3 credentials at all**, and the presign API used to hard-block every
> `VideoUploader` upload (Studio, memory/guestbook, vendor portfolio, admin) with "Video
> storage is not configured on this environment" once S3 wasn't ready — a dead end for
> otherwise-valid videos. This is now automatic: `/api/uploads/video/presign` detects that S3
> isn't usable (see `src/lib/video/storage-strategy.ts`) and returns `strategy: "local"`
> instead of erroring; `VideoUploader` posts the raw file straight to
> `/api/uploads/video/local`, which stores the result on local disk via
> `src/lib/uploads/file-storage.ts` (served from `/api/uploads/...`, same as the invitations
> upload route). **No env change is required to get this** — it activates automatically
> whenever S3 isn't configured. Set `VIDEO_LOCAL_FALLBACK_ENABLED=false` only if you
> specifically want uploads to hard-fail instead of falling back (not recommended on Hostinger
> today). See `docs/video-processing.md` for the full flow.
>
> ⚠️ **Update (2026-07-24, part 3) — async 202 for both local-FFmpeg upload routes (ECONNRESET
> fix):** `/api/uploads/video/local` and the video branch of `/api/invitations/upload` used to
> run FFmpeg **inline**, holding the HTTP request open for the whole transcode (minutes, for a
> large file) — under load this produced `Upload error: ECONNRESET` when the client/proxy idle
> timeout killed the socket mid-transcode. Both routes now persist the raw upload to disk,
> flip the `VideoAsset` to `QUEUED`, dispatch the same `video-process` `BackgroundJob` the
> S3/MediaConvert pipeline already uses, and respond **`202 Accepted`** immediately — no
> ffmpeg call ever happens on the request thread. `video-jobs-worker`
> (`processQueuedVideoAssetLocalFfmpeg` in `src/lib/video/processing.ts`) picks the job up and
> runs the real transcode in the background, updating the row to `READY`/`FAILED`. Clients
> (`VideoUploader`, `MediaUploader`) poll `GET /api/uploads/video/:id` until it's `READY`, then
> switch to `processedMp4Url`/`playbackUrl`. See `docs/video-processing.md` for the full
> request/poll contract.
>
> ⚠️ **Update (2026-07-24, part 4) — portrait scaling + HDR retry hardening:** `buildVideoFilter()`
> is now the single source of truth for the `-vf` chain (three pipelines: `sdr` / `hdr-tonemap` /
> `hdr-fallback`), with a portrait/landscape-aware scale bounding box (a phone-shot 1080×1920 clip
> no longer gets squeezed into a 1080×1080 box). If the HDR `zscale`/`tonemap` graph is attempted
> but fails at runtime, the partial output is deleted and the transcode retries once with the
> plain fallback pipeline (logged to `pm2 logs`) instead of failing the upload. The (still
> opt-in) external converter's output is now verified with `ffprobe`, not just "file is
> non-empty", before ever being trusted.
>
> ⚠️ **Update (2026-07-24, part 5) — videos stuck on "processing" forever, fixed end-to-end:**
> root cause was almost always **`celeventic-video-worker` not running** (or having crashed
> mid-transcode) — Next.js only ever *creates* `video-process` `BackgroundJob` rows, and that
> worker process is the only thing that ever drains them. Four independent fixes now cover this:
> 1. **Stale-`PROCESSING` recovery** (`recoverStalledVideoProcessing` in `src/lib/video/cleanup.ts`,
>    `recoverStalledJobs` in `src/lib/queue.ts`) — every worker tick resets a `VideoAsset`/`BackgroundJob`
>    stuck `PROCESSING` past a stale threshold (default 20/30 min) back to `QUEUED`/`PENDING` and
>    retries, or marks it `FAILED` with a clear reason past `VIDEO_MAX_PROCESSING_ATTEMPTS`.
> 2. **Worker liveness heartbeat** (`src/lib/video/worker-heartbeat.ts`) — the worker writes a
>    small JSON heartbeat file every tick (and after every job), so the app can tell "worker isn't
>    running" apart from "worker is alive but busy with one large video" — a pure queue-depth
>    check can't make that distinction.
> 3. **In-process inline fallback** (`src/lib/video/inline-fallback.ts`) — wired into the status
>    poll route (`GET /api/uploads/video/:id`), this self-heals a `VideoAsset` stuck `QUEUED`
>    once the heartbeat confirms the worker isn't running: small/medium files (`<= VIDEO_INLINE_FALLBACK_MAX_MB`,
>    default 200MB) are transcoded right there in the Next.js server process, fire-and-forget
>    (never on the upload request thread, so this cannot reintroduce the `ECONNRESET` regression
>    part 3 above fixed); larger files are marked `FAILED` with an actionable "worker not running"
>    message instead of spinning forever. Also self-heals local dev when a developer forgets to
>    run `npm run jobs:worker`.
> 4. **Admin visibility** — `/admin` system health now has a "Video Processing Worker" tile
>    (`src/lib/video/worker-health.ts`) that surfaces heartbeat status, pending-job backlog, and
>    stuck-`PROCESSING` counts, instead of ops having to guess.
>
> Also: `ecosystem.config.js` (repo root) now defines both PM2 processes (`celeventic` +
> `celeventic-video-worker`) so `pm2 start ecosystem.config.js --only celeventic-video-worker`
> reliably starts the worker with the right cwd/restart policy — see "Deployment commands" below.
> Frontend (`src/components/media/video-uploader.tsx`): the "Video is taking longer than expected…"
> timeout is now a soft, resumable state — its Retry button re-polls the same upload instead of
> re-uploading the whole file (which used to risk creating a duplicate asset), and a live elapsed-time
> caption replaces the static "processing" spinner.

# Universal Video Upload & Processing — Deployment Guide

Architecture: **Browser → Celeventic presign API → direct multipart PUT to S3 → upload-complete
API → MediaConvert job → processed outputs in S3 → CloudFront**. The VPS never receives or
transcodes video bytes — it only issues short-lived presigned URLs, tracks metadata in
Postgres/SQLite, and creates/polls MediaConvert jobs (all lightweight AWS API calls).

## What runs where

| Component | Where it runs | What it does |
|---|---|---|
| Next.js app (`npm run start`) | VPS, behind Nginx | Auth, presign APIs, metadata, UI, job *creation* (not execution) |
| `npm run jobs:worker` (`scripts/video-jobs-worker.ts`) | VPS, separate PM2 process | Drains the `BackgroundJob` queue, polls MediaConvert job status, sweeps abandoned uploads |
| AWS Elemental MediaConvert | AWS | All actual transcoding (H.264/AAC MP4, HLS, poster/thumbnail frame capture) |
| S3 (`celeventic-production-media`) | AWS, `eu-west-2` | Raw uploads (private) + processed outputs (served via CloudFront only) |
| CloudFront (`media.celeventic.com`) | AWS | Public delivery of **processed** media only — never serves `uploads/raw/videos/*` |

Nginx/VPS body-size limits are irrelevant to video uploads now — the browser PUTs bytes
directly to S3 with presigned URLs, never through the Next.js request body. No
`client_max_body_size` change is required for this feature (leave existing limits as-is).

## One-time AWS setup

### 1. S3 bucket (`celeventic-production-media`, `eu-west-2`)
- Bucket stays **private** (no public ACLs). Enable default encryption (SSE-S3 or SSE-KMS).
- Lifecycle rule: abort incomplete multipart uploads after 2 days (belt-and-suspenders on top
  of the app-level `VIDEO_ABANDONED_UPLOAD_HOURS` cleanup).
- CORS configuration (required for browser-direct multipart PUT + reading the `ETag` header):

```json
[
  {
    "AllowedOrigins": ["https://www.celeventic.com", "https://celeventic.com", "https://celeventic.org", "https://celeventic.online"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

- Bucket policy: allow CloudFront (via Origin Access Control) to `GetObject` on
  `processed/videos/*`. Do **not** grant public read on `uploads/raw/videos/*` — those stay
  private and are only ever read by the app/MediaConvert via signed requests.

### 2. IAM
- **App IAM user/role** (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` or an EC2/ECS instance
  role): `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:ListMultipartUploadParts`,
  `s3:AbortMultipartUpload`, `s3:CreateMultipartUpload`, `s3:CompleteMultipartUpload` scoped to
  `arn:aws:s3:::celeventic-production-media/*`; plus `mediaconvert:CreateJob`,
  `mediaconvert:GetJob`, `mediaconvert:DescribeEndpoints`.
- **MediaConvert service role** (`AWS_MEDIACONVERT_ROLE_ARN`): trust policy allowing
  `mediaconvert.amazonaws.com` to assume it; permissions policy granting `s3:GetObject` on
  `uploads/raw/videos/*` and `s3:PutObject`/`s3:GetObject` on `processed/videos/*` in the bucket.

### 3. MediaConvert
- Note the account's MediaConvert endpoint (Console → MediaConvert → Account) and set
  `AWS_MEDIACONVERT_ENDPOINT`, or leave blank to let the app auto-discover it via
  `DescribeEndpoints` on first use (cached in-process afterward).
- Optional: create a dedicated queue for predictable throughput and set
  `AWS_MEDIACONVERT_QUEUE_ARN`; otherwise jobs use the account's default queue.

### 4. CloudFront
- Distribution origin: the S3 bucket (via Origin Access Control, not a public bucket).
- Alternate domain name: `media.celeventic.com` (+ ACM certificate in `us-east-1`).
- Cache behavior for `processed/videos/*`: cache based on full path, respect origin
  `Cache-Control` (the app already sets `public, max-age=31536000, immutable` on writes).
- Restrict `uploads/raw/videos/*` from ever being cached/served publicly (no behavior needed —
  it's private in S3 and CloudFront only has access to what its OAC policy grants).

### 5. S3 → SQS (optional, documented alternative trigger)
The app currently triggers processing via an in-app `BackgroundJob` row created in the
`/complete` and `/multipart/complete` API routes (see `src/lib/video/processing.ts`). If you'd
rather decouple triggering from the API request entirely, configure:

- S3 Event Notification on `uploads/raw/videos/*` (`s3:ObjectCreated:*`) → SQS queue.
- A small Lambda (or the existing worker, adapted to long-poll SQS) that reads the S3 key from
  the event, looks up the matching `VideoAsset` by `originalKey`, and calls
  `processQueuedVideoAsset()`. This is a drop-in replacement for the `video-process`
  `BackgroundJob` dispatch — not required for correctness today, but removes the (small) window
  where a request could crash between S3 upload-complete and job dispatch.

## Environment variables

Copy from `.env.example` — **never commit real secrets**. New variables for this feature:

```
AWS_REGION=eu-west-2
AWS_S3_BUCKET=celeventic-production-media
AWS_CLOUDFRONT_DOMAIN=https://media.celeventic.com
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_MEDIACONVERT_ROLE_ARN=arn:aws:iam::<account>:role/CeleventicMediaConvertRole
AWS_MEDIACONVERT_ENDPOINT=            # optional — auto-discovered if blank
AWS_MEDIACONVERT_QUEUE_ARN=           # optional — defaults to account Default queue
MEDIA_STORAGE_PROVIDER=s3             # gates the new pipeline on/off
VIDEO_PROCESSING_ENABLED=true
VIDEO_MAX_SIZE_MB=                    # optional global fallback
VIDEO_EVENT_SHORT_MAX_SIZE_MB=250
VIDEO_INVITATION_BG_MAX_SIZE_MB=150
VIDEO_VENDOR_PORTFOLIO_MAX_SIZE_MB=500
VIDEO_GUESTBOOK_MAX_SIZE_MB=300
VIDEO_PREMIUM_MAX_SIZE_MB=2048
VIDEO_ADMIN_MAX_SIZE_MB=5120
VIDEO_ABANDONED_UPLOAD_HOURS=24
JOB_WORKER_TICK_MS=15000
# Stale-processing / stale-job recovery, worker heartbeat, and in-process inline fallback — see
# the "part 5" update above and .env.example for full docs on every var below:
VIDEO_STALE_PROCESSING_MINUTES=20
VIDEO_MAX_PROCESSING_ATTEMPTS=3
JOB_STALE_MINUTES=30
VIDEO_WORKER_HEARTBEAT_STALE_MS=90000
VIDEO_INLINE_FALLBACK_ENABLED=true
VIDEO_INLINE_FALLBACK_AFTER_MS=45000
VIDEO_INLINE_FALLBACK_MAX_MB=200
```

Category limits are also editable at runtime without a redeploy via the `AdminSetting` row
`video.category.limits` (see `src/lib/video/limits.ts`) — env vars are just the defaults.

## Deployment commands (VPS)

```bash
cd /path/to/CELEVENTIC-main
npm install
npx prisma generate
# Additive-only schema change — safe to run against production. Review the diff it prints
# before confirming; it should only ever show new tables/columns, never drops.
npx prisma db push
rm -rf .next && npm run build
pm2 restart celeventic --update-env

# Start (first time) or restart the queue worker. Two equivalent ways — pick one:
#
# (a) Using the repo's ecosystem.config.js (recommended — defines restart policy/memory limits
#     for both processes in one place):
pm2 start ecosystem.config.js --only celeventic-video-worker
pm2 restart celeventic-video-worker --update-env   # on subsequent deploys, once it already exists
#
# (b) Ad-hoc, if you'd rather not adopt ecosystem.config.js yet. `celeventic-video-worker` is the
# canonical process name going forward (matches the ops runbook in
# docs/ops/HOSTINGER-VPS-HEVC-DOLBY-VISION-PROMPT.md); `celeventic-jobs-worker` from earlier
# deploys keeps working unchanged if it's already running — no need to rename an existing process.
pm2 start "npm run jobs:worker" --name celeventic-video-worker --update-env
pm2 save

# Verify the worker actually started and is draining the queue (not just that the PM2 process
# exists — see the "part 5" update above for why a separate heartbeat check matters):
pm2 logs celeventic-video-worker --lines 20   # expect "[jobs-worker] started — tick every ..."
cat var/video-worker/heartbeat.json           # should have an `updatedAt` from the last few seconds
# Or check /admin (System Health -> "Video Processing Worker" tile) — it reads the same heartbeat.

# One-time (or re-runnable) backfill of pre-existing invitation videos to browser-universal MP4 —
# see docs/video-processing.md#backfilling-pre-existing-videos for full details/flags:
npm run video:backfill:dry-run
npm run video:backfill
```

**Never run `pm2 restart all`** on this box — other unrelated apps (e.g. Spark & Drive) may share
the same PM2 daemon. Always target `celeventic` and `celeventic-video-worker` by name.

The worker (`celeventic-video-worker`, script: `scripts/video-jobs-worker.ts`, alias npm script:
`npm run video:worker` / `npm run jobs:worker`) is a small, long-running Node process — it only
makes AWS API calls (CreateJob/GetJob) and Prisma queries every `JOB_WORKER_TICK_MS` when
`VIDEO_PROCESSOR=mediaconvert`. **On Hostinger it also runs real FFmpeg**: with the default
`VIDEO_PROCESSOR=ffmpeg`, this same process is what actually transcodes every video (see
`processQueuedVideoAssetLocalFfmpeg`/`processQueuedVideoAssetWithFfmpeg` in
`src/lib/video/processing.ts`) — it's still safe to run on the same VPS as the Next.js app
(`VIDEO_PROCESSOR_CONCURRENCY=1` by default bounds it to one transcode at a time), but it is NOT
just a lightweight orchestrator on this deployment. If it isn't running, uploads still accept
(202 QUEUED) but nothing ever transcodes them — see the "part 5" update above for how this is now
detected (worker heartbeat) and self-healed (stale-job recovery, in-process inline fallback).

## Rollback

- **App code**: `git revert` the merge commit / redeploy the previous build; the new API routes
  and worker are additive, so removing them does not affect any existing upload path
  (Cloudinary-less local/S3 buffered uploads keep working unchanged).
- **Database**: all changes are additive (`VideoAsset`, `VideoCategory`, `VideoUploadStatus`,
  `VideoOwnerType` are new; `EventMemoryUpload.videoAssetId` is a new nullable column). No
  destructive migration is ever required to roll back — the new columns/tables can simply be
  ignored by an older app version.
- **Stop processing without a deploy**: set `VIDEO_PROCESSING_ENABLED=false` and restart the
  app + worker — new uploads still accept and store files (status stays `QUEUED`) but no
  MediaConvert jobs are created until re-enabled; nothing is lost.
- **Run without S3 entirely (supported, not just a rollback)**: leave `AWS_ACCESS_KEY_ID` /
  `AWS_SECRET_ACCESS_KEY` / `AWS_S3_BUCKET` unset (or set `MEDIA_STORAGE_PROVIDER` to anything
  other than `s3`) and every `VideoUploader` surface automatically uses the local-disk + VPS
  FFmpeg fallback (`/api/uploads/video/local`) instead of failing — see the 2026-07-24 update
  at the top of this doc. To restore the old hard-block-without-S3 behavior instead, set
  `VIDEO_LOCAL_FALLBACK_ENABLED=false`.
- **Backfill DB changes**: every `npm run video:backfill` run writes a
  `var/video-backfill/rollback-<runId>.json`; run
  `npm run video:backfill -- --rollback=var/video-backfill/rollback-<runId>.json` to restore the
  exact prior value of every row/field it touched (does not delete the generated processed video
  files — harmless to leave in place). A SQLite backup from the same run also sits in
  `var/video-backfill/backups/` if a full file-level restore is ever needed instead.

## Format & codec support

Broad consumer + professional format allowlist (container-level):
`mp4, mov, m4v, webm, avi, mkv, wmv, flv, mpg, mpeg, m2v, mts, m2ts, ts, 3gp, 3g2, ogv, vob, asf, dv, mxf`.

**HEVC/H.265 is a fully supported source codec**, not just a container concern — it commonly
ships inside `.mp4`/`.mov` from iPhone and modern Android cameras. MediaConvert auto-detects and
decodes HEVC (and H.264, ProRes, MPEG-2, VP8/VP9, etc.) from the input without any special
configuration; every job always re-encodes to H.264/AAC MP4 (+ HLS for longer videos) for
universal playback — **raw HEVC is never served as the only public delivery format**. See
`src/lib/video/container-sniff.ts` (`detectMp4VideoCodecHint`) for the best-effort HEVC
detection used for validation/analytics, and `src/lib/video/mediaconvert.ts` for the job
settings (`ScalingBehavior: FIT_NO_UPSCALE` on every rendition — small sources are never
upscaled).

## Testing

```bash
npm run test:video            # format/signature/HEVC/MediaConvert-plan/heartbeat unit tests (no AWS calls made)
npm run test:video-pipeline   # real-DB integration: 202 queue -> worker -> READY, stale-processing/job
                               # recovery, worker-health, and inline-fallback self-healing (see part 5)
npm run test:currency         # currency seed-once / no-repeated-writes regression tests
npm run test:uploads          # byte-range / form-data-file parsing unit tests
npm run test:all              # everything above
npm run build                 # full production build
```

To verify the part-5 fix specifically after deploying: stop `celeventic-video-worker` (`pm2 stop
celeventic-video-worker`), upload a small video, and confirm it still reaches `READY` within about
a minute via the in-process inline fallback (check `/admin` system health — the "Video Processing
Worker" tile should show critical/no-heartbeat while stopped). Then restart the worker
(`pm2 start celeventic-video-worker`) and confirm the tile returns to healthy on the next upload.
