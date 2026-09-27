import { readFile } from "fs/promises";
import path from "path";
import { ImageResponse } from "next/og";
import React, { type ReactElement } from "react";
import { invitationService } from "@/services/invitations/invitation.service";
import { getServerAppUrl } from "@/lib/app-url";
import { getDefaultDesignConfig, mergeDesignConfig } from "@/lib/invitation-templates";
import { buildPublishedDesignConfig } from "@/lib/invitation/published-design";
import { resolveProductionOrderForLiveInvitation } from "@/services/invitations/production-invitation-source.service";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import {
  AURELIA_HERO_FALLBACK,
  aureliaFamilyDefaults,
  mergeAureliaWedding,
  resolveAureliaHeroImage,
  SERAPHINE_CATALOG_SLUG,
  SERAPHINE_HERO_FALLBACK,
  SERAPHINE_LAYOUT_SLUG,
} from "@/lib/experience/aurelia-editorial";
import { formatSocialDateCardLabel, resolveSocialEventTitle } from "@/lib/social/social-event-title";
import {
  isSocialPlaceCardUnavailable,
  resolveSocialPlaceCardVariant,
  SOCIAL_PLACE_CARD_HEIGHT,
  SOCIAL_PLACE_CARD_PHRASE,
  SOCIAL_PLACE_CARD_WIDTH,
} from "@/lib/social/social-place-card";
import { SocialPlaceCardMarkup } from "@/lib/social/social-place-card-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function resolveDesign(invitation: {
  designConfig: unknown;
  template: { slug: string; config: unknown } | null;
}): InvitationDesignConfig {
  const stored = invitation.designConfig as InvitationDesignConfig | null;
  if (stored?.layout) return stored;
  const templateConfig = invitation.template?.config as { layout?: string } | null;
  const identitySlug = invitation.template?.slug ?? templateConfig?.layout;
  const base = getDefaultDesignConfig(identitySlug);
  return mergeDesignConfig(base, templateConfig as Partial<InvitationDesignConfig> | undefined);
}

async function heroToImageSrc(hero: string, origin: string): Promise<string | null> {
  const value = hero.trim();
  if (!value) return null;
  if (value.startsWith("data:")) return value;
  if (value.startsWith("/") && !value.startsWith("//")) {
    const relative = value.replace(/^\/+/, "");
    if (
      relative.startsWith("templates/") ||
      relative.startsWith("brand/") ||
      relative.startsWith("uploads/")
    ) {
      try {
        const filePath = path.join(process.cwd(), "public", relative);
        const buffer = await readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
        return `data:${mime};base64,${buffer.toString("base64")}`;
      } catch {
        return `${origin}${value.startsWith("/") ? value : `/${value}`}`;
      }
    }
    return `${origin}${value.startsWith("/") ? value : `/${value}`}`;
  }
  if (/^https?:\/\//i.test(value)) return value;
  return null;
}

function pngResponse(element: ReactElement, cacheSeconds = 300) {
  return new ImageResponse(element, {
    width: SOCIAL_PLACE_CARD_WIDTH,
    height: SOCIAL_PLACE_CARD_HEIGHT,
    headers: {
      "Cache-Control": `public, max-age=${cacheSeconds}, s-maxage=86400, stale-while-revalidate=604800`,
      "Content-Type": "image/png",
    },
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ link: string }> }
) {
  try {
    const { link } = await context.params;
    const invitation = await invitationService.getInvitationByLink(link);
    const origin = await getServerAppUrl();

    if (!invitation) {
      return pngResponse(
        <SocialPlaceCardMarkup
          variant="aurelia"
          title="You're invited"
          phrase="Open your Celeventic invitation."
        />,
        60
      );
    }

    const stored = invitation.designConfig as InvitationDesignConfig | null;
    const templateConfig = invitation.template?.config as { layout?: string } | null;
    const productionResolution = await resolveProductionOrderForLiveInvitation(
      invitation.id,
      invitation.event.id
    );
    const productionOrder = productionResolution.order;
    const productionDesign = productionOrder ? buildPublishedDesignConfig(productionOrder) : null;
    const catalogSlug =
      productionOrder?.templateSlug ??
      productionOrder?.template?.slug ??
      invitation.template?.slug ??
      null;
    const liveDesign = productionDesign ?? stored ?? resolveDesign(invitation);
    const layoutSlug =
      productionDesign?.layout ?? stored?.layout ?? templateConfig?.layout ?? liveDesign.layout ?? null;
    const variant = resolveSocialPlaceCardVariant({ catalogSlug, layoutSlug }) ?? "aurelia";
    const unavailable = isSocialPlaceCardUnavailable({
      invitationStatus: invitation.status,
      eventStatus: invitation.event.status,
    });

    const wedding = mergeAureliaWedding(
      liveDesign.experience?.aureliaWedding,
      aureliaFamilyDefaults(layoutSlug)
    );
    const title = resolveSocialEventTitle({
      eventTitle: invitation.event.title,
      hostName: invitation.event.hostName,
      invitationName: invitation.name,
      partnerOneName: wedding.partnerOneName,
      partnerTwoName: wedding.partnerTwoName,
    }).title;

    if (unavailable) {
      return pngResponse(
        <SocialPlaceCardMarkup variant={variant} title={title} unavailable />,
        120
      );
    }

    const heroPath = resolveAureliaHeroImage({
      heroImageUrl: liveDesign.experience?.aureliaWedding?.heroImageUrl ?? wedding.heroImageUrl,
      coverImageUrl: invitation.event.coverImageUrl,
      mediaHeroUrl: liveDesign.media?.find((asset) => asset.role === "hero")?.url,
      fallback:
        layoutSlug === SERAPHINE_LAYOUT_SLUG || catalogSlug === SERAPHINE_CATALOG_SLUG
          ? SERAPHINE_HERO_FALLBACK
          : AURELIA_HERO_FALLBACK,
    });
    const heroSrc = await heroToImageSrc(heroPath, origin);

    return pngResponse(
      <SocialPlaceCardMarkup
        variant={variant}
        title={title}
        dateLabel={formatSocialDateCardLabel(wedding.dateDisplay)}
        phrase={SOCIAL_PLACE_CARD_PHRASE}
        heroSrc={heroSrc}
      />
    );
  } catch {
    return pngResponse(
      <SocialPlaceCardMarkup
        variant="aurelia"
        title="You're invited"
        phrase="Open your Celeventic invitation."
      />,
      30
    );
  }
}
