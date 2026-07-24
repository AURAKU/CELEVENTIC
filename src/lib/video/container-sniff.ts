/**
 * Magic-byte container sniffing. Never trust a client-supplied extension or MIME type —
 * this inspects the actual bytes of the object (first ~4KB, fetched via an S3 ranged GET
 * after upload) to confirm it is really a video container, and to reject disguised
 * executables/archives/HTML even when renamed with a video extension.
 */

export interface DisallowedSignatureMatch {
  label: string;
}

const ASCII = (s: string) => Buffer.from(s, "ascii");

/** Signatures for file types that must always be rejected, regardless of claimed extension. */
function matchDisallowedSignature(buf: Buffer): DisallowedSignatureMatch | null {
  if (buf.length < 4) return null;

  if (buf[0] === 0x4d && buf[1] === 0x5a) return { label: "Windows executable (PE/EXE)" };
  if (buf[0] === 0x7f && buf.subarray(1, 4).toString("ascii") === "ELF") {
    return { label: "Unix/Linux executable (ELF)" };
  }
  const machO = buf.readUInt32BE(0);
  if ([0xfeedface, 0xfeedfacf, 0xcafebabe, 0xcefaedfe, 0xcffaedfe].includes(machO)) {
    return { label: "macOS executable (Mach-O)" };
  }
  if (buf[0] === 0x23 && buf[1] === 0x21) return { label: "Shell script" };
  const head = buf.subarray(0, 512).toString("latin1").toLowerCase();
  if (head.includes("<!doctype html") || head.includes("<html") || head.includes("<script")) {
    return { label: "HTML/script document" };
  }
  if (buf.subarray(0, 4).equals(ASCII("PK\x03\x04")) || buf.subarray(0, 4).equals(ASCII("PK\x05\x06"))) {
    return { label: "ZIP/Office/JAR archive" };
  }
  if (buf.subarray(0, 4).toString("latin1") === "Rar!") return { label: "RAR archive" };
  if (buf.subarray(0, 6).equals(Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]))) {
    return { label: "7-Zip archive" };
  }
  if (buf.subarray(0, 4).toString("latin1") === "%PDF") return { label: "PDF document" };
  if (buf.subarray(0, 2).toString("latin1") === "MZ" && buf.length > 0x40) return { label: "Windows executable (PE/EXE)" };
  return null;
}

export interface ContainerSniffResult {
  /** Best-guess container family, or null when unrecognized. */
  container: string | null;
  /** True when the signature was unambiguous (safe to trust for routing/processing decisions). */
  confident: boolean;
  disallowed: DisallowedSignatureMatch | null;
}

/**
 * Best-effort video codec hint for MP4/MOV-family containers. Looks for the HEVC sample-entry
 * fourCCs (`hev1`/`hvc1`) that QuickTime/Android/iOS write into the `stsd` box. This is a
 * heuristic byte scan, not a full box walk — it only needs to be reliable enough to tag the
 * asset as HEVC for informational/analytics purposes. It is NEVER used to reject a file:
 * HEVC is a fully supported source codec that MediaConvert transcodes to H.264 for delivery.
 */
export function detectMp4VideoCodecHint(buf: Buffer): "hevc" | "h264" | null {
  const window = buf.subarray(0, Math.min(buf.length, 262_144));
  if (containsAscii(window, "hev1") || containsAscii(window, "hvc1")) return "hevc";
  if (containsAscii(window, "avc1") || containsAscii(window, "avc3")) return "h264";
  return null;
}

function containsAscii(buf: Buffer, needle: string): boolean {
  return buf.includes(Buffer.from(needle, "ascii"));
}

/** Inspect the first bytes of a file and classify it. `buf` should be at least ~64KB when possible. */
export function sniffVideoContainer(buf: Buffer): ContainerSniffResult {
  const disallowed = matchDisallowedSignature(buf);
  if (disallowed) return { container: null, confident: true, disallowed };

  if (buf.length >= 12 && buf.subarray(4, 8).toString("latin1") === "ftyp") {
    const brand = buf.subarray(8, 12).toString("latin1").trim().toLowerCase();
    if (brand.startsWith("qt")) return { container: "mov", confident: true, disallowed: null };
    if (brand.startsWith("3g")) return { container: "3gp", confident: true, disallowed: null };
    return { container: "mp4", confident: true, disallowed: null };
  }
  if (buf.length >= 4 && buf.readUInt32BE(0) === 0x1a45dfa3) {
    // EBML — could be WebM or MKV; disambiguate via the DocType string a few bytes in.
    const window = buf.subarray(0, Math.min(buf.length, 512)).toString("latin1");
    if (window.includes("webm")) return { container: "webm", confident: true, disallowed: null };
    if (window.includes("matroska")) return { container: "mkv", confident: true, disallowed: null };
    return { container: "webm", confident: false, disallowed: null };
  }
  if (buf.length >= 12 && buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "AVI ") {
    return { container: "avi", confident: true, disallowed: null };
  }
  if (
    buf.length >= 16 &&
    buf.subarray(0, 16).equals(
      Buffer.from([0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11, 0xa6, 0xd9, 0x00, 0xaa, 0x00, 0x62, 0xce, 0x6c])
    )
  ) {
    return { container: "wmv", confident: true, disallowed: null };
  }
  if (buf.length >= 4 && buf.subarray(0, 3).toString("latin1") === "FLV" && buf[3] === 0x01) {
    return { container: "flv", confident: true, disallowed: null };
  }
  if (buf.length >= 4 && buf.subarray(0, 4).toString("latin1") === "OggS") {
    return { container: "ogv", confident: true, disallowed: null };
  }
  if (buf.length >= 4) {
    const startCode = buf.readUInt32BE(0);
    if (startCode === 0x000001ba || startCode === 0x000001b3) {
      return { container: "mpg", confident: true, disallowed: null };
    }
  }
  // MPEG-TS: sync byte 0x47 repeats every 188 bytes (or 192 for M2TS with a 4-byte timecode header).
  if (buf.length >= 188 * 3) {
    if (buf[0] === 0x47 && buf[188] === 0x47 && buf[376] === 0x47) {
      return { container: "ts", confident: true, disallowed: null };
    }
    if (buf.length >= 192 * 3 && buf[4] === 0x47 && buf[196] === 0x47 && buf[388] === 0x47) {
      return { container: "m2ts", confident: true, disallowed: null };
    }
  }
  if (
    buf.length >= 16 &&
    buf.subarray(0, 16).equals(
      Buffer.from([0x06, 0x0e, 0x2b, 0x34, 0x02, 0x05, 0x01, 0x01, 0x0d, 0x01, 0x02, 0x01, 0x01, 0x02, 0x00, 0x00])
    )
  ) {
    return { container: "mxf", confident: true, disallowed: null };
  }
  // DV (raw DIF) has no single universal magic; look for a plausible DIF block header.
  if (buf.length >= 3 && (buf[0] & 0xe0) === 0x00 && buf[1] === 0x00 && (buf[2] & 0xf0) === 0x00) {
    return { container: "dv", confident: false, disallowed: null };
  }

  return { container: null, confident: false, disallowed: null };
}
