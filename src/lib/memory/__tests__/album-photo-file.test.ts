import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAlbumPhotoFile } from "../album-photo-file";

function photo(name: string, type: string): File {
  return new File([new Uint8Array([0xff, 0xd8, 0xff])], name, { type });
}

describe("isAlbumPhotoFile", () => {
  it("accepts common raster types and empty MIME phone dumps", () => {
    assert.equal(isAlbumPhotoFile(photo("a.jpg", "image/jpeg")), true);
    assert.equal(isAlbumPhotoFile(photo("a.heic", "image/heic")), true);
    assert.equal(isAlbumPhotoFile(photo("a.png", "image/png")), true);
    assert.equal(isAlbumPhotoFile(photo("a.webp", "image/webp")), true);
    assert.equal(isAlbumPhotoFile(photo("a.gif", "image/gif")), true);
    assert.equal(isAlbumPhotoFile(photo("a.avif", "image/avif")), true);
    assert.equal(isAlbumPhotoFile(photo("a.bmp", "image/bmp")), true);
    assert.equal(isAlbumPhotoFile(photo("a.tiff", "image/tiff")), true);
    assert.equal(isAlbumPhotoFile(photo("IMG_0001.HEIC", "")), true);
    assert.equal(isAlbumPhotoFile(photo("blob", "application/octet-stream")), true);
    assert.equal(isAlbumPhotoFile(photo("image", "")), true);
  });

  it("rejects SVG, video, and obvious non-photos", () => {
    assert.equal(isAlbumPhotoFile(photo("logo.svg", "image/svg+xml")), false);
    assert.equal(isAlbumPhotoFile(photo("clip.mp4", "video/mp4")), false);
    assert.equal(isAlbumPhotoFile(photo("clip.mov", "")), false);
    assert.equal(isAlbumPhotoFile(photo("notes.pdf", "application/pdf")), false);
  });
});
