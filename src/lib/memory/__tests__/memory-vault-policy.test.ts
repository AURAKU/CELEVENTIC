import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MEMORY_VAULT_VIDEO_UPLOADS_ENABLED,
  memoryVaultPhotosOnlyMessage,
  resolvePublicMemoryMediaType,
} from "../memory-vault-policy";

describe("memory vault photos-only policy", () => {
  it("keeps guest video ingest off until reopened", () => {
    assert.equal(MEMORY_VAULT_VIDEO_UPLOADS_ENABLED, false);
    assert.match(memoryVaultPhotosOnlyMessage(), /photos only/i);
  });

  it("lists public album as images only while videos are off", () => {
    assert.equal(resolvePublicMemoryMediaType(null), "image");
    assert.equal(resolvePublicMemoryMediaType("video"), "image");
    assert.equal(resolvePublicMemoryMediaType("image"), "image");
  });
});
