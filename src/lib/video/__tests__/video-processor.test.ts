import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
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
  Semaphore,
  type ProbeResult,
} from "../video-processor";

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

  it("adds an HDR->SDR BT.709 tonemap chain when isHdr is true", () => {
    const chain = buildVideoFilterChain(probe({ isHdr: true, videoCodec: "hevc" }));
    assert.match(chain, /zscale=t=linear/);
    assert.match(chain, /tonemap=tonemap=hable/);
    assert.match(chain, /zscale=t=bt709:m=bt709:r=tv/);
    assert.match(chain, /format=yuv420p$/);
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
  const ORIGINAL = process.env.CELEVENTIC_VIDEO_CONVERTER_PATH;

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.CELEVENTIC_VIDEO_CONVERTER_PATH;
    else process.env.CELEVENTIC_VIDEO_CONVERTER_PATH = ORIGINAL;
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
