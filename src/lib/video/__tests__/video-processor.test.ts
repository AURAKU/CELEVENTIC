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
  computeScaleBounds,
  buildVideoFilter,
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
  transcodeWithHdrFallback,
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

describe("computeScaleBounds — portrait/landscape-aware, never the old symmetric-only bound", () => {
  it("uses landscape bounds (1920 wide x 1080 tall box) for a landscape source", () => {
    assert.deepEqual(computeScaleBounds({ width: 1920, height: 1080, rotation: 0 }), { maxWidth: 1920, maxHeight: 1080 });
  });

  it("swaps to portrait bounds (1080 wide x 1920 tall box) for a portrait source — the bug this fixes", () => {
    // A naive min(1920,iw):min(1080,ih) box would squeeze a 1080x1920 phone clip into a
    // 1080x1080 square (shrinking it to ~608x1080) instead of preserving its native 1080x1920.
    assert.deepEqual(computeScaleBounds({ width: 1080, height: 1920, rotation: 0 }), { maxWidth: 1080, maxHeight: 1920 });
  });

  it("uses the POST-rotation orientation, not the raw stream orientation, for a 90°-rotated source", () => {
    // Raw stream is landscape (1920x1080) but a 90° rotation tag means the displayed frame is
    // portrait (1080x1920) — the bounding box must follow the displayed orientation.
    assert.deepEqual(computeScaleBounds({ width: 1920, height: 1080, rotation: 90 }), { maxWidth: 1080, maxHeight: 1920 });
    assert.deepEqual(computeScaleBounds({ width: 1920, height: 1080, rotation: 270 }), { maxWidth: 1080, maxHeight: 1920 });
  });

  it("a 180° rotation does not change orientation (still landscape)", () => {
    assert.deepEqual(computeScaleBounds({ width: 1920, height: 1080, rotation: 180 }), { maxWidth: 1920, maxHeight: 1080 });
  });

  it("falls back to a safe symmetric long-edge box when dimensions are unknown", () => {
    assert.deepEqual(computeScaleBounds({ width: null, height: null, rotation: 0 }), { maxWidth: 1920, maxHeight: 1920 });
  });
});

