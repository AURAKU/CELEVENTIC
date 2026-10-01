import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { addLiveAlbumFile, listLiveAlbum, removeLiveAlbumItem } from "../live-album-store";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

describe("live album store", () => {
  it("persists a guest upload and lets staff remove it by id", async () => {
    const key = `test-live-album-${Date.now()}`;
    const added = await addLiveAlbumFile({
      key,
      buffer: PNG,
      mimeType: "image/png",
      fileName: "guest.png",
      guestName: "Ama",
    });
    const listed = await listLiveAlbum(key);
    assert.equal(listed.some((item) => item.id === added.id), true);
    await removeLiveAlbumItem(key, added.id);
    const after = await listLiveAlbum(key);
    assert.equal(after.some((item) => item.id === added.id), false);
  });

  it("rejects removing an unknown memory", async () => {
    await assert.rejects(
      () => removeLiveAlbumItem(`test-live-album-missing-${Date.now()}`, "does-not-exist"),
      /Memory not found/
    );
  });
});
