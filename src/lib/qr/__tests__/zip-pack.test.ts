import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createZipBufferFromEntries,
  createZipBufferFromFiles,
  sanitizeZipEntryName,
} from "@/lib/qr/zip-pack";

describe("sanitizeZipEntryName", () => {
  it("strips path traversal and directory components", () => {
    assert.equal(sanitizeZipEntryName("../../etc/passwd"), "passwd");
    assert.equal(sanitizeZipEntryName("/abs/path/qr.png"), "qr.png");
    assert.equal(sanitizeZipEntryName("..\\windows\\system32"), "system32");
  });

  it("falls back for empty or hostile names", () => {
    assert.equal(sanitizeZipEntryName(""), "file");
    assert.equal(sanitizeZipEntryName("..."), "file");
    assert.equal(sanitizeZipEntryName("@@@"), "file");
  });
});

describe("createZipBufferFromEntries", () => {
  it("creates a ZIP with one QR image entry", async () => {
    const buf = await createZipBufferFromEntries([
      { name: "event-guest.png", data: Buffer.from("fake-png-1") },
    ]);
    assert.ok(buf.length > 22);
    assert.equal(buf.subarray(0, 2).toString("hex"), "504b");
  });

  it("creates a ZIP with multiple QR images and a manifest", async () => {
    const buf = await createZipBufferFromEntries([
      { name: "a.png", data: Buffer.from("img-a") },
      { name: "b.png", data: Buffer.from("img-b") },
      {
        name: "manifest.json",
        data: JSON.stringify({ count: 2, format: "png" }),
      },
    ]);
    assert.ok(buf.length > 40);
    assert.equal(buf.subarray(0, 2).toString("hex"), "504b");
  });

  it("finalizes an empty pack", async () => {
    const buf = await createZipBufferFromEntries([]);
    assert.ok(buf.length >= 22);
    assert.equal(buf.subarray(0, 2).toString("hex"), "504b");
  });
});

describe("createZipBufferFromFiles", () => {
  it("archives files from disk and rejects invalid input", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cele-qr-zip-"));
    try {
      const a = join(dir, "one.png");
      const b = join(dir, "two.png");
      await writeFile(a, Buffer.from("png-one"));
      await writeFile(b, Buffer.from("png-two"));

      const buf = await createZipBufferFromFiles([a, b]);
      assert.equal(buf.subarray(0, 2).toString("hex"), "504b");

      await assert.rejects(() => createZipBufferFromFiles([""] as never), /invalid file path/);
      await assert.rejects(() => createZipBufferFromFiles(null as never), /must be an array/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("archiver import form", () => {
  it("exposes ZipArchive named export (no default export)", async () => {
    const mod = await import("archiver");
    assert.equal(typeof mod.ZipArchive, "function");
    assert.equal((mod as { default?: unknown }).default, undefined);
  });
});
