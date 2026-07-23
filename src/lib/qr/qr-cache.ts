import { createHash } from "crypto";
import { mkdir, readFile, writeFile, access } from "fs/promises";
import path from "path";
import type { QrExportSize, QrLogoSizePreset } from "@/lib/qr/qr-constants";
import { QR_COMPOSITE_CACHE_VERSION, QR_DEFAULT_LOGO_SIZE } from "@/lib/qr/qr-constants";

const CACHE_DIR = path.join(process.cwd(), ".cache", "qr");

function cacheKey(token: string, size: number, centerHash: string, format: string, logoSize: QrLogoSizePreset) {
  return createHash("sha256")
    .update(`${QR_COMPOSITE_CACHE_VERSION}:${token}:${size}:${centerHash}:${format}:${logoSize}`)
    .digest("hex");
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
  centerImageUrl: string | null | undefined,
  logoSize: QrLogoSizePreset = QR_DEFAULT_LOGO_SIZE
): Promise<Buffer | null> {
  try {
    const key = cacheKey(token, size, centerHash(centerImageUrl), "png", logoSize);
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
  buffer: Buffer,
  logoSize: QrLogoSizePreset = QR_DEFAULT_LOGO_SIZE
) {
  try {
    await ensureDir();
    const key = cacheKey(token, size, centerHash(centerImageUrl), "png", logoSize);
    await writeFile(path.join(CACHE_DIR, `${key}.png`), buffer);
  } catch {
    // cache is best-effort
  }
}
