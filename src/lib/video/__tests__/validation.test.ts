import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateVideoDescriptor, validateVideoSignature, validateFinalSize, extractExtension } from "../validation";
import { ALLOWED_VIDEO_EXTENSIONS, EXTENSION_MIME_MAP, isHevcCodec } from "../constants";
import { sniffVideoContainer, detectMp4VideoCodecHint } from "../container-sniff";

const ONE_MB = 1024 * 1024;
const MAX = 250 * ONE_MB;

function mp4Header(brand: string, extraAscii: string[] = []): Buffer {
  const size = Buffer.alloc(4);
  size.writeUInt32BE(32, 0);
  const parts = [size, Buffer.from("ftyp", "ascii"), Buffer.from(brand.padEnd(4, " "), "ascii")];
  for (const s of extraAscii) parts.push(Buffer.from(s, "ascii"));
  parts.push(Buffer.alloc(4096)); // padding so header windows (>8 bytes) are satisfied
  return Buffer.concat(parts);
}

function ebmlHeader(docType: "webm" | "matroska"): Buffer {
  const magic = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);
  return Buffer.concat([magic, Buffer.alloc(16), Buffer.from(docType, "ascii"), Buffer.alloc(256)]);
}

describe("validateVideoDescriptor — broad format allowlist", () => {
  for (const ext of ALLOWED_VIDEO_EXTENSIONS) {
    it(`accepts .${ext} with its canonical MIME type`, () => {
      const result = validateVideoDescriptor(
        { filename: `clip.${ext}`, mimeType: EXTENSION_MIME_MAP[ext], sizeBytes: 10 * ONE_MB },
        MAX
      );
      assert.equal(result.valid, true, result.reason);
      assert.equal(result.extension, ext);
    });
  }

  it("accepts an unknown/generic MIME type (application/octet-stream) when the extension is valid", () => {
    const result = validateVideoDescriptor({ filename: "IMG_1234.MOV", mimeType: "application/octet-stream", sizeBytes: 10 * ONE_MB }, MAX);
    assert.equal(result.valid, true);
    assert.equal(result.extension, "mov");
  });

  it("accepts an empty MIME type when the extension is valid (common for MKV/TS on some OSes)", () => {
    const result = validateVideoDescriptor({ filename: "recording.mkv", mimeType: "", sizeBytes: 10 * ONE_MB }, MAX);
    assert.equal(result.valid, true);
  });

  it("rejects a fake/disguised extension (executable renamed to .mp4)", () => {
    const result = validateVideoDescriptor({ filename: "totally-a-video.exe", mimeType: "application/octet-stream", sizeBytes: 1 * ONE_MB }, MAX);
    assert.equal(result.valid, false);
  });

  it("rejects zero-byte files", () => {
    const result = validateVideoDescriptor({ filename: "clip.mp4", mimeType: "video/mp4", sizeBytes: 0 }, MAX);
    assert.equal(result.valid, false);
    assert.match(result.reason ?? "", /empty|invalid size/i);
  });

  it("rejects oversized files for the category limit", () => {
    const result = validateVideoDescriptor({ filename: "clip.mp4", mimeType: "video/mp4", sizeBytes: MAX + 1 }, MAX);
    assert.equal(result.valid, false);
    assert.match(result.reason ?? "", /too large/i);
  });

  it("rejects filenames with path traversal / separators", () => {
    assert.equal(validateVideoDescriptor({ filename: "../../etc/passwd.mp4", mimeType: "video/mp4", sizeBytes: ONE_MB }, MAX).valid, false);
    assert.equal(validateVideoDescriptor({ filename: "a/b.mp4", mimeType: "video/mp4", sizeBytes: ONE_MB }, MAX).valid, false);
  });
});

