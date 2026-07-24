# Video processing — VPS FFmpeg (invitations + universal pipeline bridge)

## Why this exists

`src/app/api/invitations/upload/route.ts` accepted MOV/HEVC/etc. video uploads but returned
the **original, unconverted** file URL. Browsers that can't decode HEVC/Dolby Vision (most
non-Safari browsers, and even Safari for some Dolby Vision profiles) then fail to play the
invitation's hero/background video on the live site.

Production (Hostinger VPS) has no AWS MediaConvert configured, but already has a video
converter installed at `/usr/local/bin/celeventic-process-video`. This fix adds a VPS-first
FFmpeg processing engine and wires it into the invitations upload route so **every** uploaded
video is converted to a browser-universal file before its URL is ever returned to the client.

## Architecture

```
Browser (MediaUploader)
  │  multipart/form-data POST
  ▼
POST /api/invitations/upload  (src/app/api/invitations/upload/route.ts)
  │  1. sniff real container from bytes (never trust extension/MIME)
  │  2. processVideoFile(buffer)             ─┐
  │       a. try /usr/local/bin/celeventic-process-video (if present)
  │       b. else ffprobe → decide remux-only vs full transcode → ffmpeg
  │       c. always produces: MP4 (H.264/AAC/yuv420p/faststart, ≤1080p,   │ src/lib/video/
  │          correct orientation, HDR→SDR BT.709) + JPEG poster           │ video-processor.ts
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
  (`force_original_aspect_ratio=decrease`).
- **Orientation**: baked into the pixels via ffmpeg's `-autorotate 1` (applies the container's
  display-matrix/rotate-tag rotation during transcode — phone-shot portrait video plays upright
  everywhere, not just in players that respect the metadata tag).
- **HDR/Dolby Vision → SDR**: when `ffprobe` reports a PQ (`smpte2084`) or HLG (`arib-std-b67`)
  transfer function, a `zscale`/`tonemap`/`zscale` filter chain tone-maps to SDR BT.709 before
  encoding. Requires an ffmpeg build with `zscale` (`libzimg`) — if missing, the run fails
  loudly (upload is rejected with a clear error) rather than shipping a washed-out/broken file.
- **Poster**: one JPEG frame (~10% into the clip, capped at 3s), scaled to ≤1280px wide.

### Fast path: remux instead of re-encode

If `ffprobe` reports the source is *already* H.264/AAC/yuv420p/≤1080p/unrotated/SDR, we skip
the expensive re-encode and just do `-c copy -movflags +faststart` (fast — just relocates
`moov`). Anything else (HEVC, WebM/VP9, AVI, MKV, HDR, rotated, oversized, etc.) gets a full
transcode.

## Where it's used

| Path | File | Sync/Async | Engine selection |
|---|---|---|---|
| Invitations builder upload (confirmed bug) | `src/app/api/invitations/upload/route.ts` | **Synchronous** (v1) | Always `video-processor.ts` (FFmpeg) |
| Universal S3 pipeline (Studio 2.0 hero/background/gallery, vendor portfolio, guestbook, event shorts) | `src/lib/video/processing.ts` → `processQueuedVideoAsset` | Async (`BackgroundJob` queue + `npm run jobs:worker`) | `VIDEO_PROCESSOR` env — `ffmpeg` (default when MediaConvert isn't configured) or `mediaconvert` |

Both paths produce the same `VideoAsset`-shaped output contract (`processedMp4Url`,
`posterUrl`, `thumbnailUrl`, `status`), so `VideoUploader`/`VideoPlayer` on the client don't
need to know which engine ran.

## Environment variables

See `.env.example` for the full annotated list. Key ones:

```
VIDEO_PROCESSOR=ffmpeg                 # or "mediaconvert" — blank auto-detects
CELEVENTIC_VIDEO_CONVERTER_PATH=/usr/local/bin/celeventic-process-video
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
4. **External converter contract is inferred, not confirmed.** No prior contract for
   `/usr/local/bin/celeventic-process-video` existed in this codebase or its history. This
   implementation calls it as
   `celeventic-process-video --input <in> --output <out.mp4> --poster <poster.jpg> --max-width 1920 --max-height 1080`
   and treats **any** failure (non-zero exit, missing/empty output, wrong flags, timeout) as
   "unavailable" and transparently falls back to the direct `ffprobe`+`ffmpeg` path — so
   playback correctness never depends on that binary's exact CLI surface. If the real
   converter's contract differs, either adjust the invocation in
   `src/lib/video/video-processor.ts` (`processVideoFile`) to match it, or simply leave it
   unset/absent — the ffmpeg fallback alone fully satisfies the output contract above.

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

# Verify ffmpeg/ffprobe are present (or the converter binary):
which ffmpeg ffprobe /usr/local/bin/celeventic-process-video

pm2 restart celeventic --update-env
# If also deploying the universal pipeline's async worker:
pm2 restart celeventic-jobs-worker --update-env || pm2 start "npm run jobs:worker" --name celeventic-jobs-worker --update-env
pm2 save
```

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
npm run test:video   # includes src/lib/video/__tests__/video-processor.test.ts
npm run build
```

`video-processor.test.ts` covers: ffprobe JSON parsing (duration/codec/rotation/HDR
detection), the remux-vs-transcode decision, ffmpeg argument construction (H.264/AAC/yuv420p/
faststart/no-shell-injection), the HDR tonemap filter chain, poster-frame timestamp selection,
external-converter path resolution, and the concurrency semaphore. These are pure-function
tests — they do not require ffmpeg/ffprobe to be installed and run in CI without any video
tooling present.
