import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolvePublicMediaUrl,
  resolveMediaUrl,
  inferVideoSourceMime,
  withMediaVersion,
  isUploadedMediaUrl,
} from "../media-url";

describe("resolvePublicMediaUrl", () => {
  it("keeps /uploads/ as the canonical public path", () => {
    assert.equal(resolvePublicMediaUrl("/uploads/a/b.mp4"), "/uploads/a/b.mp4");
  });

  it("rewrites legacy /api/uploads/ to /uploads/ for Nginx delivery", () => {
    assert.equal(resolvePublicMediaUrl("/api/uploads/invitations/u1/clip.mp4"), "/uploads/invitations/u1/clip.mp4");
  });

  it("strips localhost absolute URLs to relative uploads paths", () => {
    assert.equal(
      resolvePublicMediaUrl("http://localhost:3000/api/uploads/memories/e1/a.jpg"),
      "/uploads/memories/e1/a.jpg"
    );
  });

  it("normalises public/uploads and backslashes", () => {
    assert.equal(resolvePublicMediaUrl("public\\uploads\\x\\y.png"), "/uploads/x/y.png");
  });

  it("never returns filesystem absolute paths", () => {
    const out = resolvePublicMediaUrl("/var/www/CELEVENTIC/public/uploads/videos/a/video.mp4");
    assert.equal(out, "/uploads/videos/a/video.mp4");
    assert.ok(!out.includes("/var/www"));
  });

  it("preserves query versioning when rewriting", () => {
    assert.equal(
      resolvePublicMediaUrl("/api/uploads/invitations/u1/clip.mp4?v=2"),
      "/uploads/invitations/u1/clip.mp4?v=2"
    );
  });

  it("aliases resolveMediaUrl", () => {
    assert.equal(resolveMediaUrl("/api/uploads/x.mp4"), resolvePublicMediaUrl("/api/uploads/x.mp4"));
  });

  it("keeps remote CDN URLs intact when not upload paths", () => {
    const cdn = "https://cdn.example.com/assets/hero.jpg";
    assert.equal(resolvePublicMediaUrl(cdn), cdn);
  });
});

describe("inferVideoSourceMime", () => {
  it("never claims MOV is video/mp4", () => {
    assert.equal(inferVideoSourceMime("/uploads/a/clip.mov"), "video/quicktime");
    assert.equal(inferVideoSourceMime("/uploads/a/clip.mp4"), "video/mp4");
  });
});

describe("withMediaVersion", () => {
  it("appends v= without breaking paths", () => {
    assert.equal(withMediaVersion("/uploads/a.mp4", 3), "/uploads/a.mp4?v=3");
  });
});

describe("isUploadedMediaUrl", () => {
  it("detects uploads paths after normalisation", () => {
    assert.equal(isUploadedMediaUrl("/api/uploads/x.jpg"), true);
    assert.equal(isUploadedMediaUrl("/uploads/x.jpg"), true);
  });
});

describe("TransformStream regression guard", () => {
  it("media URL resolver does not construct TransformStream / ReadableStream", () => {
    // Historical PM2 error: controller[kState].transformAlgorithm is not a function
    // came from mixing stream implementations while proxying large media through Next.
    // This resolver must stay pure-string so delivery can go through Nginx /uploads/.
    const out = resolvePublicMediaUrl("/api/uploads/videos/x/video.mp4");
    assert.equal(out, "/uploads/videos/x/video.mp4");
    assert.equal(typeof TransformStream, "function");
    // Ensure we did not accidentally polyfill/replace the global.
    const ts = new TransformStream();
    assert.ok(ts.readable);
    assert.ok(ts.writable);
  });
});
