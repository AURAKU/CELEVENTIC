import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import {
  parseFfprobeJson,
  isAlreadyBrowserCompatible,
  buildVideoFilterChain,
  buildTranscodeArgs,
  buildRemuxArgs,
  buildPosterArgs,
  choosePosterSeekSeconds,
  hasExternalConverter,
  getExternalConverterPath,
  isExternalConverterOptedIn,
  shouldAttemptExternalConverter,
  processVideoFile,
  Semaphore,
  type ProbeResult,
} from "../video-processor";

const execFileAsync = promisify(execFile);

function probe(overrides: Partial<ProbeResult> = {}): ProbeResult {
  return {
    durationSeconds: 12.5,
    width: 1920,
    height: 1080,
    rotation: 0,
    videoCodec: "h264",
    audioCodec: "aac",
    hasAudio: true,
    isHevc: false,
    isHdr: false,
    colorTransfer: null,
    colorPrimaries: null,
    ...overrides,
  };
}

describe("parseFfprobeJson", () => {
  it("extracts duration, dimensions, codecs, and audio presence from a typical H.264/AAC MP4", () => {
    const raw = JSON.stringify({
      format: { duration: "8.42" },
      streams: [
        { codec_type: "video", codec_name: "h264", width: 1920, height: 1080 },
        { codec_type: "audio", codec_name: "aac" },
      ],
    });
    const result = parseFfprobeJson(raw);
    assert.equal(result.durationSeconds, 8.42);
    assert.equal(result.width, 1920);
    assert.equal(result.height, 1080);
    assert.equal(result.videoCodec, "h264");
    assert.equal(result.audioCodec, "aac");
    assert.equal(result.hasAudio, true);
    assert.equal(result.isHevc, false);
    assert.equal(result.isHdr, false);
    assert.equal(result.rotation, 0);
  });

  it("detects HEVC (iPhone) sources", () => {
    const raw = JSON.stringify({
      format: { duration: "5" },
      streams: [{ codec_type: "video", codec_name: "hevc", width: 3840, height: 2160 }],
    });
    const result = parseFfprobeJson(raw);
    assert.equal(result.isHevc, true);
    assert.equal(result.hasAudio, false);
  });

  it("detects HDR via color_transfer (smpte2084 / PQ, common on HDR10/Dolby Vision iPhone footage)", () => {
    const raw = JSON.stringify({
      streams: [{ codec_type: "video", codec_name: "hevc", color_transfer: "smpte2084" }],
    });
    assert.equal(parseFfprobeJson(raw).isHdr, true);
  });

  it("detects HDR via color_transfer (arib-std-b67 / HLG)", () => {
    const raw = JSON.stringify({
      streams: [{ codec_type: "video", codec_name: "hevc", color_transfer: "arib-std-b67" }],
    });
    assert.equal(parseFfprobeJson(raw).isHdr, true);
  });

  it("does not misclassify an SDR bt709 stream as HDR", () => {
    const raw = JSON.stringify({
      streams: [{ codec_type: "video", codec_name: "h264", color_transfer: "bt709", color_primaries: "bt709" }],
    });
    assert.equal(parseFfprobeJson(raw).isHdr, false);
  });

  it("normalizes rotation from the legacy 'rotate' tag", () => {
    const raw = JSON.stringify({
      streams: [{ codec_type: "video", codec_name: "h264", tags: { rotate: "90" } }],
    });
    assert.equal(parseFfprobeJson(raw).rotation, 90);
  });

  it("normalizes rotation from a signed display-matrix side_data rotation", () => {
    const raw = JSON.stringify({
      streams: [{ codec_type: "video", codec_name: "h264", side_data_list: [{ rotation: -90 }] }],
    });
    assert.equal(parseFfprobeJson(raw).rotation, 90);
  });

  it("returns safe defaults for malformed JSON instead of throwing", () => {
    const result = parseFfprobeJson("not json");
    assert.equal(result.durationSeconds, null);
    assert.equal(result.width, null);
    assert.equal(result.isHevc, false);
  });

  it("returns safe defaults when there is no video stream at all", () => {
    const raw = JSON.stringify({ streams: [{ codec_type: "audio", codec_name: "aac" }] });
    const result = parseFfprobeJson(raw);
    assert.equal(result.videoCodec, null);
    assert.equal(result.hasAudio, true);
  });
});

