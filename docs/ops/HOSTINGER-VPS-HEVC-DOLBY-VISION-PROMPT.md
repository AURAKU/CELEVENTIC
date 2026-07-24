> ⚠️ **Superseded.** Celeventic's video pipeline now uses direct-to-S3 multipart upload +
> AWS Elemental MediaConvert (see `docs/ops/VIDEO-UPLOAD-DEPLOYMENT.md`), which already
> covers HEVC/H.265 (incl. iPhone Dolby Vision sources — MediaConvert tone-maps HDR to
> SDR/BT.709 automatically), format validation, processing states, and playback. **Do not
> run this FFmpeg-on-VPS prompt in production** — it would install a second, conflicting
> processing pipeline and violates the "no large-scale transcoding on the VPS" requirement.
> Kept here only for historical reference.

# Hostinger VPS Ops Prompt: HEVC / Dolby Vision Video Upload Fix

This is the verbatim production-ops prompt to paste into the **Hostinger VPS Ops/AI terminal assistant** (hPanel AI / VPS terminal assistant) to implement automatic HEVC/Dolby Vision video conversion on the Celeventic production VPS.

Saved on 2026-07-24. Copy everything between the ```text fences below (or the whole file) and paste it directly into the Hostinger AI terminal chat.

---

```text
You are operating directly on my production Hostinger VPS.

Implement and deploy a complete video-upload compatibility fix for Celeventic.

Production details:
- Project directory: /var/www/CELEVENTIC
- Next.js 15 application
- PM2 application name: celeventic
- Production port: 3001
- Nginx reverse proxy
- Prisma with SQLite
- Production database: /var/www/CELEVENTIC/prisma/production.db
- Live website: https://www.celeventic.com
- AWS S3/CloudFront may already exist for media delivery
- Do not modify, restart or interrupt the sparkdrive application
- Do not restart all PM2 processes

Primary issue:
Videos recorded on iPhones may be:

- MOV or MP4 container
- HEVC/H.265 codec
- Dolby Vision HDR
- 4K vertical, such as 2160 × 3840
- 60 FPS

These files may upload but fail to load or play reliably in browsers.

Required result:
Celeventic must accept valid HEVC/H.265, Dolby Vision, MOV and other common video uploads, automatically convert them into a browser-compatible playback file, and use the converted output everywhere the video is displayed.

Every valid supported upload must be normalized to:

- MP4 container
- H.264/AVC video
- AAC audio
- yuv420p pixel format
- fast-start enabled
- correct orientation
- standard SDR/BT.709 playback when the original is HDR or Dolby Vision
- maximum output resolution of 1080p
- no upscaling
- preserved aspect ratio

Do not simply increase the Nginx upload limit.
Implement the complete upload, processing, storage, status and playback flow.

==================================================
SAFETY REQUIREMENTS
==================================================

Before changing anything:

1. Run:

cd /var/www/CELEVENTIC

2. Confirm these files exist:

- package.json
- prisma/schema.prisma
- prisma/production.db
- .env

3. Create timestamped backups of:

- prisma/production.db
- active Celeventic Nginx configuration
- every application file before editing it

4. Do not delete or overwrite:

- .env
- prisma/production.db
- existing uploaded media
- user data
- AWS configuration
- Cloudinary media
- existing production URLs

5. Do not use:

- git reset --hard
- prisma migrate reset
- prisma db push --force-reset
- npm audit fix --force
- pm2 restart all

6. Stop immediately and report the complete error if an operation risks deleting existing production data.

==================================================
STEP 1 — VERIFY VIDEO TOOLS
==================================================

Install or verify:

- ffmpeg
- ffprobe
- jq
- sqlite3

Use:

apt update
DEBIAN_FRONTEND=noninteractive apt install -y ffmpeg jq sqlite3

Verify that FFmpeg supports:

- HEVC/H.265 decoding
- libx264 H.264 encoding
- AAC encoding
- zscale filter
- tonemap filter

Run checks using:

ffmpeg -hide_banner -decoders
ffmpeg -hide_banner -encoders
ffmpeg -hide_banner -filters

Do not incorrectly use literal placeholders such as:

ffmpeg ...

The installed FFmpeg build has already shown HEVC, libx264 and AAC support, but verify them safely.