describe("validateVideoSignature — post-upload byte-level checks", () => {
  it("accepts a real MP4 (H.264) signature", () => {
    const buf = mp4Header("isom", ["avc1"]);
    const result = validateVideoSignature(buf, "mp4");
    assert.equal(result.valid, true);
    assert.equal(result.detectedContainer, "mp4");
    assert.equal(result.detectedVideoCodec, "h264");
  });

  it("accepts HEVC inside an MP4 container and tags the codec, without rejecting", () => {
    const buf = mp4Header("isom", ["hev1"]);
    const result = validateVideoSignature(buf, "mp4");
    assert.equal(result.valid, true);
    assert.equal(result.detectedContainer, "mp4");
    assert.equal(result.detectedVideoCodec, "hevc");
  });

  it("accepts HEVC inside a MOV container (iPhone HEVC) via the 'hvc1' sample entry", () => {
    const buf = mp4Header("qt", ["hvc1"]);
    const result = validateVideoSignature(buf, "mov");
    assert.equal(result.valid, true);
    assert.equal(result.detectedContainer, "mov");
    assert.equal(result.detectedVideoCodec, "hevc");
  });

  it("accepts HEVC-in-MP4 even when the browser reported an unknown/generic MIME type", () => {
    // Simulates: client sent mimeType="application/octet-stream" (descriptor stage already
    // allowed it based on extension alone); the byte-level check is what actually confirms format.
    const descriptor = validateVideoDescriptor(
      { filename: "iphone-hevc.mp4", mimeType: "application/octet-stream", sizeBytes: 40 * ONE_MB },
      MAX
    );
    assert.equal(descriptor.valid, true);

    const buf = mp4Header("mp42", ["hvc1"]);
    const sig = validateVideoSignature(buf, descriptor.extension!);
    assert.equal(sig.valid, true);
    assert.equal(sig.detectedVideoCodec, "hevc");
  });

  it("accepts a real WebM (EBML) signature", () => {
    const result = validateVideoSignature(ebmlHeader("webm"), "webm");
    assert.equal(result.valid, true);
    assert.equal(result.detectedContainer, "webm");
  });

  it("rejects a corrupt/truncated file", () => {
    const result = validateVideoSignature(Buffer.from([0x00, 0x01]), "mp4");
    assert.equal(result.valid, false);
    assert.match(result.reason ?? "", /corrupt|truncated/i);
  });

  it("rejects an empty buffer", () => {
    const result = validateVideoSignature(Buffer.alloc(0), "mp4");
    assert.equal(result.valid, false);
  });

  it("rejects a Windows executable disguised with a .mp4 extension", () => {
    const exe = Buffer.concat([Buffer.from([0x4d, 0x5a]), Buffer.alloc(4096)]);
    const result = validateVideoSignature(exe, "mp4");
    assert.equal(result.valid, false);
    assert.match(result.reason ?? "", /executable/i);
  });

  it("rejects an HTML document disguised with a .mp4 extension", () => {
    const html = Buffer.from("<!DOCTYPE html><html><body>gotcha</body></html>".padEnd(600, " "), "ascii");
    const result = validateVideoSignature(html, "mp4");
    assert.equal(result.valid, false);
  });

  it("rejects a ZIP/Office archive disguised with a .mp4 extension", () => {
    const zip = Buffer.concat([Buffer.from("PK\x03\x04", "latin1"), Buffer.alloc(600)]);
    const result = validateVideoSignature(zip, "mp4");
    assert.equal(result.valid, false);
  });

  it("rejects an unrecognized container that isn't in the ambiguous-but-allowed set", () => {
    const junk = Buffer.alloc(4096, 0x41); // "AAAA..." — matches nothing
    const result = validateVideoSignature(junk, "mp4");
    assert.equal(result.valid, false);
  });
});

describe("validateFinalSize", () => {
  it("rejects zero actual bytes even if a size was claimed", () => {
    assert.equal(validateFinalSize(0, 10 * ONE_MB, MAX).valid, false);
  });

  it("rejects when the actual object exceeds the category max", () => {
    assert.equal(validateFinalSize(MAX + ONE_MB, MAX + ONE_MB, MAX).valid, false);
  });

  it("rejects gross tampering between claimed and actual size", () => {
    assert.equal(validateFinalSize(400 * ONE_MB, 5 * ONE_MB, MAX).valid, false);
  });

  it("allows minor multipart rounding drift", () => {
    assert.equal(validateFinalSize(10 * ONE_MB + 37, 10 * ONE_MB, MAX).valid, true);
  });
});

describe("container/codec sniffing helpers", () => {
  it("detects avc1 (H.264) vs hev1/hvc1 (HEVC) sample entries", () => {
    assert.equal(detectMp4VideoCodecHint(mp4Header("isom", ["avc1"])), "h264");
    assert.equal(detectMp4VideoCodecHint(mp4Header("isom", ["hev1"])), "hevc");
    assert.equal(detectMp4VideoCodecHint(mp4Header("qt", ["hvc1"])), "hevc");
    assert.equal(detectMp4VideoCodecHint(mp4Header("isom", [])), null);
  });

  it("isHevcCodec recognizes all common identifiers", () => {
    for (const id of ["hevc", "HEVC", "h265", "H.265", "hev1", "hvc1"]) {
      assert.equal(isHevcCodec(id), true, id);
    }
    assert.equal(isHevcCodec("h264"), false);
    assert.equal(isHevcCodec(null), false);
  });

  it("distinguishes AVI (RIFF) from other formats", () => {
    const avi = Buffer.concat([Buffer.from("RIFF", "ascii"), Buffer.alloc(4), Buffer.from("AVI ", "ascii"), Buffer.alloc(64)]);
    const result = sniffVideoContainer(avi);
    assert.equal(result.container, "avi");
  });

  it("recognizes MPEG-TS via repeating 0x47 sync bytes", () => {
    const ts = Buffer.alloc(188 * 4, 0x00);
    ts[0] = 0x47;
    ts[188] = 0x47;
    ts[376] = 0x47;
    const result = sniffVideoContainer(ts);
    assert.equal(result.container, "ts");
  });
});

describe("extractExtension", () => {
  it("handles uppercase and multi-dot filenames", () => {
    assert.equal(extractExtension("My Wedding Video.FINAL.MOV"), "mov");
    assert.equal(extractExtension("no-extension"), null);
  });
});