describe("isAlreadyBrowserCompatible — remux-only fast path", () => {
  it("accepts a standard H.264/AAC 1080p, unrotated, SDR source", () => {
    assert.equal(isAlreadyBrowserCompatible(probe()), true);
  });

  it("rejects HEVC sources (must transcode)", () => {
    assert.equal(isAlreadyBrowserCompatible(probe({ videoCodec: "hevc" })), false);
  });

  it("rejects HDR sources even if the codec were H.264 (must tonemap)", () => {
    assert.equal(isAlreadyBrowserCompatible(probe({ isHdr: true })), false);
  });

  it("rejects rotated sources (must bake in orientation)", () => {
    assert.equal(isAlreadyBrowserCompatible(probe({ rotation: 90 })), false);
  });

  it("rejects sources above 1080p (must downscale)", () => {
    assert.equal(isAlreadyBrowserCompatible(probe({ width: 3840, height: 2160 })), false);
  });

  it("rejects non-AAC audio codecs", () => {
    assert.equal(isAlreadyBrowserCompatible(probe({ audioCodec: "mp3" })), false);
  });

  it("accepts a silent (no-audio) H.264 source", () => {
    assert.equal(isAlreadyBrowserCompatible(probe({ hasAudio: false, audioCodec: null })), true);
  });
});

describe("buildVideoFilterChain", () => {
  it("builds a plain scale+format chain for SDR sources", () => {
    const chain = buildVideoFilterChain(probe());
    assert.match(chain, /^scale=/);
    assert.match(chain, /force_original_aspect_ratio=decrease/);
    assert.match(chain, /force_divisible_by=2/);
    assert.match(chain, /format=yuv420p$/);
    assert.doesNotMatch(chain, /zscale|tonemap/);
  });

  it("caps at 1920x1080 in the scale expression regardless of source size", () => {
    const chain = buildVideoFilterChain(probe({ width: 4096, height: 2160 }));
    assert.match(chain, /min\(1920,iw\)/);
    assert.match(chain, /min\(1080,ih\)/);
  });

  it("adds an HDR->SDR BT.709 tonemap chain when isHdr is true and zscale+tonemap are available", () => {
    const chain = buildVideoFilterChain(probe({ isHdr: true, videoCodec: "hevc" }), { hasZscale: true, hasTonemap: true });
    assert.match(chain, /zscale=t=linear/);
    assert.match(chain, /tonemap=tonemap=hable/);
    assert.match(chain, /zscale=t=bt709:m=bt709:r=tv/);
    assert.match(chain, /format=yuv420p$/);
  });

  it("defaults to assuming zscale+tonemap are available when no capabilities are passed (back-compat)", () => {
    const chain = buildVideoFilterChain(probe({ isHdr: true, videoCodec: "hevc" }));
    assert.match(chain, /zscale=t=linear/);
  });

  it("falls back to the plain scale/format chain for HDR sources when zscale is missing", () => {
    const chain = buildVideoFilterChain(probe({ isHdr: true, videoCodec: "hevc" }), { hasZscale: false, hasTonemap: true });
    assert.doesNotMatch(chain, /zscale|tonemap/);
    assert.match(chain, /^scale=/);
    assert.match(chain, /format=yuv420p$/);
  });

  it("falls back to the plain scale/format chain for HDR sources when tonemap is missing", () => {
    const chain = buildVideoFilterChain(probe({ isHdr: true, videoCodec: "hevc" }), { hasZscale: true, hasTonemap: false });
    assert.doesNotMatch(chain, /zscale|tonemap/);
  });

  it("falls back to the plain scale/format chain for HDR sources when neither filter is available", () => {
    const chain = buildVideoFilterChain(probe({ isHdr: true, videoCodec: "hevc" }), { hasZscale: false, hasTonemap: false });
    assert.doesNotMatch(chain, /zscale|tonemap/);
  });

  it("uses the plain scale/format chain for non-HDR sources regardless of capabilities", () => {
    const chain = buildVideoFilterChain(probe({ isHdr: false }), { hasZscale: true, hasTonemap: true });
    assert.doesNotMatch(chain, /zscale|tonemap/);
  });
});