describe("buildVideoFilter — single source of truth for the -vf chain and pipeline choice", () => {
  it("reports pipeline 'sdr' for a non-HDR source, with no zscale/tonemap regardless of capabilities", () => {
    const { pipeline, filter } = buildVideoFilter(probe(), { hasZscale: true, hasTonemap: true });
    assert.equal(pipeline, "sdr");
    assert.doesNotMatch(filter, /zscale|tonemap/);
  });

  it("reports pipeline 'hdr-tonemap' when HDR and both filters are available", () => {
    const { pipeline, filter } = buildVideoFilter(probe({ isHdr: true, videoCodec: "hevc" }), { hasZscale: true, hasTonemap: true });
    assert.equal(pipeline, "hdr-tonemap");
    assert.match(filter, /zscale=t=linear/);
  });

  it("reports pipeline 'hdr-fallback' when HDR but zscale/tonemap are unavailable — never throws", () => {
    const { pipeline, filter } = buildVideoFilter(probe({ isHdr: true, videoCodec: "hevc" }), { hasZscale: false, hasTonemap: false });
    assert.equal(pipeline, "hdr-fallback");
    assert.doesNotMatch(filter, /zscale|tonemap|gbrpf32le/);
  });

  it("uses portrait-aware scale bounds for a portrait HDR source in the fallback pipeline", () => {
    const { filter } = buildVideoFilter(probe({ isHdr: true, videoCodec: "hevc", width: 1080, height: 1920 }), {
      hasZscale: false,
      hasTonemap: false,
    });
    assert.match(filter, /min\(1080,iw\)/);
    assert.match(filter, /min\(1920,ih\)/);
  });

  it("buildVideoFilterChain (back-compat wrapper) returns exactly buildVideoFilter(...).filter", () => {
    const p = probe({ isHdr: true, videoCodec: "hevc" });
    const caps = { hasZscale: true, hasTonemap: false };
    assert.equal(buildVideoFilterChain(p, caps), buildVideoFilter(p, caps).filter);
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

  it("never adds a second explicit rotate/transpose filter — -autorotate already bakes in rotation (no double-rotate)", () => {
    const args = buildTranscodeArgs("in.mov", "out.mp4", probe({ rotation: 90, width: 1920, height: 1080 }));
    const vfIdx = args.indexOf("-vf");
    assert.ok(vfIdx !== -1);
    const filter = args[vfIdx + 1];
    assert.doesNotMatch(filter, /transpose|rotate=/);
    // Still relies on -autorotate exactly once as the only rotation mechanism.
    assert.equal(args.filter((a) => a === "-autorotate").length, 1);
  });

  it("stamps explicit BT.709 color metadata on the output only for the hdr-fallback pipeline", () => {
    const hdrFallbackArgs = buildTranscodeArgs("in.mov", "out.mp4", probe({ isHdr: true, videoCodec: "hevc" }), {
      hasZscale: false,
      hasTonemap: false,
    });
    assert.ok(hdrFallbackArgs.includes("-color_primaries"));
    assert.ok(hdrFallbackArgs.includes("-colorspace"));

    const sdrArgs = buildTranscodeArgs("in.mov", "out.mp4", probe());
    assert.ok(!sdrArgs.includes("-color_primaries"));

    const hdrTonemapArgs = buildTranscodeArgs("in.mov", "out.mp4", probe({ isHdr: true, videoCodec: "hevc" }), {
      hasZscale: true,
      hasTonemap: true,
    });
    assert.ok(!hdrTonemapArgs.includes("-color_primaries"), "the tonemap filter chain already outputs bt709 pixels");
  });

  it("[yuvj420p -> yuv420p range] tags -color_range tv for the sdr pipeline — format=yuv420p alone doesn't resolve a full-range MJPEG/yuvj420p source", () => {
    const args = buildTranscodeArgs("in.mp4", "out.mp4", probe());
    const idx = args.indexOf("-color_range");
    assert.ok(idx !== -1, "-color_range must be present for the sdr pipeline");
    assert.equal(args[idx + 1], "tv");
  });

  it("[yuvj420p -> yuv420p range] tags -color_range tv for the hdr-fallback pipeline too", () => {
    const args = buildTranscodeArgs("in.mp4", "out.mp4", probe({ isHdr: true, videoCodec: "hevc" }), {
      hasZscale: false,
      hasTonemap: false,
    });
    const idx = args.indexOf("-color_range");
    assert.ok(idx !== -1);
    assert.equal(args[idx + 1], "tv");
  });

  it("[hdr-tonemap] does NOT add -color_range (the zscale chain already sets range via r=tv) — avoids double-tagging", () => {
    const args = buildTranscodeArgs("in.mov", "out.mp4", probe({ isHdr: true, videoCodec: "hevc" }), {
      hasZscale: true,
      hasTonemap: true,
    });
    assert.ok(!args.includes("-color_range"));
  });

  it("[even-dimensions override] an explicit filterOverride replaces the computed filter verbatim in the -vf arg, everything else (audio/color args) is unaffected", () => {
    const p = probe({ hasAudio: true });
    const overriddenFilter = "scale=100:200,format=yuv420p,scale=trunc(iw/2)*2:trunc(ih/2)*2";
    const args = buildTranscodeArgs("in.mp4", "out.mp4", p, { hasZscale: true, hasTonemap: true }, overriddenFilter);
    const vfIdx = args.indexOf("-vf");
    assert.equal(args[vfIdx + 1], overriddenFilter);
    assert.ok(args.includes("aac"), "audio decision must still follow the real probe, unaffected by the filter override");
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

/** Shared real-ffmpeg fixture — a genuinely valid, tiny H.264 MP4 — used by several suites below. */
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

  async function writeConverterThatExitsZeroWithGarbage(dir: string): Promise<string> {
    // Simulates a converter that reports success (exit 0, non-empty file) but the file is not
    // actually a valid video — must be caught by ffprobe validation, not just a non-empty check.
    const scriptPath = path.join(dir, "celeventic-process-video");
    const script = `#!/usr/bin/env bash
set -euo pipefail
OUTPUT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --output) OUTPUT="$2"; shift 2 ;;
    *) shift ;;
  esac
done
if [[ -n "\${OUTPUT}" ]]; then printf 'not-actually-a-video-just-bytes' > "\${OUTPUT}"; fi
exit 0
`;
    await writeFile(scriptPath, script, { encoding: "utf8" });
    await chmod(scriptPath, 0o755);
    return scriptPath;
  }

  it("does not trust a non-empty external-converter output alone — verifies with ffprobe and falls through if invalid", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "celeventic-vp-garbage-"));
    try {
      const converter = await writeConverterThatExitsZeroWithGarbage(dir);
      process.env.CELEVENTIC_VIDEO_CONVERTER_PATH = converter;
      process.env.VIDEO_USE_EXTERNAL_CONVERTER = "true";
      delete process.env.VIDEO_PROCESSOR_PATH;

      const input = await makeTinyH264Mp4();
      const result = await processVideoFile(input, { extensionHint: "mp4", timeoutMs: 60_000 });
      assert.equal(result.success, true, result.error);
      assert.notEqual(result.method, "external-converter", "exit-0-with-garbage must not be trusted as success");
      assert.ok(result.method === "ffmpeg-remux" || result.method === "ffmpeg-transcode");
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it("fails clearly (never crashes) when the input has no valid, decodable video stream", async () => {
    const garbage = Buffer.from("this is not a video file at all, just some plain text bytes");
    const result = await processVideoFile(garbage, { extensionHint: "mp4", timeoutMs: 30_000 });
    assert.equal(result.success, false);
    assert.match(result.error ?? "", /valid.*video stream/i);
  });
});

describe("even output dimensions — the exact reported bug: '[libx264] width not divisible by 2 (883x1920)' on a 1206x2622 portrait source", () => {
  it("end-to-end: transcodeWithHdrFallback on a REAL 1206x2622 portrait clip produces even width/height (884x1920), not the previously-crashing odd 883", async (t) => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "celeventic-vp-even-dims-"));
    const inputPath = path.join(dir, "portrait-1206x2622.mp4");
    const outputPath = path.join(dir, "out.mp4");
    try {
      await execFileAsync(
        process.env.FFMPEG_PATH?.trim() || "ffmpeg",
        [
          "-y",
          "-f", "lavfi",
          "-i", "testsrc=size=1206x2622:duration=1:rate=5",
          "-c:v", "libx264",
          "-pix_fmt", "yuv420p",
          inputPath,
        ],
        { timeout: 30_000 }
      ).catch(() => t.skip("ffmpeg unavailable/unable to generate the 1206x2622 fixture on this machine"));

      const portraitProbe = probe({ width: 1206, height: 2622, isHdr: false });
      const fullCaps = { hasZscale: false, hasTonemap: false, hasLibx264: true, hasAac: true, hasHevcDecoder: true };

      // Before the `force_divisible_by=2` fix this threw: "[libx264] width not divisible by 2
      // (883x1920)" — must not throw now, and the retry-on-divisibility safety net in
      // `runTranscodeAttempt` must never even need to engage.
      await transcodeWithHdrFallback(inputPath, outputPath, portraitProbe, 30_000, fullCaps);

      const { stdout } = await execFileAsync(process.env.FFPROBE_PATH?.trim() || "ffprobe", [
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "csv=p=0",
        outputPath,
      ]);
      const [w, h] = stdout.trim().split(",").map(Number);
      assert.ok(Number.isFinite(w) && Number.isFinite(h), "output must report real dimensions");
      assert.equal(w % 2, 0, `output width ${w} must be even — libx264 requires it`);
      assert.equal(h % 2, 0, `output height ${h} must be even — libx264 requires it`);
      assert.equal(h, 1920, "long edge must be capped at 1920");
      assert.ok(w < h, "must remain portrait");
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it("[belt-and-suspenders retry] when ffmpeg reports 'width not divisible by 2' despite force_divisible_by=2 (e.g. a future regression or exotic build), transcodeWithHdrFallback retries once with the even-dimensions safety filter appended and still succeeds", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "celeventic-vp-divisibility-retry-"));
    const inputPath = path.join(dir, "in.mp4");
    const outputPath = path.join(dir, "out.mp4");
    const fakeFfmpegPath = path.join(dir, "fake-ffmpeg-divisibility.sh");
    const originalFfmpegPath = process.env.FFMPEG_PATH;
    try {
      await writeFile(inputPath, await makeTinyH264Mp4());

      // A fake `ffmpeg` that deterministically reproduces the exact reported failure UNLESS the
      // `-vf` value contains the safety-net filter appended by `withEvenDimensionsSafety` — this
      // isolates and proves the RETRY mechanism itself, independently of whether the primary
      // `force_divisible_by=2` fix already prevents the failure from happening at all.
      await writeFile(
        fakeFfmpegPath,
        [
          "#!/bin/bash",
          "found=0",
          'for arg in "$@"; do',
          '  if [[ "$arg" == *"trunc(iw/2)*2"* ]]; then found=1; fi',
          "done",
          'if [[ "$found" -eq 1 ]]; then',
          '  exec ffmpeg "$@"',
          "else",
          '  echo "[libx264 @ 0x0] width not divisible by 2 (883x1920)" >&2',
          '  echo "Error while opening encoder - maybe incorrect parameters such as bit_rate, rate, width or height." >&2',
          "  exit 1",
          "fi",
          "",
        ].join("\n"),
        { encoding: "utf8" }
      );
      await chmod(fakeFfmpegPath, 0o755);
      process.env.FFMPEG_PATH = fakeFfmpegPath;

      const fullCaps = { hasZscale: false, hasTonemap: false, hasLibx264: true, hasAac: true, hasHevcDecoder: true };
      await transcodeWithHdrFallback(inputPath, outputPath, probe(), 30_000, fullCaps);

      const { stat } = await import("node:fs/promises");
      const st = await stat(outputPath);
      assert.ok(st.size > 0, "the retried attempt must still produce a valid, non-empty output");
    } finally {
      if (originalFfmpegPath === undefined) delete process.env.FFMPEG_PATH;
      else process.env.FFMPEG_PATH = originalFfmpegPath;
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  });
});

describe("processVideoFile — friendly, non-leaking error messages", () => {
  it("never exposes raw ffmpeg/ffprobe stderr (temp paths, filter-graph syntax) in the user-facing error — only the deliberately-worded preflight message", async () => {
    // Genuinely undecodable input reaches the SAME preflight message this module has always used
    // (already asserted elsewhere) — proving the sanitizer passes short, deliberate messages
    // through untouched, it does not rewrite everything into one generic sentence.
    const garbage = Buffer.from("this is not a video file at all, just some plain text bytes");
    const result = await processVideoFile(garbage, { extensionHint: "mp4", timeoutMs: 30_000 });
    assert.equal(result.success, false);
    assert.match(result.error ?? "", /valid.*video stream/i);
    assert.doesNotMatch(result.error ?? "", /\/tmp\/|\/private\/|Command failed|stderr/i);
  });

  it("collapses the generic '<bin> failed: <raw stderr>' leak into one short, friendly sentence instead of shipping ffmpeg internals to the client", async () => {
    // A corrupt-but-plausible-looking MP4 header reliably drives ffmpeg into the generic
    // "<bin> failed: ..." branch (not one of the deliberately-worded preflight checks) for at
    // least one of ffprobe/ffmpeg's calls in the pipeline.
    const dir = await mkdtemp(path.join(os.tmpdir(), "celeventic-vp-friendly-error-"));
    try {
      // Valid MP4 box structure (ftyp) followed by garbage — enough for some demuxers to start
      // "reading" a video stream and then fail deep inside decode/filter, exercising the raw
      // runProcess failure path rather than the early "no valid stream" preflight check.
      const bogus = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]),
        Buffer.alloc(4096, 0xff),
      ]);
      const result = await processVideoFile(bogus, { extensionHint: "mp4", timeoutMs: 30_000 });
      if (result.success) return; // some ffmpeg builds tolerate this fixture — not what this test targets
      assert.doesNotMatch(result.error ?? "", /\/tmp\/|\/private\/|Command failed|libavformat|libavcodec/i);
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  });
});

