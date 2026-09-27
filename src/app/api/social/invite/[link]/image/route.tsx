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
import { resolveSocialInvitationGuest } from "@/lib/social/social-guest";
import {
  buildSocialInvitationSurface,
  isSocialPlaceCardUnavailable,
  socialPlaceCardCacheControl,
  SOCIAL_PLACE_CARD_HEIGHT,
  SOCIAL_PLACE_CARD_WIDTH,
} from "@/lib/social/social-place-card";
import { SocialPlaceCardMarkup } from "@/lib/social/social-place-card-image";
import { buildLiveSocialInvitationInput } from "@/lib/social/social-live-input";

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

async function heroToImageSrc(hero: string | null | undefined, origin: string): Promise<string | null> {
  const value = hero?.trim();
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

function pngResponse(
  element: ReactElement,
  options: { personalized?: boolean; unavailable?: boolean } = {}
) {
  const personalized = Boolean(options.personalized);
  const unavailable = Boolean(options.unavailable);
  const headers: Record<string, string> = {
    "Cache-Control": socialPlaceCardCacheControl({ personalized, unavailable }),
    "Content-Type": "image/png",
    Vary: "Accept",
  };
  if (personalized) {
    headers["CDN-Cache-Control"] = "no-store";
    headers["Surrogate-Control"] = "no-store";
    headers.Pragma = "no-cache";
  }
  return new ImageResponse(element, {
    width: SOCIAL_PLACE_CARD_WIDTH,
    height: SOCIAL_PLACE_CARD_HEIGHT,
    headers,
  });
}

function fallbackCard() {
  return (
    <SocialPlaceCardMarkup
      title="You're invited"
      phrase="Open your Celeventic invitation."
    />
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ link: string }> }
) {
  try {
    const { link } = await context.params;
    const guestToken = new URL(request.url).searchParams.get("guest");
    const invitation = await invitationService.getInvitationByLink(link);
    const origin = await getServerAppUrl();

    if (!invitation) {
      return pngResponse(fallbackCard(), { unavailable: true });
    }

    const stored = invitation.designConfig as InvitationDesignConfig | null;
    const templateConfig = invitation.template?.config as { layout?: string } | null;
    const [productionResolution, tokenGuest] = await Promise.all([
      resolveProductionOrderForLiveInvitation(invitation.id, invitation.event.id),
      guestToken ? invitationService.getGuestForInvitation(invitation.id, guestToken) : Promise.resolve(null),
    ]);
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
    const socialGuest = guestToken
      ? resolveSocialInvitationGuest({
          guestToken,
          tokenGuest,
          invitationName: invitation.name,
          isGeneralPass: invitation.isGeneralPass,
          eventTitle: invitation.event.title,
          guests: invitation.guests,
        })
      : null;
    const surface = buildSocialInvitationSurface(
      buildLiveSocialInvitationInput({
        appUrl: origin,
        invitation,
        liveDesign,
        catalogSlug,
        layoutSlug,
        productionOrder,
        guestDisplayName: socialGuest?.displayName,
        guestToken: socialGuest?.guestToken,
        includeGuestInCanonicalUrl: Boolean(guestToken && socialGuest),
      })
    );
    const unavailable = isSocialPlaceCardUnavailable({
      invitationStatus: invitation.status,
      eventStatus: invitation.event.status,
    });

    if (unavailable) {
      return pngResponse(
        <SocialPlaceCardMarkup
          theme={surface.theme}
          title={surface.title}
          unavailable
          unavailablePhrase={surface.unavailablePhrase}
        />,
        { unavailable: true }
      );
    }

    const heroSrc = await heroToImageSrc(surface.heroUrl, origin);
    return pngResponse(
      <SocialPlaceCardMarkup
        theme={surface.theme}
        variant={surface.variant}
        title={surface.title}
        dateLabel={surface.dateLabel}
        phrase={surface.phrase}
        kicker={surface.kicker}
        guestGreeting={surface.guestGreeting}
        heroSrc={heroSrc}
      />,
      { personalized: Boolean(socialGuest) }
    );
  } catch {
    return pngResponse(fallbackCard(), { unavailable: true });
  }
}