describe("buildTranscodeArgs", () => {
  it("never uses a shell — returns a flat argv array with the input/output paths as literal args", () => {
    const args = buildTranscodeArgs("/tmp/in.mov", "/tmp/out.mp4", probe());
    assert.ok(Array.isArray(args));
    assert.ok(args.every((a) => typeof a === "string"));
    assert.ok(args.includes("/tmp/in.mov"));
    assert.equal(args[args.length - 1], "/tmp/out.mp4");
  });

  it("always encodes H.264 main profile, yuv420p, and faststart", () => {
    const args = buildTranscodeArgs("in.mp4", "out.mp4", probe());
    assert.ok(args.includes("libx264"));
    assert.ok(args.includes("yuv420p"));
    assert.ok(args.includes("+faststart"));
  });

  it("encodes AAC audio when the source has an audio track", () => {
    const args = buildTranscodeArgs("in.mp4", "out.mp4", probe({ hasAudio: true }));
    assert.ok(args.includes("aac"));
    assert.ok(!args.includes("-an"));
  });

  it("mutes (-an) when the source has no audio track, instead of failing", () => {
    const args = buildTranscodeArgs("in.mp4", "out.mp4", probe({ hasAudio: false }));
    assert.ok(args.includes("-an"));
    assert.ok(!args.includes("aac"));
  });

  it("relies on -autorotate to bake in phone display-matrix rotation", () => {
    const args = buildTranscodeArgs("in.mov", "out.mp4", probe({ rotation: 90 }));
    const idx = args.indexOf("-autorotate");
    assert.ok(idx !== -1);
    // Bare flag (no trailing "1") — some ffmpeg builds (7.x+) misparse `-autorotate 1` as a
    // stray positional output argument instead of the flag's boolean value. See video-processor.ts.
    assert.equal(args[idx + 1], "-i");
  });
});

describe("buildRemuxArgs / buildPosterArgs", () => {
  it("remux uses stream copy + faststart only (no re-encode)", () => {
    const args = buildRemuxArgs("in.mp4", "out.mp4");
    assert.ok(args.includes("-c"));
    assert.ok(args.includes("copy"));
    assert.ok(args.includes("+faststart"));
  });

  it("poster extraction grabs exactly one frame, scaled down, never upscaled", () => {
    const args = buildPosterArgs("in.mp4", "poster.jpg", 1.5);
    assert.ok(args.includes("-frames:v"));
    assert.ok(args.includes("1"));
    assert.ok(args.some((a) => a.includes("min(1280,iw)")));
  });
});

describe("choosePosterSeekSeconds", () => {
  it("returns 0 for an unknown/zero duration", () => {
    assert.equal(choosePosterSeekSeconds(null), 0);
    assert.equal(choosePosterSeekSeconds(0), 0);
  });

  it("picks ~10% into short clips", () => {
    assert.equal(choosePosterSeekSeconds(10), 1);
  });

  it("caps at 3 seconds for long clips", () => {
    assert.equal(choosePosterSeekSeconds(600), 3);
  });
});

