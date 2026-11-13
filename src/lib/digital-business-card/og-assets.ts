import { readFile } from "fs/promises";
import path from "path";
import { generateBrandedQrPng } from "@/lib/qr/branded-qr-generator";
import { isCeleventicDomain, isLocalHost } from "@/lib/app-url";
import type { DigitalCardTheme } from "@/lib/digital-business-card/themes";
import type { DigitalCardSocials } from "@/lib/digital-business-card/socials";
import { getAwsS3Config } from "@/lib/uploads/aws-s3";
import { readUploadFile } from "@/lib/uploads/file-storage";

const SAFE_PUBLIC_PREFIXES = ["/digital-cards/", "/brand/", "/smartcard/"];
const MAX_SATORI_IMAGE_BYTES = 4_500_000;

function sniffImageMime(buffer: Buffer): string | null {
  if (buffer.length >= 12 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (buffer.length >= 6 && buffer.toString("ascii", 0, 3) === "GIF") return "image/gif";
  return null;
}

function bufferToDataUrl(buffer: Buffer | null | undefined): string | null {
  if (!buffer || buffer.length < 32 || buffer.length > MAX_SATORI_IMAGE_BYTES) return null;
  const mime = sniffImageMime(buffer);
  if (!mime) return null;
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

export function isSatoriSafeImageSrc(src?: string | null): src is string {
  return Boolean(src && src.startsWith("data:image/"));
}

function uploadRelativePath(rel: string): string | null {
  const clean = rel.split("?")[0] ?? rel;
  if (clean.startsWith("/uploads/")) return clean.slice("/uploads/".length);
  if (clean.startsWith("/api/uploads/")) return clean.slice("/api/uploads/".length);
  return null;
}

export async function localCeleCardPhotoDataUrl(rel: string): Promise<string | null> {
  const pathname = rel.split("?")[0] ?? rel;
  const uploadRel = uploadRelativePath(pathname);
  if (uploadRel) {
    try {
      return bufferToDataUrl(await readUploadFile(uploadRel));
    } catch {
      return null;
    }
  }
  if (!SAFE_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;
  try {
    const filePath = path.join(process.cwd(), "public", pathname.replace(/^\/+/, ""));
    return bufferToDataUrl(await readFile(filePath));
  } catch {
    return null;
  }
}

function isAllowedPhotoHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (isCeleventicDomain(host)) return true;
  if (host.endsWith(".amazonaws.com") || host.endsWith(".cloudfront.net")) return true;
  const cdn = getAwsS3Config()?.publicBaseUrl;
  if (!cdn) return false;
  try {
    return new URL(cdn).hostname.toLowerCase() === host;
  } catch {
    return false;
  }
}

async function httpToDataUrl(url: string): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (isLocalHost(parsed.hostname)) return null;
  if (!isAllowedPhotoHost(parsed.hostname)) return null;
  const asUpload = uploadRelativePath(parsed.pathname);
  if (asUpload && isCeleventicDomain(parsed.hostname)) {
    const local = await localCeleCardPhotoDataUrl(parsed.pathname);
    if (local) return local;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(parsed.href, {
      signal: controller.signal,
      redirect: "error",
      headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8" },
    });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return bufferToDataUrl(buffer);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function celeCardPlateBitmapAssets(
  socials: Pick<DigitalCardSocials, "companyLogoUrl"> & { design?: { paperUrl?: string } | null },
  theme: Pick<DigitalCardTheme, "textureUrl">
) {
  const paperPath = socials.design?.paperUrl || theme.textureUrl || "";
  const [markSrc, paperSrc, companyLogoSrc] = await Promise.all([
    localCeleCardPhotoDataUrl("/digital-cards/brands/celeyou-mark.png"),
    safeCeleCardPhotoSrc(paperPath || null),
    safeCeleCardPhotoSrc(socials.companyLogoUrl),
  ]);
  return { markSrc, paperSrc, companyLogoSrc };
}

/** Always a data URL. Never a remote URL — Satori HTTP fetches crash the OG pipe. */
export async function safeCeleCardPhotoSrc(avatarUrl: string | null | undefined): Promise<string | null> {
  if (!avatarUrl || avatarUrl.startsWith("house:")) return null;
  if (avatarUrl.startsWith("data:image/")) {
    return avatarUrl.length > MAX_SATORI_IMAGE_BYTES * 1.4 ? null : avatarUrl;
  }
  if (avatarUrl.startsWith("/") && !avatarUrl.startsWith("//")) {
    return localCeleCardPhotoDataUrl(avatarUrl);
  }
  if (/^https:\/\//i.test(avatarUrl)) return httpToDataUrl(avatarUrl);
  return null;
}

/** Guide-mode QR as a data URL for ImageResponse. Never overlays a logo. */
export async function celeCardGuideQrDataUrl(destination: string, size: 512 | 1024 = 512): Promise<string | null> {
  if (!/^https?:\/\//i.test(destination)) return null;
  try {
    const png = await generateBrandedQrPng(destination, null, size, "guide");
    return bufferToDataUrl(png);
  } catch {
    return null;
  }
}
