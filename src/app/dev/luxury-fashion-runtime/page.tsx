import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LuxuryFashionRuntimeClient } from "./luxury-fashion-runtime-client";
import { getServerAppUrl } from "@/lib/app-url";
import {
  FEMMORA_CATALOG_SLUG,
  FEMMORA_HOUSE_DEFAULTS,
  LUXURY_FASHION_LAYOUT_SLUG,
  MAISON_VALE_HOUSE,
} from "@/lib/experience/luxury-fashion";
import {
  resolveFashionShareOgImageForInvitation,
  shareOgImageToOpenGraph,
} from "@/lib/social/share-image";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ house?: string }>;
}): Promise<Metadata> {
  const query = await searchParams;
  const vale = query.house === "vale";
  const title = vale ? "MAISON VALE · Collection Launch" : "FEMMORA · Soft Opening";
  const appUrl = await getServerAppUrl();
  const image = resolveFashionShareOgImageForInvitation({
    appUrl,
    catalogSlug: vale ? LUXURY_FASHION_LAYOUT_SLUG : FEMMORA_CATALOG_SLUG,
    layoutSlug: LUXURY_FASHION_LAYOUT_SLUG,
    fashionHouse: vale ? MAISON_VALE_HOUSE : FEMMORA_HOUSE_DEFAULTS,
  });

  return {
    title,
    openGraph: {
      title,
      ...(image ? { images: [shareOgImageToOpenGraph(image, title)] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      ...(image ? { images: [image.url] } : {}),
    },
  };
}

export default function LuxuryFashionRuntimePage({
  searchParams,
}: {
  searchParams: Promise<{ skipIntro?: string; reduced?: string; house?: string }>;
}) {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_RUNTIME !== "1") {
    notFound();
  }
  return <LuxuryFashionRuntimeClient searchParams={searchParams} />;
}