describe("hasExternalConverter / getExternalConverterPath", () => {
  const ORIGINAL_PATH = process.env.CELEVENTIC_VIDEO_CONVERTER_PATH;
  const ORIGINAL_OPT_IN = process.env.VIDEO_USE_EXTERNAL_CONVERTER;

  afterEach(() => {
    if (ORIGINAL_PATH === undefined) delete process.env.CELEVENTIC_VIDEO_CONVERTER_PATH;
    else process.env.CELEVENTIC_VIDEO_CONVERTER_PATH = ORIGINAL_PATH;
    if (ORIGINAL_OPT_IN === undefined) delete process.env.VIDEO_USE_EXTERNAL_CONVERTER;
    else process.env.VIDEO_USE_EXTERNAL_CONVERTER = ORIGINAL_OPT_IN;
  });

  it("defaults to the documented production path", () => {
    delete process.env.CELEVENTIC_VIDEO_CONVERTER_PATH;
    assert.equal(getExternalConverterPath(), "/usr/local/bin/celeventic-process-video");
  });

  it("respects an env override", () => {
    process.env.CELEVENTIC_VIDEO_CONVERTER_PATH = "/opt/tools/my-converter";
    assert.equal(getExternalConverterPath(), "/opt/tools/my-converter");
  });

  it("reports false for a path that doesn't exist (safe default in dev/CI without the binary)", () => {
    process.env.CELEVENTIC_VIDEO_CONVERTER_PATH = "/nonexistent/path/to/nothing";
    assert.equal(hasExternalConverter(), false);
  });

  it("is opted out by default — presence of the binary alone must not enable it", () => {
    delete process.env.VIDEO_USE_EXTERNAL_CONVERTER;
    assert.equal(isExternalConverterOptedIn(), false);
    // Even if a real Hostinger-style path "exists" check were true, opt-in stays false.
    assert.equal(shouldAttemptExternalConverter(), false);
  });

  it("opt-in accepts true/1/yes (case-insensitive) and rejects other values", () => {
    process.env.VIDEO_USE_EXTERNAL_CONVERTER = "true";
    assert.equal(isExternalConverterOptedIn(), true);
    process.env.VIDEO_USE_EXTERNAL_CONVERTER = "1";
    assert.equal(isExternalConverterOptedIn(), true);
    process.env.VIDEO_USE_EXTERNAL_CONVERTER = "YES";
    assert.equal(isExternalConverterOptedIn(), true);
    process.env.VIDEO_USE_EXTERNAL_CONVERTER = "false";
    assert.equal(isExternalConverterOptedIn(), false);
    process.env.VIDEO_USE_EXTERNAL_CONVERTER = "maybe";
    assert.equal(isExternalConverterOptedIn(), false);
  });

  it("shouldAttemptExternalConverter requires BOTH opt-in AND an existing binary", () => {
    process.env.VIDEO_USE_EXTERNAL_CONVERTER = "true";
    process.env.CELEVENTIC_VIDEO_CONVERTER_PATH = "/nonexistent/path/to/nothing";
    assert.equal(shouldAttemptExternalConverter(), false);
  });
});

