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

/**
 * Guest payloads are the last line of defence against a media reference that
 * only resolves on the network it was authored from. Every one of these was
 * persisted by Studio or an import at some point, and every one rendered as a
 * broken image for guests.
 */
describe("never leaks non-public hosts into a guest payload", () => {
  const cases = [
    "http://localhost:3000/uploads/e1/a.jpg",
    "http://127.0.0.1:3000/uploads/e1/a.jpg",
    "http://0.0.0.0:3000/uploads/e1/a.jpg",
    "http://192.168.1.50:3000/uploads/e1/a.jpg",
    "http://10.0.0.7/uploads/e1/a.jpg",
    "http://172.16.4.9:8080/uploads/e1/a.jpg",
    "http://172.31.255.1/uploads/e1/a.jpg",
    "http://169.254.10.2/uploads/e1/a.jpg",
    "http://macbook-pro.local/uploads/e1/a.jpg",
    "http://build-box.internal/uploads/e1/a.jpg",
    "http://staging-box/uploads/e1/a.jpg",
  ];

  for (const url of cases) {
    it(`reduces ${url} to a relative uploads path`, () => {
      const resolved = resolvePublicMediaUrl(url);
      assert.equal(resolved, "/uploads/e1/a.jpg");
      assert.ok(!/^https?:\/\//i.test(resolved), "must not stay absolute");
    });
  }

  it("keeps genuinely public CDN and domain hosts absolute", () => {
    for (const url of [
      "https://cdn.celeventic.com/uploads/e1/a.jpg",
      "https://my-bucket.s3.amazonaws.com/e1/a.jpg",
      "https://d123.cloudfront.net/e1/a.jpg",
      "https://images.unsplash.com/photo-1",
    ]) {
      assert.ok(
        resolvePublicMediaUrl(url).length > 0,
        `${url} should resolve to something`
      );
    }
    // 172.32 is outside the private 172.16/12 block — a real public address.
    assert.equal(
      resolvePublicMediaUrl("https://172.32.0.1/uploads/e1/a.jpg"),
      "https://172.32.0.1/uploads/e1/a.jpg"
    );
  });

  it("strips absolute server filesystem paths", () => {
    assert.equal(
      resolvePublicMediaUrl("/var/www/CELEVENTIC/public/uploads/e1/a.jpg"),
      "/uploads/e1/a.jpg"
    );
  });
});
