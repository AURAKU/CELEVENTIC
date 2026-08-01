import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * Regression: /api/uploads must never return TransformStream / ReadableStream bodies.
 * Large media delivery belongs to Nginx `/uploads/`; this route is Buffer/Uint8Array only.
 */
describe("api/uploads/[...path] — stream-safe media responses", () => {
  let tmpRoot: string;
  let prevUploadDir: string | undefined;
  let prevForceProxy: string | undefined;

  before(async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "celeventic-uploads-route-"));
    const invitations = path.join(tmpRoot, "invitations", "u1");
    await mkdir(invitations, { recursive: true });
    await writeFile(path.join(invitations, "clip.mp4"), Buffer.from("ftypisom-fake-video-bytes-0123456789"));
    await writeFile(path.join(invitations, "photo.jpg"), Buffer.from([0xff, 0xd8, 0xff, 0xd9, 1, 2, 3, 4]));

    prevUploadDir = process.env.UPLOAD_DIR;
    prevForceProxy = process.env.MEDIA_FORCE_API_PROXY;
    process.env.UPLOAD_DIR = tmpRoot;
    process.env.MEDIA_FORCE_API_PROXY = "1";
  });

  after(async () => {
    if (prevUploadDir === undefined) delete process.env.UPLOAD_DIR;
    else process.env.UPLOAD_DIR = prevUploadDir;
    if (prevForceProxy === undefined) delete process.env.MEDIA_FORCE_API_PROXY;
    else process.env.MEDIA_FORCE_API_PROXY = prevForceProxy;
    await rm(tmpRoot, { recursive: true, force: true });
  });

  async function loadRoute() {
    // Fresh import after env mutation.
    const mod = await import("../[...path]/route");
    return mod;
  }

  it("declares nodejs runtime (filesystem / Buffer path)", async () => {
    const mod = await loadRoute();
    assert.equal(mod.runtime, "nodejs");
  });

  it("serves invitation video with Uint8Array body (200) — no TransformStream", async () => {
    const { GET } = await loadRoute();
    const req = new Request("http://localhost/api/uploads/invitations/u1/clip.mp4");
    const res = await GET(req, { params: Promise.resolve({ path: ["invitations", "u1", "clip.mp4"] }) });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("Content-Type"), "video/mp4");
    assert.equal(res.headers.get("Accept-Ranges"), "bytes");
    assert.equal(res.headers.get("Content-Encoding"), "identity");
    const body = res.body;
    // NextResponse may expose a ReadableStream reader API for consumption, but the
    // handler constructed the body from Uint8Array — verify bytes round-trip.
    const buf = new Uint8Array(await res.arrayBuffer());
    assert.ok(buf.byteLength > 0);
    assert.ok(!(body instanceof TransformStream));
  });

  it("serves range request 206 for video", async () => {
    const { GET } = await loadRoute();
    const req = new Request("http://localhost/api/uploads/invitations/u1/clip.mp4", {
      headers: { Range: "bytes=0-3" },
    });
    const res = await GET(req, { params: Promise.resolve({ path: ["invitations", "u1", "clip.mp4"] }) });
    assert.equal(res.status, 206);
    assert.ok(res.headers.get("Content-Range")?.startsWith("bytes 0-3/"));
    const buf = new Uint8Array(await res.arrayBuffer());
    assert.equal(buf.byteLength, 4);
  });

  it("serves invitation / Memory Vault-style image bytes", async () => {
    const { GET } = await loadRoute();
    const req = new Request("http://localhost/api/uploads/invitations/u1/photo.jpg");
    const res = await GET(req, { params: Promise.resolve({ path: ["invitations", "u1", "photo.jpg"] }) });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("Content-Type"), "image/jpeg");
    const buf = new Uint8Array(await res.arrayBuffer());
    assert.equal(buf[0], 0xff);
  });

  it("source contract: nodejs runtime, redirect to /uploads, no stream conversions", async () => {
    const fs = await import("node:fs/promises");
    const routePath = path.join(process.cwd(), "src/app/api/uploads/[...path]/route.ts");
    const src = await fs.readFile(routePath, "utf8");
    assert.match(src, /export const runtime = "nodejs"/);
    assert.match(src, /NextResponse\.redirect/);
    assert.match(src, /MEDIA_FORCE_API_PROXY/);
    assert.match(src, /Uint8Array/);
    assert.doesNotMatch(src, /Readable\.toWeb|Readable\.fromWeb|new TransformStream|createReadStream\(/);
  });

  it("Thank You / Memory Vault media URLs resolve away from /api/uploads proxy", async () => {
    const { resolvePublicMediaUrl } = await import("@/lib/uploads/media-url");
    assert.equal(
      resolvePublicMediaUrl("/api/uploads/memories/e1/wish.jpg"),
      "/uploads/memories/e1/wish.jpg"
    );
    assert.equal(
      resolvePublicMediaUrl("/api/uploads/invitations/u1/processed/1-playback.mp4"),
      "/uploads/invitations/u1/processed/1-playback.mp4"
    );
    assert.equal(
      resolvePublicMediaUrl("/api/uploads/thank-you/e1/hero.jpg"),
      "/uploads/thank-you/e1/hero.jpg"
    );
  });
});