describe("processVideoFile — adaptive default + external fallthrough", () => {
  const ORIGINAL_PATH = process.env.CELEVENTIC_VIDEO_CONVERTER_PATH;
  const ORIGINAL_OPT_IN = process.env.VIDEO_USE_EXTERNAL_CONVERTER;
  const ORIGINAL_PROCESSOR_PATH = process.env.VIDEO_PROCESSOR_PATH;

  afterEach(() => {
    if (ORIGINAL_PATH === undefined) delete process.env.CELEVENTIC_VIDEO_CONVERTER_PATH;
    else process.env.CELEVENTIC_VIDEO_CONVERTER_PATH = ORIGINAL_PATH;
    if (ORIGINAL_OPT_IN === undefined) delete process.env.VIDEO_USE_EXTERNAL_CONVERTER;
    else process.env.VIDEO_USE_EXTERNAL_CONVERTER = ORIGINAL_OPT_IN;
    if (ORIGINAL_PROCESSOR_PATH === undefined) delete process.env.VIDEO_PROCESSOR_PATH;
    else process.env.VIDEO_PROCESSOR_PATH = ORIGINAL_PROCESSOR_PATH;
  });

  async function makeTinyH264Mp4(): Promise<Buffer> {
    const dir = await mkdtemp(path.join(os.tmpdir(), "celeventic-vp-fixture-"));
    const out = path.join(dir, "tiny.mp4");
    try {
      await execFileAsync(
        process.env.FFMPEG_PATH?.trim() || "ffmpeg",
        [
          "-y",
          "-f", "lavfi",
          "-i", "color=c=black:s=320x240:d=0.5",
          "-c:v", "libx264",
          "-pix_fmt", "yuv420p",
          "-movflags", "+faststart",
          out,
        ],
        { timeout: 30_000 }
      );
      return await readFile(out);
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }

  async function writeFailingZscaleConverter(dir: string): Promise<string> {
    // Mimics the Hostinger binary hard-failing on missing zscale while leaving a partial output
    // behind — that partial must NOT be treated as success; adaptive ffmpeg must take over.
    const scriptPath = path.join(dir, "celeventic-process-video");
    const script = `#!/usr/bin/env bash
set -euo pipefail
OUTPUT=""
POSTER=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --output) OUTPUT="$2"; shift 2 ;;
    --poster) POSTER="$2"; shift 2 ;;
    *) shift ;;
  esac
done
# Partial garbage left on disk before failing (the production failure mode).
if [[ -n "\${OUTPUT}" ]]; then printf 'partial-corrupt' > "\${OUTPUT}"; fi
if [[ -n "\${POSTER}" ]]; then printf 'partial-poster' > "\${POSTER}"; fi
echo "No such filter: 'zscale'" >&2
exit 1
`;
    await writeFile(scriptPath, script, { encoding: "utf8" });
    await chmod(scriptPath, 0o755);
    return scriptPath;
  }

  it("defaults to the adaptive ffmpeg path even when an external converter binary exists", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "celeventic-vp-ext-"));
    try {
      const converter = await writeFailingZscaleConverter(dir);
      process.env.CELEVENTIC_VIDEO_CONVERTER_PATH = converter;
      delete process.env.VIDEO_USE_EXTERNAL_CONVERTER;
      delete process.env.VIDEO_PROCESSOR_PATH;

      assert.equal(hasExternalConverter(), true, "fixture converter must exist on disk");
      assert.equal(shouldAttemptExternalConverter(), false, "default must prefer adaptive ffmpeg");

      const input = await makeTinyH264Mp4();
      const result = await processVideoFile(input, { extensionHint: "mp4", timeoutMs: 60_000 });
      assert.equal(result.success, true, result.error);
      assert.ok(
        result.method === "ffmpeg-remux" || result.method === "ffmpeg-transcode",
        `expected adaptive ffmpeg method, got ${result.method}`
      );
      assert.ok(result.outputBuffer && result.outputBuffer.length > 0);
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it("falls through to adaptive ffmpeg when an opted-in external converter fails with zscale + partial output", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "celeventic-vp-fail-"));
    try {
      const converter = await writeFailingZscaleConverter(dir);
      process.env.CELEVENTIC_VIDEO_CONVERTER_PATH = converter;
      process.env.VIDEO_USE_EXTERNAL_CONVERTER = "true";
      delete process.env.VIDEO_PROCESSOR_PATH;

      assert.equal(shouldAttemptExternalConverter(), true);

      const input = await makeTinyH264Mp4();
      const result = await processVideoFile(input, { extensionHint: "mp4", timeoutMs: 60_000 });
      assert.equal(result.success, true, result.error);
      assert.notEqual(result.method, "external-converter", "failed external convert must not win");
      assert.ok(
        result.method === "ffmpeg-remux" || result.method === "ffmpeg-transcode",
        `expected adaptive ffmpeg fallthrough, got ${result.method}`
      );
      // Must not have shipped the converter's partial garbage bytes.
      assert.ok(result.outputBuffer && result.outputBuffer.length > 20);
      assert.notEqual(result.outputBuffer!.subarray(0, 15).toString("utf8"), "partial-corrupt");
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  });
});

describe("Semaphore — bounds concurrent ffmpeg/converter runs", () => {
  it("only allows `max` concurrent holders and queues the rest", async () => {
    const sem = new Semaphore(1);
    const release1 = await sem.acquire();
    assert.equal(sem.activeCount, 1);

    let secondAcquired = false;
    const pending = sem.acquire().then((release2) => {
      secondAcquired = true;
      release2();
    });

    await new Promise((r) => setTimeout(r, 10));
    assert.equal(secondAcquired, false, "second acquire must wait while the first holds the slot");
    assert.equal(sem.queueLength, 1);

    release1();
    await pending;
    assert.equal(secondAcquired, true);
    assert.equal(sem.activeCount, 0);
  });

  it("allows up to `max` concurrent holders simultaneously", async () => {
    const sem = new Semaphore(2);
    const r1 = await sem.acquire();
    const r2 = await sem.acquire();
    assert.equal(sem.activeCount, 2);
    r1();
    r2();
  });
});
