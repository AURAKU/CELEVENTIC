import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMemorySafeBaseName,
  resolveMemoryOutputExtension,
  validateMemoryFile,
} from "../memory-upload-storage";

describe("memory-upload-storage extension + validation", () => {
  it("maps JPEG / PNG / WebP output extensions from MIME", () => {
    assert.equal(resolveMemoryOutputExtension("image/jpeg"), ".jpg");
    assert.equal(resolveMemoryOutputExtension("image/png"), ".png");
    assert.equal(resolveMemoryOutputExtension("image/webp"), ".webp");
  });

  it("maps MP4 and MOV (quicktime) video MIME to dotted extensions", () => {
    assert.equal(resolveMemoryOutputExtension("video/mp4"), ".mp4");
    assert.equal(resolveMemoryOutputExtension("video/quicktime"), ".mov");
  });

  it("falls back to .bin for unknown MIME (safe storage suffix)", () => {
    assert.equal(resolveMemoryOutputExtension("application/octet-stream"), ".bin");
    assert.equal(resolveMemoryOutputExtension("text/plain"), ".bin");
  });

  it("accepts JPEG/PNG/WebP/HEIC images and rejects unsupported MIME", () => {
    assert.equal(validateMemoryFile("image/jpeg", 1024, 50, 200).valid, true);
    assert.equal(validateMemoryFile("image/jpeg", 1024, 50, 200).mediaType, "image");
    assert.equal(validateMemoryFile("image/png", 1024, 50, 200).valid, true);
    assert.equal(validateMemoryFile("image/webp", 1024, 50, 200).valid, true);
    assert.equal(validateMemoryFile("image/heic", 1024, 50, 200, "iphone.heic").valid, true);
    assert.equal(validateMemoryFile("application/octet-stream", 1024, 50, 200, "iphone.heic").mediaType, "image");

    const bad = validateMemoryFile("application/pdf", 1024, 50, 200);
    assert.equal(bad.valid, false);
    assert.ok(bad.reason);
  });

  it("accepts MP4 and MOV where supported (MIME or extension)", () => {
    assert.equal(validateMemoryFile("video/mp4", 1024, 50, 200, "clip.mp4").valid, true);
    assert.equal(validateMemoryFile("video/mp4", 1024, 50, 200, "clip.mp4").mediaType, "video");
    assert.equal(validateMemoryFile("video/quicktime", 1024, 50, 200, "clip.mov").valid, true);
    assert.equal(
      validateMemoryFile("application/octet-stream", 1024, 50, 200, "iphone.mov").mediaType,
      "video"
    );
  });

  it("rejects unknown extension when MIME is also unsupported", () => {
    const result = validateMemoryFile("application/x-msdownload", 100, 50, 200, "payload.exe");
    assert.equal(result.valid, false);
  });

  it("builds unique safe base names", () => {
    const a = buildMemorySafeBaseName(1_700_000_000_000, () => 0.123456789);
    const b = buildMemorySafeBaseName(1_700_000_000_001, () => 0.987654321);
    assert.notEqual(a, b);
    assert.match(a, /^\d+-[a-z0-9]+$/);
    assert.match(b, /^\d+-[a-z0-9]+$/);
    assert.equal(a.includes("."), false);
  });
});