describe("transcodeWithHdrFallback — retries once, cleans up partial output, never fails the whole upload", () => {
  it("reproduces the exact production bug (HDR pipeline attempted, zscale missing) and recovers via retry", async () => {
    // This is the literal repro for 'No such filter: zscale' on macOS ffmpeg 8.1.2 / any build
    // without libzimg: force the HDR pipeline to be *attempted* (as if capabilities incorrectly
    // reported zscale/tonemap available) against whatever ffmpeg is actually installed on this
    // machine. On a build that truly lacks zscale, the first attempt fails and this function
    // must remove the partial output and retry with the plain scale/format pipeline instead of
    // throwing. On a build that does have zscale (e.g. Ubuntu VPS), the first attempt just
    // succeeds directly — either way, the function must resolve with valid output.
    const dir = await mkdtemp(path.join(os.tmpdir(), "celeventic-vp-hdr-retry-"));
    const inputPath = path.join(dir, "in.mp4");
    const outputPath = path.join(dir, "out.mp4");
    try {
      await writeFile(inputPath, await makeTinyH264Mp4());
      const hdrProbe = probe({ isHdr: true, videoCodec: "hevc", colorTransfer: "smpte2084" });
      const fullCaps = { hasZscale: true, hasTonemap: true, hasLibx264: true, hasAac: true, hasHevcDecoder: true };

      await transcodeWithHdrFallback(inputPath, outputPath, hdrProbe, 60_000, fullCaps);

      const { stat } = await import("node:fs/promises");
      const st = await stat(outputPath);
      assert.ok(st.size > 0, "must produce a non-empty output even after a mid-flight zscale failure");
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
