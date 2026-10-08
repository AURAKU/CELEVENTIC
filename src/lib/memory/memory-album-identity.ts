import {
  aureliaFamilyDefaults,
  isAureliaEditorialLayout,
  mergeAureliaWedding,
  SERAPHINE_LAYOUT_SLUG,
  SERAPHINE_MONOGRAM,
} from "@/lib/experience/aurelia-editorial";
import type { InvitationDesignConfig } from "@/types/invitation-design";

/** Guest-facing album chrome resolved from the invitation, not the event row. */
export interface MemoryAlbumIdentity {
  title: string;
  eyebrow: string;
  subtitle: string | null;
  layout: string | null;
  lede: string | null;
  logoUrl: string | null;
  monogram: string | null;
}

export function invitationLayoutSlug(
  design?: Partial<InvitationDesignConfig> | null,
  templateSlug?: string | null
): string | null {
  const layout = design?.layout?.trim() || templateSlug?.trim() || null;
  return layout || null;
}

export function resolveMemoryAlbumIdentity(input: {
  eventTitle: string;
  hostName: string;
  design?: Partial<InvitationDesignConfig> | null;
  templateSlug?: string | null;
}): MemoryAlbumIdentity {
  const layout = invitationLayoutSlug(input.design, input.templateSlug);
  const eventTitle = input.eventTitle.trim() || "The Album";
  const hostName = input.hostName.trim();

  if (isAureliaEditorialLayout(layout)) {
    const config = mergeAureliaWedding(
      input.design?.experience?.aureliaWedding,
      aureliaFamilyDefaults(layout)
    );
    const one = config.partnerOneName.trim();
    const two = config.partnerTwoName.trim();
    const logoUrl =
      layout === SERAPHINE_LAYOUT_SLUG
        ? SERAPHINE_MONOGRAM
        : config.monogramImageUrl?.trim() || null;
    return {
      title: one && two ? `${one} & ${two}` : eventTitle,
      eyebrow: config.albumEyebrow.trim() || "The Album",
      subtitle: config.dateDisplay.trim() || null,
      layout,
      lede: config.albumLede.trim() || null,
      logoUrl,
      monogram: config.monogram.trim() || null,
    };
  }

  const sameParty =
    hostName.length > 0 &&
    hostName.localeCompare(eventTitle, undefined, { sensitivity: "accent" }) === 0;

  if (layout === "forever-afaris-wedding") {
    return {
      title: eventTitle,
      eyebrow: "The Album",
      subtitle: hostName && !sameParty ? `Hosted by ${hostName}` : null,
      layout,
      lede: "Photographs and films from the celebration, gathered in one place.",
      logoUrl: null,
      monogram: null,
    };
  }

  return {
    title: eventTitle,
    eyebrow: "Event memories",
    subtitle: hostName && !sameParty ? `Hosted by ${hostName}` : null,
    layout,
    lede: null,
    logoUrl: null,
    monogram: null,
  };
}
