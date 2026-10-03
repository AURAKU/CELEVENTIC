import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AureliaEditorialRuntimeClient } from "../aurelia-editorial-wedding/aurelia-editorial-runtime-client";
import { ensureDemoMemoryLinks } from "@/lib/memory/ensure-event-memory-links";
import {
  SERAPHINE_CATALOG_SLUG,
  SERAPHINE_LAYOUT_SLUG,
  SERAPHINE_OPENING_ID,
  withAureliaAlbumQrCenter,
} from "@/lib/experience/aurelia-editorial";
import { giftCampaignService } from "@/services/gifts/gift-campaign.service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Seraphine Champagne Wedding · Dev preview",
  robots: { index: false, follow: false },
};

export default async function SeraphineChampagneRuntimePage({
  searchParams,
}: {
  searchParams: Promise<{ skipIntro?: string; reduced?: string }>;
}) {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_RUNTIME !== "1") {
    notFound();
  }
  const params = await searchParams;
  const memory = await ensureDemoMemoryLinks("Kojo & Fafa").catch(() => null);
  const giftPlacement = memory?.eventId
    ? await giftCampaignService
        .resolveInvitePlacement(memory.eventId, { autoOpen: true })
        .catch((error) => {
          console.error("[seraphine] gift wallet auto-open failed", error);
          return null;
        })
    : null;
  return (
    <AureliaEditorialRuntimeClient
      skipIntro={params.skipIntro === "1"}
      reduced={params.reduced === "1"}
      layoutSlug={SERAPHINE_LAYOUT_SLUG}
      catalogSlug={SERAPHINE_CATALOG_SLUG}
      openingExperience={SERAPHINE_OPENING_ID}
      runtimeId="preview-seraphine-champagne-wedding"
      testId="seraphine-runtime"
      memoryUploadUrl={memory?.uploadUrl ?? null}
      memoryAlbumUrl={memory?.albumUrl ?? null}
      memoryUploadQrImageUrl={withAureliaAlbumQrCenter(
        memory?.uploadQrImageUrl,
        null,
        SERAPHINE_LAYOUT_SLUG
      )}
      memoryEventId={memory?.eventId ?? null}
      memoryAlbumTitle={memory?.eventTitle ?? "Kojo & Fafa"}
      giftUrl={giftPlacement?.giftUrl ?? null}
      giftQrImageUrl={giftPlacement?.qrImageUrl ?? null}
      giftTitle={giftPlacement?.title ?? null}
      giftSubtitle={giftPlacement?.subtitle ?? null}
      giftCtaLabel={giftPlacement?.ctaLabel ?? null}
      giftPrivacyNote={giftPlacement?.privacyNote ?? null}
    />
  );
}
