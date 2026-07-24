import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildRawVideoKey, sanitizeDisplayFilename } from "../key-builder";
import { RAW_VIDEO_KEY_PREFIX } from "../constants";

describe("buildRawVideoKey — server-generated S3 keys", () => {
  it("builds a key rooted under the raw video prefix, namespaced by category and owner", () => {
    const { key, id } = buildRawVideoKey("GUESTBOOK", "user_123", "mp4");
    assert.match(key, new RegExp(`^${RAW_VIDEO_KEY_PREFIX}/guestbook/user_123/[^/]+\\.mp4$`));
    assert.ok(key.includes(id));
  });

  it("never allows path traversal via a malicious ownerId", () => {
    const { key } = buildRawVideoKey("EVENT_SHORT", "../../etc/passwd", "mp4");
    assert.equal(key.includes(".."), false);
    assert.equal(key.includes("/etc/"), false);
  });

  it("never allows a malicious extension to inject a path or extra segment", () => {
    const { key } = buildRawVideoKey("ADMIN", "admin_1", "mp4/../../evil");
    assert.equal(key.includes(".."), false);
    assert.equal(key.split("/").length, RAW_VIDEO_KEY_PREFIX.split("/").length + 3);
  });

  it("generates a fresh unique id for every call", () => {
    const a = buildRawVideoKey("VENDOR_PORTFOLIO", "vendor_1", "mp4");
    const b = buildRawVideoKey("VENDOR_PORTFOLIO", "vendor_1", "mp4");
    assert.notEqual(a.id, b.id);
    assert.notEqual(a.key, b.key);
  });
});

describe("sanitizeDisplayFilename", () => {
  it("strips directory components, keeping only the base filename", () => {
    assert.equal(sanitizeDisplayFilename("/etc/passwd"), "passwd");
    assert.equal(sanitizeDisplayFilename("C:\\Users\\me\\video.mp4"), "video.mp4");
  });

  it("strips control characters", () => {
    const withControl = "video\u0000\u001f.mp4";
    assert.equal(/[\x00-\x1f]/.test(sanitizeDisplayFilename(withControl)), false);
  });

  it("falls back to a safe default for an empty result", () => {
    assert.equal(sanitizeDisplayFilename(""), "video");
  });
});