==================================================
STEP 2 — UPDATE NGINX
==================================================

Locate the active Celeventic Nginx configuration.

Inside the correct HTTPS server block, ensure these settings exist only once:

client_max_body_size 2G;
client_body_timeout 600s;
send_timeout 600s;
proxy_connect_timeout 60s;
proxy_send_timeout 600s;
proxy_read_timeout 600s;
proxy_request_buffering off;

Keep the existing proxy_pass to:

http://127.0.0.1:3001

Do not enable proxy_buffering off globally unless the existing upload route requires it.

Run:

nginx -t

Reload Nginx only if the test succeeds:

systemctl reload nginx

==================================================
STEP 3 — INSPECT THE EXISTING CELEVENTIC CODE
==================================================

Before writing code, search the repository and report the exact files responsible for:

- video input components
- media upload forms
- upload API routes
- S3 presigned upload routes
- Cloudinary upload routes
- file MIME validation
- file-extension validation
- maximum upload size validation
- video URL database fields
- media models in Prisma
- video preview components
- video playback components
- invitation video backgrounds
- template videos
- vendor portfolio videos
- guestbook videos
- event gallery videos
- inspiration uploads
- Studio Editor video uploads
- ticket or event media uploads
- any existing queue or worker
- any existing media-processing service

Search the entire repository, excluding:

- node_modules
- .next
- .git
- backups

Do not blindly alter every file containing the word “video.”

==================================================
STEP 4 — ACCEPT COMMON VIDEO INPUT FORMATS
==================================================

Update relevant client file inputs to accept:

