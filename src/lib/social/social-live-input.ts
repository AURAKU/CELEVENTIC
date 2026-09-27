import {
  aureliaFamilyDefaults,
  isAureliaEditorialLayout,
  mergeAureliaWedding,
  SERAPHINE_CATALOG_SLUG,
  SERAPHINE_LAYOUT_SLUG,
} from "@/lib/experience/aurelia-editorial";
import { getCatalogTemplate } from "@/lib/invitation-mvp/catalogue";
import { resolveDeceasedName } from "@/lib/invite-blueprints/funeral-invitation-copy";
import { resolveSocialEventKind } from "@/lib/social/social-category";
import type { SocialInvitationInput } from "@/lib/social/social-engine";
import { resolveCeremonyWeekdayForDate } from "@/lib/social/social-event-title";
import type { InvitationDesignConfig } from "@/types/invitation-design";

type LiveInvitationLike = {
  name?: string | null;
  uniqueLink: string;
  updatedAt?: Date | string | null;
  template?: { slug?: string | null } | null;
  event: {
    title?: string | null;
    hostName?: string | null;
    eventType?: string | null;
    startDate?: Date | string | null;
    coverImageUrl?: string | null;
    updatedAt?: Date | string | null;
  };
};

type ProductionOrderLike = {
  templateSlug?: string | null;
  template?: { slug?: string | null } | null;
  deceasedName?: string | null;
  updatedAt?: Date | string | null;
} | null;

export function isAureliaFamilySocialLayout(input: {
  catalogSlug?: string | null;
  layoutSlug?: string | null;
}): boolean {
  const slug = input.catalogSlug?.trim() || "";
  const layout = input.layoutSlug?.trim() || "";
  return (
    isAureliaEditorialLayout(layout) ||
    slug.includes("aurelia") ||
    slug === SERAPHINE_CATALOG_SLUG ||
    layout === SERAPHINE_LAYOUT_SLUG ||
    layout.includes("seraphine")
  );
}

export function buildLiveSocialInvitationInput(input: {
  appUrl: string;
  invitation: LiveInvitationLike;
  liveDesign?: InvitationDesignConfig | null;
  catalogSlug?: string | null;
  layoutSlug?: string | null;
  productionOrder?: ProductionOrderLike;
  guestDisplayName?: string | null;
  guestToken?: string | null;
  includeGuestInCanonicalUrl?: boolean;
}): SocialInvitationInput {
  const catalogSlug = input.catalogSlug?.trim() || null;
  const layoutSlug = input.layoutSlug?.trim() || null;
  const catalog = getCatalogTemplate(catalogSlug || layoutSlug || "");
  const kind = resolveSocialEventKind({
    catalogSlug,
    layoutSlug,
    catalogCategory: catalog?.category,
    eventType: input.invitation.event.eventType,
  });
  const family = isAureliaFamilySocialLayout({ catalogSlug, layoutSlug });
  const wedding = family
    ? mergeAureliaWedding(
        input.liveDesign?.experience?.aureliaWedding,
        aureliaFamilyDefaults(layoutSlug)
      )
    : null;
  const colors = input.liveDesign?.colors;
  const themeColor = input.liveDesign?.theme?.color;
  const event = input.invitation.event;
  const deceasedFromOrder = input.productionOrder?.deceasedName?.trim() || null;
  const deceasedName =
    deceasedFromOrder ||
    (kind === "funeral"
      ? resolveDeceasedName(
          {
            title: event.title || "",
            hostName: event.hostName || "",
            description: null,
            startDate: "",
            venueName: null,
            landmark: null,
            mapsLink: null,
            contactPhone: null,
            dressCode: null,
            deceasedName: deceasedFromOrder,
          },
          input.invitation.name
        )
      : null);

  return {
    appUrl: input.appUrl,
    uniqueLink: input.invitation.uniqueLink,
    catalogSlug,
    layoutSlug,
    catalogCategory: catalog?.category ?? null,
    eventType: event.eventType,
    eventTitle: event.title,
    hostName: event.hostName,
    invitationName: input.invitation.name,
    partnerOneName: wedding?.partnerOneName,
    partnerTwoName: wedding?.partnerTwoName,
    deceasedName,
    dateDisplay: wedding?.dateDisplay,
    eventStartDate: event.startDate,
    weekday: wedding
      ? resolveCeremonyWeekdayForDate({
          dateDisplay: wedding.dateDisplay,
          ceremonies: wedding.ceremonies,
        })
      : null,
    guestDisplayName: input.guestDisplayName,
    guestToken: input.guestToken,
    includeGuestInCanonicalUrl: input.includeGuestInCanonicalUrl,
    colors: {
      primary: colors?.primary || themeColor?.primary,
      secondary: colors?.secondary || themeColor?.secondary,
      accent: colors?.accent || themeColor?.accent,
      background: colors?.background || themeColor?.surface,
    },
    shareOgImageUrl: input.liveDesign?.experience?.fashionHouse?.shareOgImageUrl,
    fashionHouse: input.liveDesign?.experience?.fashionHouse,
    heroImageUrl: wedding?.heroImageUrl ?? input.liveDesign?.experience?.aureliaWedding?.heroImageUrl,
    coverImageUrl: event.coverImageUrl,
    mediaHeroUrl: input.liveDesign?.media?.find((asset) => asset.role === "hero")?.url,
    versionParts: [
      input.invitation.updatedAt instanceof Date
        ? input.invitation.updatedAt.toISOString()
        : input.invitation.updatedAt,
      event.updatedAt instanceof Date ? event.updatedAt.toISOString() : event.updatedAt,
      input.productionOrder?.updatedAt instanceof Date
        ? input.productionOrder.updatedAt.toISOString()
        : input.productionOrder?.updatedAt,
      wedding?.heroImageUrl,
      event.coverImageUrl,
      input.liveDesign?.media?.find((asset) => asset.role === "hero")?.url,
      input.liveDesign?.experience?.fashionHouse?.shareOgImageUrl,
      catalogSlug,
      layoutSlug,
    ],
  };
}
