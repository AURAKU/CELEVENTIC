import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";
import { getServerAppUrl } from "@/lib/app-url";
import { resolvePublicMediaUrl } from "@/lib/uploads/media-url";

function toAbsolute(appUrl: string, pathOrUrl: string | null | undefined): string | null {
  const raw = pathOrUrl?.trim();
  if (!raw) return null;
  const resolved = resolvePublicMediaUrl(raw) || raw;
  if (resolved.startsWith("http://") || resolved.startsWith("https://")) return resolved;
  const base = appUrl.replace(/\/$/, "");
  return `${base}${resolved.startsWith("/") ? resolved : `/${resolved}`}`;
}

export function buildThankYouShareCopy(input: {
  title?: string | null;
  hostNames?: string | null;
  hostName?: string | null;
  eventTitle?: string | null;
  message?: string | null;
}): { title: string; description: string; shareText: string } {
  const hosts = (input.hostNames?.trim() || input.hostName?.trim() || "").trim();
  const eventTitle = input.eventTitle?.trim() || "";
  const title =
    input.title?.trim() ||
    (hosts ? `Thank You — ${hosts}` : "Thank You for Celebrating With Us");
  const description =
    (input.message?.trim() || "").replace(/\s+/g, " ").slice(0, 160) ||
    (hosts
      ? `With heartfelt gratitude from ${hosts}${eventTitle && eventTitle !== hosts ? ` · ${eventTitle}` : ""}.`
      : "With heartfelt gratitude for celebrating with us.");
  const shareText = hosts
    ? `With heartfelt gratitude — ${hosts}`
    : "With heartfelt gratitude";
  return { title, description, shareText };
}

export async function buildThankYouOpenGraphMetadata(input: {
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl?: string | null;
  imageAlt?: string;
}): Promise<Metadata> {
  const appUrl = await getServerAppUrl();
  const image = toAbsolute(appUrl, input.imageUrl);
  const images = image
    ? [{ url: image, width: 1200, height: 630, alt: input.imageAlt || input.title }]
    : undefined;

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.canonicalUrl },
    openGraph: {
      title: input.title,
      description: input.description,
      type: "website",
      siteName: APP_NAME,
      url: input.canonicalUrl,
      images,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: input.title,
      description: input.description,
      images: image ? [image] : undefined,
    },
  };
}
