import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  parseFfmpegFiltersOutput,
  parseFfmpegCodecListOutput,
  getAvailableFfmpegFilters,
  getAvailableFfmpegEncoders,
  getAvailableFfmpegDecoders,
  supportsFilter,
  supportsEncoder,
  supportsDecoder,
  getHdrTonemapCapabilities,
  getFfmpegFullCapabilities,
  resetFfmpegCapabilitiesCacheForTests,
} from "../ffmpeg-capabilities";

// Realistic excerpts of `ffmpeg -hide_banner -filters` output for the two builds this bug report
// is actually about.
const UBUNTU_VPS_FILTERS_WITH_ZSCALE = `Filters:
  T.. = Timeline support
  .S. = Slice threading
  ..C = Command support
  A = Audio input/output
  V = Video input/output
  N = Dynamic number and/or type of input/output
  | = Source or sink filter
 ..C scale             V->V       Scale the input video size and/or convert the image format.
 ..C zscale            V->V       Apply resize, colorspace and bit depth conversion.
 T.C tonemap           V->V       Conversion to/from different dynamic ranges.
 ..C format            V->V       Force libavfilter not to use any of the specified pixel formats for the input to the next filter.
`;

const HOMEBREW_MACOS_FILTERS_WITHOUT_ZSCALE = `Filters:
  T.. = Timeline support
  .S. = Slice threading
  A = Audio input/output
  V = Video input/output
  N = Dynamic number and/or type of input/output
  | = Source or sink filter
  ------
 .. scale             V->V       Scale the input video size and/or convert the image format.
 .. format            V->V       Force libavfilter not to use any of the specified pixel formats for the input to the next filter.
`;

describe("parseFfmpegFiltersOutput", () => {
  it("extracts filter names from typical ffmpeg -filters output (3-char flag column)", () => {
    const filters = parseFfmpegFiltersOutput(UBUNTU_VPS_FILTERS_WITH_ZSCALE);
    assert.ok(filters.has("zscale"));
    assert.ok(filters.has("tonemap"));
    assert.ok(filters.has("scale"));
    assert.ok(filters.has("format"));
  });

  it("extracts filter names from a build with a narrower 2-char flag column", () => {
    const filters = parseFfmpegFiltersOutput(HOMEBREW_MACOS_FILTERS_WITHOUT_ZSCALE);
    assert.ok(filters.has("scale"));
    assert.ok(!filters.has("zscale"));
    assert.ok(!filters.has("tonemap"));
  });

  it("ignores legend/header lines (no false positives from 'T..' or '=' lines)", () => {
    const filters = parseFfmpegFiltersOutput(HOMEBREW_MACOS_FILTERS_WITHOUT_ZSCALE);
    assert.ok(!filters.has("="));
    assert.ok(!filters.has("Timeline"));
    assert.ok(!filters.has("Filters:"));
  });

  it("returns an empty set for empty/garbage input instead of throwing", () => {
    assert.equal(parseFfmpegFiltersOutput("").size, 0);
    assert.equal(parseFfmpegFiltersOutput("not ffmpeg output at all").size, 0);
  });
});

