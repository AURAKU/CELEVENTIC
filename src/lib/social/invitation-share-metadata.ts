import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";
import { shareOgImageToOpenGraph, type ResolvedShareOgImage } from "@/lib/social/share-image";
import type { SocialPlaceCardImage } from "@/lib/social/social-place-card";

export const EXPIRED_INVITE_METADATA: Metadata = {
  title: "Invitation",
  robots: { index: false, follow: false },
};

export function buildInviteOpenGraphMetadata(input: {
  title: string;
  description: string;
  canonicalUrl: string;
  image: ResolvedShareOgImage | SocialPlaceCardImage;
  imageAlt: string;
}): Metadata {
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
      images: [shareOgImageToOpenGraph(input.image, input.imageAlt)],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [input.image.url],
    },
  };
}
