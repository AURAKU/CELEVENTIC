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

/** Filter-graph capabilities only — the minimal set `buildVideoFilter` needs to pick a pipeline. */
export interface FfmpegCapabilities {
  hasZscale: boolean;
  hasTonemap: boolean;
}

/**
 * Broader, diagnostic capability set — used for preflight checks (e.g. "does this build even
 * have an HEVC decoder / libx264 / AAC encoder") so failures are reported clearly up front
 * instead of surfacing as an opaque ffmpeg exit code deep inside a transcode. Extends (rather
 * than replaces) `FfmpegCapabilities` so `buildVideoFilter`/`buildTranscodeArgs` keep their
 * narrow, easy-to-mock signature.
 */
export interface FfmpegFullCapabilities extends FfmpegCapabilities {
  hasLibx264: boolean;
  hasAac: boolean;
  hasHevcDecoder: boolean;
}

/** Returns the raw stdout of `ffmpeg -hide_banner -filters`. Swappable in tests via `supportsFilter`'s/`getAvailableFfmpegFilters`'s optional `probe` param. */
export type FfmpegFiltersProbe = () => Promise<string>;
export type FfmpegEncodersProbe = () => Promise<string>;
export type FfmpegDecodersProbe = () => Promise<string>;

function runFfmpegListCommand(flag: "-filters" | "-encoders" | "-decoders"): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      getFfmpegBin(),
      ["-hide_banner", flag],
      { timeout: 15_000, killSignal: "SIGKILL", maxBuffer: 8 * 1024 * 1024, windowsHide: true },
      (error, stdout) => {
        // Some FFmpeg builds exit non-zero for these list commands under odd conditions even
        // while still printing a usable list on stdout — prefer using whatever text we got over
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

function defaultProbe(): Promise<string> {
  return runFfmpegListCommand("-filters");
}

function defaultEncodersProbe(): Promise<string> {
  return runFfmpegListCommand("-encoders");
}

function defaultDecodersProbe(): Promise<string> {
  return runFfmpegListCommand("-decoders");
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

/**
 * Parses `ffmpeg -encoders` / `ffmpeg -decoders` output into a set of registered codec names.
 * Pure and dependency-free. Real output looks like:
 *   Encoders:
 *    V..... = Video
 *    A..... = Audio
 *    ......
 *    V..X.. libx264              libx264 H.264 / AVC / MPEG-4 AVC (codec h264)
 *    A..... aac                  AAC (Advanced Audio Coding)
 *   Decoders:
 *    V..... hevc                 HEVC (High Efficiency Video Coding)
 */
export function parseFfmpegCodecListOutput(raw: string): Set<string> {
  const names = new Set<string>();
  for (const line of raw.split(/\r?\n/)) {
    // Leading flag column (always exactly 6 chars of letters/dots for encoders/decoders),
    // then the codec name, then a description. Excludes legend lines like " V..... = Video"
    // (captured "name" would be a literal "=") and separator lines.
    const match = line.match(/^\s*[A-Za-z.]{6}\s+(\S+)\s+\S/);
    if (match && match[1] !== "=") names.add(match[1]);
  }
  return names;
}

let cachedFilters: Set<string> | null = null;
let inFlightProbe: Promise<Set<string>> | null = null;
let cachedEncoders: Set<string> | null = null;
let inFlightEncodersProbe: Promise<Set<string>> | null = null;
let cachedDecoders: Set<string> | null = null;
let inFlightDecodersProbe: Promise<Set<string>> | null = null;

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

/** In-process cache of the current FFmpeg binary's registered encoders. Probed at most once. */
export async function getAvailableFfmpegEncoders(probe: FfmpegEncodersProbe = defaultEncodersProbe): Promise<Set<string>> {
  if (cachedEncoders) return cachedEncoders;
  if (!inFlightEncodersProbe) {
    inFlightEncodersProbe = probe()
      .then(parseFfmpegCodecListOutput)
      .catch(() => new Set<string>())
      .then((encoders) => {
        cachedEncoders = encoders;
        inFlightEncodersProbe = null;
        return encoders;
      });
  }
  return inFlightEncodersProbe;
}

/** In-process cache of the current FFmpeg binary's registered decoders. Probed at most once. */
export async function getAvailableFfmpegDecoders(probe: FfmpegDecodersProbe = defaultDecodersProbe): Promise<Set<string>> {
  if (cachedDecoders) return cachedDecoders;
  if (!inFlightDecodersProbe) {
    inFlightDecodersProbe = probe()
      .then(parseFfmpegCodecListOutput)
      .catch(() => new Set<string>())
      .then((decoders) => {
        cachedDecoders = decoders;
        inFlightDecodersProbe = null;
        return decoders;
      });
  }
  return inFlightDecodersProbe;
}

/** True when the running FFmpeg binary registers the named filter (e.g. "zscale", "tonemap"). */
export async function supportsFilter(name: string, probe?: FfmpegFiltersProbe): Promise<boolean> {
  const filters = await getAvailableFfmpegFilters(probe);
  return filters.has(name);
}

/** True when the running FFmpeg binary registers the named encoder (e.g. "libx264", "aac"). */
export async function supportsEncoder(name: string, probe?: FfmpegEncodersProbe): Promise<boolean> {
  const encoders = await getAvailableFfmpegEncoders(probe);
  return encoders.has(name);
}

/** True when the running FFmpeg binary registers the named decoder (e.g. "hevc"). */
export async function supportsDecoder(name: string, probe?: FfmpegDecodersProbe): Promise<boolean> {
  const decoders = await getAvailableFfmpegDecoders(probe);
  return decoders.has(name);
}

/** Convenience: both filters required by the HDR→SDR tonemap pipeline are present. */
export async function getHdrTonemapCapabilities(probe?: FfmpegFiltersProbe): Promise<FfmpegCapabilities> {
  const [hasZscale, hasTonemap] = await Promise.all([supportsFilter("zscale", probe), supportsFilter("tonemap", probe)]);
  return { hasZscale, hasTonemap };
}

/**
 * Full diagnostic capability set for this FFmpeg binary — cached, at most one probe per kind
 * per process. Used by `video-processor.ts` for a clear preflight error (e.g. "no HEVC decoder
 * in this ffmpeg build") instead of an opaque failure deep inside a transcode.
 */
export async function getFfmpegFullCapabilities(probes?: {
  filters?: FfmpegFiltersProbe;
  encoders?: FfmpegEncodersProbe;
  decoders?: FfmpegDecodersProbe;
}): Promise<FfmpegFullCapabilities> {
  const [hasZscale, hasTonemap, hasLibx264, hasAac, hasHevcDecoder] = await Promise.all([
    supportsFilter("zscale", probes?.filters),
    supportsFilter("tonemap", probes?.filters),
    supportsEncoder("libx264", probes?.encoders),
    supportsEncoder("aac", probes?.encoders),
    supportsDecoder("hevc", probes?.decoders),
  ]);
  return { hasZscale, hasTonemap, hasLibx264, hasAac, hasHevcDecoder };
}

/** Test-only escape hatch — clears the in-process cache so tests can probe a fresh mocked binary. */
export function resetFfmpegCapabilitiesCacheForTests(): void {
  cachedFilters = null;
  inFlightProbe = null;
  cachedEncoders = null;
  inFlightEncodersProbe = null;
  cachedDecoders = null;
  inFlightDecodersProbe = null;
}
