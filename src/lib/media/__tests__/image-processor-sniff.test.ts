import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sniffImageFormat } from "../image-processor";

describe("sniffImageFormat", () => {
  it("detects JPEG, PNG, GIF, WebP, BMP, and TIFF", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]);
    const gif = Buffer.from("GIF89aAAAAAA", "ascii");
    const webp = Buffer.concat([Buffer.from("RIFF", "ascii"), Buffer.alloc(4), Buffer.from("WEBP", "ascii")]);
    const bmp = Buffer.concat([Buffer.from("BM", "ascii"), Buffer.alloc(10)]);
    const tiffLe = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

    assert.equal(sniffImageFormat(jpeg), "jpeg");
    assert.equal(sniffImageFormat(png), "png");
    assert.equal(sniffImageFormat(gif), "gif");
    assert.equal(sniffImageFormat(webp), "webp");
    assert.equal(sniffImageFormat(bmp), "bmp");
    assert.equal(sniffImageFormat(tiffLe), "tiff");
  });

  it("detects HEIC and AVIF ftyp brands", () => {
    const heic = Buffer.alloc(12);
    heic.write("xxxxftypheic", "ascii");
    const mif1 = Buffer.alloc(12);
    mif1.write("xxxxftypmif1", "ascii");
    const avif = Buffer.alloc(12);
    avif.write("xxxxftypavif", "ascii");
    assert.equal(sniffImageFormat(heic), "heic");
    assert.equal(sniffImageFormat(mif1), "heic");
    assert.equal(sniffImageFormat(avif), "avif");
  });
});