describe("supportsFilter / getAvailableFfmpegFilters — probing and caching", () => {
  beforeEach(() => {
    resetFfmpegCapabilitiesCacheForTests();
  });

  it("reports true for a filter present in the (mocked) ffmpeg build", async () => {
    const mockProbe = async () => UBUNTU_VPS_FILTERS_WITH_ZSCALE;
    assert.equal(await supportsFilter("zscale", mockProbe), true);
    assert.equal(await supportsFilter("tonemap", mockProbe), true);
  });

  it("reports false for a filter missing from the (mocked) ffmpeg build — never throws", async () => {
    const mockProbe = async () => HOMEBREW_MACOS_FILTERS_WITHOUT_ZSCALE;
    assert.equal(await supportsFilter("zscale", mockProbe), false);
    assert.equal(await supportsFilter("tonemap", mockProbe), false);
  });

  it("caches the probe result in-process — the probe function only runs once across repeated calls", async () => {
    let calls = 0;
    const mockProbe = async () => {
      calls++;
      return UBUNTU_VPS_FILTERS_WITH_ZSCALE;
    };
    await supportsFilter("zscale", mockProbe);
    await supportsFilter("tonemap", mockProbe);
    await getAvailableFfmpegFilters(mockProbe);
    assert.equal(calls, 1, "the underlying `ffmpeg -filters` probe must only run once and be cached");
  });

  it("resolves to an empty capability set (never throws) when the probe itself fails", async () => {
    const failingProbe = async (): Promise<string> => {
      throw new Error("ffmpeg: command not found");
    };
    const filters = await getAvailableFfmpegFilters(failingProbe);
    assert.equal(filters.size, 0);
    assert.equal(await supportsFilter("zscale", failingProbe), false);
  });

  it("de-duplicates concurrent in-flight probes into a single underlying call", async () => {
    let calls = 0;
    const mockProbe = async () => {
      calls++;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return UBUNTU_VPS_FILTERS_WITH_ZSCALE;
    };
    const [a, b] = await Promise.all([
      getAvailableFfmpegFilters(mockProbe),
      getAvailableFfmpegFilters(mockProbe),
    ]);
    assert.equal(calls, 1);
    assert.deepEqual([...a], [...b]);
  });
});

describe("getHdrTonemapCapabilities", () => {
  beforeEach(() => {
    resetFfmpegCapabilitiesCacheForTests();
  });

  it("reports both capabilities available on a full-featured build", async () => {
    const mockProbe = async () => UBUNTU_VPS_FILTERS_WITH_ZSCALE;
    assert.deepEqual(await getHdrTonemapCapabilities(mockProbe), { hasZscale: true, hasTonemap: true });
  });

  it("reports both unavailable on a build missing zscale/tonemap", async () => {
    const mockProbe = async () => HOMEBREW_MACOS_FILTERS_WITHOUT_ZSCALE;
    assert.deepEqual(await getHdrTonemapCapabilities(mockProbe), { hasZscale: false, hasTonemap: false });
  });
});

// Realistic excerpts of `ffmpeg -encoders` / `ffmpeg -decoders` output.
const ENCODERS_WITH_LIBX264_AND_AAC = `Encoders:
 V..... = Video
 A..... = Audio
 S..... = Subtitle
 .F.... = Frame-level multithreading
 ..S... = Slice-level multithreading
 ...X.. = Codec is experimental
 ....B. = Supports draw_horiz_band
 .....D = Supports direct rendering method 1
 ------
 V..... a64multi             Multicolor charset for Commodore 64 (codec a64_multi)
 V..X.. libx264              libx264 H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10 (codec h264)
 A..... aac                  AAC (Advanced Audio Coding)
 A..... libmp3lame           libmp3lame MP3 (MPEG audio layer 3) (codec mp3)
`;

const ENCODERS_WITHOUT_LIBX264 = `Encoders:
 V..... = Video
 A..... = Audio
 ------
 V..... mpeg4                MPEG-4 part 2
 A..... libmp3lame           libmp3lame MP3 (MPEG audio layer 3) (codec mp3)
`;

const DECODERS_WITH_HEVC = `Decoders:
 V..... = Video
 A..... = Audio
 ------
 V..... hevc                 HEVC (High Efficiency Video Coding)
 V..... h264                 H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10
`;

const DECODERS_WITHOUT_HEVC = `Decoders:
 V..... = Video
 A..... = Audio
 ------
 V..... h264                 H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10
`;

