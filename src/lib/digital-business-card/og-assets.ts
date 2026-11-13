import { readFile } from "fs/promises";
import path from "path";
import { generateBrandedQrPng } from "@/lib/qr/branded-qr-generator";
import { getAppUrlFromEnv, isLocalHost } from "@/lib/app-url";
import type { DigitalCardTheme } from "@/lib/digital-business-card/themes";
import type { DigitalCardSocials } from "@/lib/digital-business-card/socials";

const SAFE_PUBLIC_PREFIXES = ["/digital-cards/", "/brand/", "/uploads/", "/smartcard/"];

export async function localCeleCardPhotoDataUrl(rel: string): Promise<string | null> {
  if (!SAFE_PUBLIC_PREFIXES.some((prefix) => rel.startsWith(prefix))) return null;
  try {
    const filePath = path.join(process.cwd(), "public", rel.replace(/^\/+/, ""));
    const buffer = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function celeCardPlateBitmapAssets(
  socials: Pick<DigitalCardSocials, "companyLogoUrl"> & { design?: { paperUrl?: string } | null },
  theme: Pick<DigitalCardTheme, "textureUrl">
) {
  const paperPath = socials.design?.paperUrl || theme.textureUrl || "";
  const [markSrc, paperSrc, companyLogoSrc] = await Promise.all([
    localCeleCardPhotoDataUrl("/digital-cards/brands/celeyou-mark.png"),
    paperPath.startsWith("/") ? localCeleCardPhotoDataUrl(paperPath) : Promise.resolve(null),
    socials.companyLogoUrl?.startsWith("/")
      ? localCeleCardPhotoDataUrl(socials.companyLogoUrl)
      : Promise.resolve(null),
  ]);
  return { markSrc, paperSrc, companyLogoSrc };
}

export async function safeCeleCardPhotoSrc(avatarUrl: string | null | undefined): Promise<string | null> {
  if (!avatarUrl || avatarUrl.startsWith("house:")) return null;
  if (avatarUrl.startsWith("/") && !avatarUrl.startsWith("//")) {
    return localCeleCardPhotoDataUrl(avatarUrl);
  }
  if (!/^https:\/\//i.test(avatarUrl)) return null;
  try {
    const origin = getAppUrlFromEnv();
    const parsed = new URL(avatarUrl);
    const originHost = new URL(origin).hostname;
    if (isLocalHost(parsed.hostname) || parsed.hostname !== originHost) return null;
    return avatarUrl;
  } catch {
    return null;
  }
}

/** Guide-mode QR as a data URL for ImageResponse. Never overlays a logo. */
export async function celeCardGuideQrDataUrl(destination: string, size: 512 | 1024 = 512): Promise<string | null> {
  if (!/^https?:\/\//i.test(destination)) return null;
  try {
    const png = await generateBrandedQrPng(destination, null, size, "guide");
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}
