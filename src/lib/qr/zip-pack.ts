import { createReadStream } from "node:fs";
import { basename } from "node:path";
import { PassThrough } from "node:stream";
import { ZipArchive } from "archiver";

/**
 * Sanitize a ZIP entry name: no path traversal, no absolute paths,
 * no directory separators. Empty / hostile input becomes "file".
 */
export function sanitizeZipEntryName(raw: string): string {
  const base = basename(String(raw ?? "").replace(/\\/g, "/"));
  const cleaned = base
    .replace(/\0/g, "")
    .replace(/^\.+/, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return cleaned || "file";
}

/**
 * Build a ZIP buffer from absolute file paths.
 * Entry names are basename(file) after sanitization (relative to pack only).
 */
export function createZipBufferFromFiles(files: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(files)) {
      reject(new TypeError("files must be an array"));
      return;
    }

    const archive = new ZipArchive({ zlib: { level: 9 } });
    const stream = new PassThrough();
    const chunks: Buffer[] = [];
    let settled = false;

    const fail = (err: unknown) => {
      if (settled) return;
      settled = true;
      reject(err instanceof Error ? err : new Error(String(err)));
    };

    stream.on("data", (c) => chunks.push(Buffer.from(c)));
    stream.on("end", () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks));
    });
    stream.on("error", fail);
    archive.on("error", fail);
    archive.pipe(stream);

    for (const file of files) {
      if (typeof file !== "string" || !file.trim()) {
        fail(new TypeError("invalid file path in ZIP pack"));
        return;
      }
      const name = sanitizeZipEntryName(file);
      if (name.includes("..") || name.includes("/") || name.includes("\\")) {
        fail(new Error(`refusing unsafe ZIP entry name: ${name}`));
        return;
      }
      archive.append(createReadStream(file), { name });
    }

    void archive.finalize().catch(fail);
  });
}

/**
 * Build a ZIP from in-memory buffers (unit tests / light packs).
 */
export function createZipBufferFromEntries(
  entries: Array<{ name: string; data: Buffer | string }>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = new ZipArchive({ zlib: { level: 9 } });
    const stream = new PassThrough();
    const chunks: Buffer[] = [];
    let settled = false;

    const fail = (err: unknown) => {
      if (settled) return;
      settled = true;
      reject(err instanceof Error ? err : new Error(String(err)));
    };

    stream.on("data", (c) => chunks.push(Buffer.from(c)));
    stream.on("end", () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks));
    });
    stream.on("error", fail);
    archive.on("error", fail);
    archive.pipe(stream);

    for (const entry of entries) {
      const name = sanitizeZipEntryName(entry.name);
      archive.append(Buffer.from(entry.data), { name });
    }

    void archive.finalize().catch(fail);
  });
}