describe("parseFfmpegCodecListOutput", () => {
  it("extracts encoder names from `ffmpeg -encoders` output", () => {
    const encoders = parseFfmpegCodecListOutput(ENCODERS_WITH_LIBX264_AND_AAC);
    assert.ok(encoders.has("libx264"));
    assert.ok(encoders.has("aac"));
    assert.ok(encoders.has("libmp3lame"));
  });

  it("extracts decoder names from `ffmpeg -decoders` output", () => {
    const decoders = parseFfmpegCodecListOutput(DECODERS_WITH_HEVC);
    assert.ok(decoders.has("hevc"));
    assert.ok(decoders.has("h264"));
  });

  it("does not include a codec absent from the list", () => {
    assert.ok(!parseFfmpegCodecListOutput(ENCODERS_WITHOUT_LIBX264).has("libx264"));
    assert.ok(!parseFfmpegCodecListOutput(DECODERS_WITHOUT_HEVC).has("hevc"));
  });

  it("returns an empty set for empty/garbage input instead of throwing", () => {
    assert.equal(parseFfmpegCodecListOutput("").size, 0);
    assert.equal(parseFfmpegCodecListOutput("not ffmpeg output at all").size, 0);
  });
});

describe("supportsEncoder / supportsDecoder / getAvailableFfmpegEncoders / getAvailableFfmpegDecoders", () => {
  beforeEach(() => {
    resetFfmpegCapabilitiesCacheForTests();
  });

  it("reports true for an encoder present in the (mocked) build", async () => {
    const mockProbe = async () => ENCODERS_WITH_LIBX264_AND_AAC;
    assert.equal(await supportsEncoder("libx264", mockProbe), true);
    assert.equal(await supportsEncoder("aac", mockProbe), true);
  });

  it("reports false for an encoder missing from the (mocked) build", async () => {
    const mockProbe = async () => ENCODERS_WITHOUT_LIBX264;
    assert.equal(await supportsEncoder("libx264", mockProbe), false);
  });

  it("reports true/false for HEVC decoder availability", async () => {
    assert.equal(await supportsDecoder("hevc", async () => DECODERS_WITH_HEVC), true);
    resetFfmpegCapabilitiesCacheForTests();
    assert.equal(await supportsDecoder("hevc", async () => DECODERS_WITHOUT_HEVC), false);
  });

  it("caches encoders/decoders probes independently — each probe runs at most once", async () => {
    let encoderCalls = 0;
    let decoderCalls = 0;
    const mockEncoders = async () => {
      encoderCalls++;
      return ENCODERS_WITH_LIBX264_AND_AAC;
    };
    const mockDecoders = async () => {
      decoderCalls++;
      return DECODERS_WITH_HEVC;
    };
    await getAvailableFfmpegEncoders(mockEncoders);
    await getAvailableFfmpegEncoders(mockEncoders);
    await getAvailableFfmpegDecoders(mockDecoders);
    await getAvailableFfmpegDecoders(mockDecoders);
    assert.equal(encoderCalls, 1);
    assert.equal(decoderCalls, 1);
  });

  it("resolves to false (never throws) when the encoders/decoders probe itself fails", async () => {
    const failingProbe = async (): Promise<string> => {
      throw new Error("ffmpeg: command not found");
    };
    assert.equal(await supportsEncoder("libx264", failingProbe), false);
    assert.equal(await supportsDecoder("hevc", failingProbe), false);
  });
});

describe("getFfmpegFullCapabilities", () => {
  beforeEach(() => {
    resetFfmpegCapabilitiesCacheForTests();
  });

  it("aggregates filter + encoder + decoder capabilities into one object", async () => {
    const caps = await getFfmpegFullCapabilities({
      filters: async () => UBUNTU_VPS_FILTERS_WITH_ZSCALE,
      encoders: async () => ENCODERS_WITH_LIBX264_AND_AAC,
      decoders: async () => DECODERS_WITH_HEVC,
    });
    assert.deepEqual(caps, { hasZscale: true, hasTonemap: true, hasLibx264: true, hasAac: true, hasHevcDecoder: true });
  });

  it("reflects a constrained build (e.g. Homebrew macOS without libzimg) accurately", async () => {
    const caps = await getFfmpegFullCapabilities({
      filters: async () => HOMEBREW_MACOS_FILTERS_WITHOUT_ZSCALE,
      encoders: async () => ENCODERS_WITH_LIBX264_AND_AAC,
      decoders: async () => DECODERS_WITH_HEVC,
    });
    assert.deepEqual(caps, { hasZscale: false, hasTonemap: false, hasLibx264: true, hasAac: true, hasHevcDecoder: true });
  });
});
