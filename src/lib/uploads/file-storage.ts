import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

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

/** Public URL — always served via API route for cross-environment consistency. */
export function getPublicUploadUrl(relativePath: string): string {
  return `/api/uploads/${normalizeRelativePath(relativePath)}`;
}

export async function storeUploadFile(
  category: string,
  subPath: string,
  fileName: string,
  buffer: Buffer
): Promise<{ url: string; relativePath: string }> {
  const relativePath = [category, subPath, fileName].filter(Boolean).join("/");
  const filePath = resolveUploadPath(relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
  return { url: getPublicUploadUrl(relativePath), relativePath };
}

export async function readUploadFile(relativePath: string): Promise<Buffer | null> {
  const normalized = normalizeRelativePath(relativePath);
  try {
    return await readFile(resolveUploadPath(normalized));
  } catch {
    try {
      return await readFile(path.join(process.cwd(), "public", "uploads", normalized));
    } catch {
      return null;
    }
  }
}
