import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import {
  deleteS3Object,
  getAwsS3Config,
  getS3Object,
  isAwsS3Ready,
  putS3Object,
} from "@/lib/uploads/aws-s3";

/** Writable upload root — `/tmp` on serverless, `public/uploads` locally. */
export function getUploadRoot(): string {
  if (process.env.UPLOAD_DIR) return process.env.UPLOAD_DIR;
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join("/tmp", "celeventic-uploads");
  }
  return path.join(process.cwd(), "public", "uploads");
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath.replace(/^\/+/, "").replace(/^uploads\//, "").replace(/\\/g, "/");
}

export function resolveUploadPath(relativePath: string): string {
  const root = getUploadRoot();
  const normalized = normalizeRelativePath(relativePath);
  const full = path.normalize(path.join(root, normalized));
  if (!full.startsWith(path.normalize(root))) {
    throw new Error("Invalid upload path");
  }
  return full;
}

/** Public URL — API route for local disk; absolute CDN/S3 URL when AWS is configured. */
export function getPublicUploadUrl(relativePath: string): string {
  return `/api/uploads/${normalizeRelativePath(relativePath)}`;
}

/**
 * Persist an upload.
 * Prefer AWS S3 (+ CloudFront) from Admin Integrations or env; fall back to local disk.
 */
export async function storeUploadFile(
  category: string,
  subPath: string,
  fileName: string,
  buffer: Buffer
): Promise<{ url: string; relativePath: string }> {
  const relativePath = [category, subPath, fileName].filter(Boolean).join("/");

  if (await isAwsS3Ready()) {
    const { url } = await putS3Object(relativePath, buffer);
    return { url, relativePath };
  }

  const filePath = resolveUploadPath(relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
  return { url: getPublicUploadUrl(relativePath), relativePath };
}

/**
 * Persist an upload at an exact, pre-built relative path (no `category/subPath/fileName`
 * joining) — used by the video pipeline, which already generates a collision-proof key
 * (see `key-builder.ts`) at presign time and needs to write/read that exact path later from
 * a different request (upload -> background worker). Same S3-or-local-disk behavior as
 * `storeUploadFile`.
 */
export async function storeUploadFileAtRelativePath(
  relativePath: string,
  buffer: Buffer
): Promise<{ url: string; relativePath: string }> {
  if (await isAwsS3Ready()) {
    const { url } = await putS3Object(relativePath, buffer);
    return { url, relativePath };
  }

  const filePath = resolveUploadPath(relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
  return { url: getPublicUploadUrl(relativePath), relativePath };
}

/**
 * Read an upload by relative path.
 * Tries local disk first, then S3 (supports migrated / dual-write scenarios).
 */
export async function readUploadFile(relativePath: string): Promise<Buffer | null> {
  const normalized = normalizeRelativePath(relativePath);
  try {
    return await readFile(resolveUploadPath(normalized));
  } catch {
    try {
      return await readFile(path.join(process.cwd(), "public", "uploads", normalized));
    } catch {
      if (await isAwsS3Ready()) {
        return getS3Object(normalized);
      }
      return null;
    }
  }
}

/** Best-effort delete from local disk and/or S3. */
export async function deleteUploadFile(relativePath: string): Promise<void> {
  const normalized = normalizeRelativePath(relativePath);
  try {
    await unlink(resolveUploadPath(normalized));
  } catch {
    /* local miss is fine */
  }
  if (await isAwsS3Ready()) {
    await deleteS3Object(normalized);
  }
}

export async function getActiveStorageBackend(): Promise<"aws-s3" | "local"> {
  return (await isAwsS3Ready()) ? "aws-s3" : "local";
}

export function getStoragePublicBaseHint(): string | null {
  return getAwsS3Config()?.publicBaseUrl ?? null;
}