video/*,.mp4,.mov,.m4v,.webm,.avi,.mkv,.wmv,.flv,.mpg,.mpeg,.m2v,.mts,.m2ts,.ts,.3gp,.3g2,.ogv,.vob,.asf,.dv,.mxf,.hevc

Update server-side validation to accept valid video containers and MIME types, including cases where an iPhone reports:

- video/quicktime
- video/mp4
- application/octet-stream

Do not trust the extension or browser MIME type alone.

After the upload reaches private storage, use ffprobe to confirm:

- at least one valid video stream exists
- the duration is valid
- width and height are valid
- the file is decodable

Reject safely:

- executables
- scripts
- archives
- HTML
- fake renamed files
- empty files
- corrupt videos
- encrypted or undecodable media
- files without a valid video stream
- files exceeding the configured section limit

Do not expose raw ffprobe or FFmpeg errors to the user.

==================================================
STEP 5 — CREATE A SECURE VIDEO PROCESSING SERVICE
==================================================

Create a server-only TypeScript video-processing service.

It must use child_process spawn or execFile with an argument array.

Do not build shell commands by concatenating user-controlled text.

The service must:

1. Receive a private original local path or downloaded temporary S3 path.
2. Resolve and validate the path.
3. Prevent ../ path traversal.
4. Run ffprobe.
5. Extract:
   - codec
   - profile
   - container
   - duration
   - width
   - height
   - frame rate
   - rotation
   - color transfer
   - color primaries
   - color space
   - audio codec
   - file size
6. Detect HEVC/H.265.
7. Detect HDR, HLG, HDR10 or Dolby Vision indicators where available.
8. Create a unique processed filename.
9. Generate a compatible MP4.
10. Generate a poster image.
11. Generate a thumbnail.
12. Validate the completed output using ffprobe.
13. Return structured metadata.
14. Remove incomplete output after failure.
15. Add a maximum processing timeout.
16. Prevent duplicate processing.
17. Log technical errors safely.

==================================================
STEP 6 — CONVERT HEVC/DOLBY VISION CORRECTLY
==================================================

For normal SDR video, create:

- MP4
- H.264 with libx264
- AAC audio
- yuv420p
- CRF approximately 22–24
- fast-start
- no output above 1080p
- no upscaling

Equivalent core settings:

-c:v libx264
-preset medium
-crf 23
-profile:v high
-pix_fmt yuv420p
-c:a aac
-b:a 128k
-movflags +faststart

For 4K vertical videos, preserve portrait orientation and resize proportionally so the long edge does not exceed 1920.

Examples:

2160 × 3840
becomes approximately:
1080 × 1920

Do not distort or crop unless the specific Celeventic feature intentionally requires cropping.

For HEVC Dolby Vision/HDR sources:

- detect HDR metadata using ffprobe
- tone-map to standard SDR BT.709
- prevent washed-out, grey, overly dark or overexposed output
- use zscale and tonemap only when HDR is detected
- output yuv420p BT.709

Use a safe tone-mapping filter supported by the installed FFmpeg version.

Do not apply HDR tone mapping to normal SDR files.

If zscale or tonemap is unavailable, stop and report it rather than producing visually broken videos.

For videos without audio:

- conversion must still succeed
- use -an safely

For normal videos with audio:

- retain the first valid audio stream
- convert it to AAC

For invitation background videos:

- allow muted output
- preserve looping suitability
- optimize size
- do not force audio

==================================================
STEP 7 — ADD PROCESSING STATES
==================================================

The upload must not be treated as immediately ready.

Implement or extend processing states:

UPLOADING
UPLOADED
QUEUED
PROCESSING
READY
FAILED
CANCELLED

Preserve all existing data.

Add only additive Prisma fields or an additive related media-processing model.

Store:

- original storage key or URL
- processed playback URL
- poster URL
- thumbnail URL
- HLS URL, nullable
- source filename
- source MIME type
- detected container
- detected video codec
- detected audio codec
- HDR or Dolby Vision indicator
- duration
- width
- height
- original file size
- processed file size
- processing status
- processing attempts
- processing error
- processing started time
- processing completed time
- FFmpeg job identifier or idempotency key

Do not remove or rename current video fields.

Keep old video URLs working for backward compatibility.

Before running prisma db push:

- back up production.db
- show the proposed changes
- do not proceed if Prisma requests destructive data loss without reporting it first

==================================================
STEP 8 — CREATE A BACKGROUND VIDEO WORKER
==================================================

Do not run long FFmpeg conversions inside the upload HTTP request.

Create a controlled background worker.

Requirements:

- PM2 process name: celeventic-video-worker
- one concurrent FFmpeg job initially
- configurable concurrency
- database-backed or existing queue-backed jobs
- retry failed jobs up to a safe limit
- idempotency
- no duplicate processing
- safe shutdown
- structured logs
- stale-job recovery
- processing timeout
- clear FAILED state
- clean temporary files
- do not exceed VPS resources

The user upload request must return after the upload is saved and queued.

The interface should show:

“Your video is being prepared for smooth playback.”

When conversion finishes:

- status becomes READY
- processed URL replaces the loading state
- the original raw HEVC URL must not be used for ordinary browser playback

==================================================
STEP 9 — STORAGE AND AWS
==================================================

If the current application already uploads to S3:

- keep the raw original private
- use a private raw prefix
- process from the raw object
- upload the converted MP4, poster and thumbnail to S3
- deliver processed media through CloudFront
- use https://media.celeventic.com where configured
- do not make the S3 bucket public
- do not expose AWS credentials to the client
- delete temporary VPS processing files after successful S3 upload

Suggested object structure:

uploads/raw/videos/{userId}/{uuid}/source.mov
uploads/processed/videos/{userId}/{uuid}/playback.mp4
uploads/processed/videos/{userId}/{uuid}/poster.jpg
uploads/processed/videos/{userId}/{uuid}/thumbnail.jpg

If S3 processing integration is incomplete:

- implement a storage adapter
- retain support for both local and S3 storage
- do not break existing Cloudinary or legacy media URLs

==================================================
STEP 10 — CREATE A RELIABLE VIDEO PLAYER
==================================================

Find all places Celeventic renders videos.

Create or update a reusable VideoPlayer component.

Playback priority:

1. processed HLS URL, when available
2. processed H.264 MP4 URL
3. legacy playable URL only as a fallback
4. never use a raw HEVC, AVI, MKV, WMV, MTS or MXF file as the normal playback source

Requirements:

- playsInline
- controls where appropriate
- muted autoplay only when the feature needs autoplay
- poster image
- preload="metadata" on detail views
- preload="none" on list and card pages
- responsive portrait and landscape playback
- preserve aspect ratio
- loading state
- queued and processing states
- failed state
- retry option
- accessible controls
- pause when outside viewport
- do not autoplay multiple videos simultaneously
- do not fully load videos in paginated lists
- use thumbnails/posters on cards

If HLS exists:

- use native HLS on Safari
- use hls.js fallback where supported
- fall back to MP4 if HLS fails

==================================================
STEP 11 — VERIFY BYTE-RANGE PLAYBACK
==================================================

Confirm processed MP4 files support seeking and partial loading.

When serving locally or through an API route, support:

- Range request
- HTTP 206 Partial Content
- Accept-Ranges: bytes
- Content-Range
- correct Content-Length
- video/mp4 Content-Type

Prefer direct CloudFront/S3 playback URLs instead of proxying large videos through Next.js.

==================================================
STEP 12 — USER EXPERIENCE
==================================================

Implement user-facing states:

During upload:
- upload percentage
- cancel
- retry

After upload:
- “Upload complete”
- “Preparing your video for smooth playback”

When ready:
- show the poster first
- load the processed MP4
- play correctly on mobile and desktop

When failed:
- show “We could not prepare this video. Please retry or upload another copy.”
- do not expose FFmpeg, Prisma, AWS or filesystem errors

==================================================
STEP 13 — TEST THE ACTUAL IPHONE FORMAT
==================================================

The main required source profile is:

- Apple iPhone 13 Pro Max
- HEVC/H.265
- Dolby Vision
- 2160 × 3840
- portrait 4K
- 60 FPS
- MOV or MP4 container
- approximately 110 MB
- short duration

Test that this source:

1. uploads successfully
2. passes ffprobe validation
3. is detected as HEVC
4. is detected as HDR/Dolby Vision where metadata is available
5. is resized to approximately 1080 × 1920 without distortion
6. is tone-mapped to normal BT.709 SDR
7. is encoded as H.264
8. uses AAC audio
9. uses yuv420p
10. has fast-start enabled
11. produces a poster
12. produces a thumbnail
13. is saved as READY
14. plays in:
    - Chrome
    - Safari
    - iPhone Safari
    - Android Chrome
15. allows seeking
16. has correct portrait orientation
17. does not appear washed out or excessively dark

Also test:

- normal H.264 MP4
- WebM
- MOV
- video without audio
- landscape video
- corrupted file
- fake .mp4
- oversized file

==================================================
STEP 14 — BUILD AND DEPLOY
==================================================

After implementation:

cd /var/www/CELEVENTIC

npm install

npx prisma generate

Back up the production database again.

Run:

npx prisma db push

Do not continue if Prisma warns about destructive data loss without first reporting the warning.

Then:

rm -rf .next
npm run build

Restart only:

pm2 restart celeventic --update-env

Start or restart the worker:

pm2 restart celeventic-video-worker --update-env

If the worker does not yet exist:

pm2 start the correct worker entry file \
  --name celeventic-video-worker

Save PM2:

pm2 save

Validate Nginx:

nginx -t

Reload only if successful:

systemctl reload nginx

==================================================
STEP 15 — VERIFY PRODUCTION
==================================================

Run:

pm2 status

curl -I http://127.0.0.1:3001

curl -I https://www.celeventic.com

curl -i http://127.0.0.1:3001/api/health

Check fresh logs only:

pm2 logs celeventic --lines 100 --nostream

pm2 logs celeventic-video-worker --lines 100 --nostream

Confirm:

- Celeventic is online
- Spark & Drive remains online
- no FFmpeg crash loop exists
- no database timeout loop exists
- video jobs complete
- processed URLs are returned
- uploaded HEVC video is not served directly
- converted MP4 plays correctly

==================================================
FINAL REPORT
==================================================

Provide a complete report containing:

- repository files inspected
- files modified
- backups created
- Nginx changes
- accepted source video formats
- upload size limits
- ffprobe validation
- HDR/Dolby Vision detection
- tone-mapping method
- FFmpeg settings
- worker implementation
- PM2 process names
- database changes
- S3/CloudFront changes
- player changes
- test results
- build result
- PM2 status
- live-site status
- rollback commands
- any remaining limitations

Do not claim that corrupted or undecodable files can always work.

The required production behavior is:

Every valid video that FFmpeg can decode, including iPhone HEVC/Dolby Vision footage, must be converted into an H.264/AAC MP4 playback file before Celeventic marks it READY and displays it to users.
```
