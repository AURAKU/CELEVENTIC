import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  parseFfmpegFiltersOutput,
  getAvailableFfmpegFilters,
  supportsFilter,
  getHdrTonemapCapabilities,
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
