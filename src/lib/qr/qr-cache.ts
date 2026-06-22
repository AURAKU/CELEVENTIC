import { createHash } from "crypto";
import { mkdir, readFile, writeFile, access } from "fs/promises";
import path from "path";
import type { QrExportSize } from "@/lib/qr/qr-constants";

const CACHE_DIR = path.join(process.cwd(), ".cache", "qr");

function cacheKey(token: string, size: number, centerHash: string, format: string) {
  return createHash("sha256").update(`${token}:${size}:${centerHash}:${format}`).digest("hex");
}

function centerHash(url: string | null | undefined) {
  return createHash("md5").update(url ?? "celeventic-default").digest("hex").slice(0, 12);
}

async function ensureDir() {
  await mkdir(CACHE_DIR, { recursive: true });
}

export async function getCachedQrPng(
  token: string,
  size: QrExportSize,
  centerImageUrl: string | null | undefined
): Promise<Buffer | null> {
  try {
    const key = cacheKey(token, size, centerHash(centerImageUrl), "png");
    const file = path.join(CACHE_DIR, `${key}.png`);
    await access(file);
    return readFile(file);
  } catch {
    return null;
  }
}

export async function setCachedQrPng(
  token: string,
  size: QrExportSize,
  centerImageUrl: string | null | undefined,
  buffer: Buffer
) {
  try {
    await ensureDir();
    const key = cacheKey(token, size, centerHash(centerImageUrl), "png");
    await writeFile(path.join(CACHE_DIR, `${key}.png`), buffer);
  } catch {
    // cache is best-effort
  }
}
