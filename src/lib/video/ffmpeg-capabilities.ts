/**
 * Runtime FFmpeg *filter* capability detection — server-only.
 *
 * Different environments ship different FFmpeg builds: Homebrew macOS FFmpeg commonly omits
 * `zscale` (it depends on the optional `libzimg`), while the Ubuntu VPS build has it. Hard-coding
 * the HDR→SDR tonemap filter graph (`zscale`,`tonemap`,...) therefore made local uploads fail
 * outright with `No such filter: 'zscale'` even though the *fallback* SDR scale pipeline would
 * have worked fine.
 *
 * This module answers one question — "does this FFmpeg binary register filter X?" — by parsing
 * `ffmpeg -hide_banner -filters` once per process and caching the result. Callers (the video
 * processor) use it to pick the best filter graph available and never need to special-case a
 * given OS or FFmpeg distribution themselves.
 *
 * Safety:
 *   - Spawned via `execFile` with a literal argument array — never a shell string.
 *   - If the probe fails for any reason (FFmpeg missing, times out, unexpected output), this
 *     resolves to an *empty* capability set rather than throwing — every caller has a filter-free
 *     fallback pipeline, so "unknown capability" must never itself fail an upload.
 */

import { execFile } from "node:child_process";

function getFfmpegBin(): string {
  return process.env.FFMPEG_PATH?.trim() || "ffmpeg";
}

export interface FfmpegCapabilities {
  hasZscale: boolean;
  hasTonemap: boolean;
}

/** Returns the raw stdout of `ffmpeg -hide_banner -filters`. Swappable in tests via `supportsFilter`'s/`getAvailableFfmpegFilters`'s optional `probe` param. */
export type FfmpegFiltersProbe = () => Promise<string>;

function defaultProbe(): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      getFfmpegBin(),
      ["-hide_banner", "-filters"],
      { timeout: 15_000, killSignal: "SIGKILL", maxBuffer: 8 * 1024 * 1024, windowsHide: true },
      (error, stdout) => {
        // Some FFmpeg builds exit non-zero for `-filters` under odd conditions even while still
        // printing a usable filter list on stdout — prefer using whatever text we got over
        // treating every non-zero exit as a hard failure.
        if (error && !stdout) {
          reject(error);
          return;
        }
        resolve(stdout ? stdout.toString() : "");
      }
    );
  });
}

/**
 * Parses `ffmpeg -hide_banner -filters` output into a set of registered filter names.
 * Pure and dependency-free — safe to unit test with hand-written fixture text.
 *
 * Real output looks like (flag-column width varies by FFmpeg build, hence the flexible match):
 *   Filters:
 *     T.. = Timeline support
 *     .S. = Slice threading
 *     ..C = Command support
 *    ..C zscale            V->V       Apply resize, colorspace and bit depth conversion.
 *    T.C tonemap           V->V       Conversion to/from different dynamic ranges.
 */
export function parseFfmpegFiltersOutput(raw: string): Set<string> {
  const filters = new Set<string>();
  for (const line of raw.split(/\r?\n/)) {
    // Leading flag column (1-4 chars of letters/dots), then the filter name, then an I/O spec
    // that always contains "->" (e.g. "V->V", "AA->A", "N->A"). Legend/header lines (e.g.
    // "  T.. = Timeline support") never contain "->" so they never match.
    const match = line.match(/^\s*[A-Za-z.]{1,4}\s+(\S+)\s+\S*->\S*/);
    if (match) filters.add(match[1]);
  }
  return filters;
}

let cachedFilters: Set<string> | null = null;
let inFlightProbe: Promise<Set<string>> | null = null;

/** In-process cache of the current FFmpeg binary's registered filters. Probed at most once. */
export async function getAvailableFfmpegFilters(probe: FfmpegFiltersProbe = defaultProbe): Promise<Set<string>> {
  if (cachedFilters) return cachedFilters;
  if (!inFlightProbe) {
    inFlightProbe = probe()
      .then(parseFfmpegFiltersOutput)
      .catch(() => new Set<string>())
      .then((filters) => {
        cachedFilters = filters;
        inFlightProbe = null;
        return filters;
      });
  }
  return inFlightProbe;
}

/** True when the running FFmpeg binary registers the named filter (e.g. "zscale", "tonemap"). */
export async function supportsFilter(name: string, probe?: FfmpegFiltersProbe): Promise<boolean> {
  const filters = await getAvailableFfmpegFilters(probe);
  return filters.has(name);
}

/** Convenience: both filters required by the HDR→SDR tonemap pipeline are present. */
export async function getHdrTonemapCapabilities(probe?: FfmpegFiltersProbe): Promise<FfmpegCapabilities> {
  const [hasZscale, hasTonemap] = await Promise.all([supportsFilter("zscale", probe), supportsFilter("tonemap", probe)]);
  return { hasZscale, hasTonemap };
}

/** Test-only escape hatch — clears the in-process cache so tests can probe a fresh mocked binary. */
export function resetFfmpegCapabilitiesCacheForTests(): void {
  cachedFilters = null;
  inFlightProbe = null;
}
