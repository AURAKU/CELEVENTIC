import {
  aureliaFamilyDefaults,
  isAureliaEditorialLayout,
  mergeAureliaWedding,
} from "@/lib/experience/aurelia-editorial";
import type { InvitationDesignConfig } from "@/types/invitation-design";

/** Guest-facing album chrome resolved from the invitation, not the event row. */
export interface MemoryAlbumIdentity {
  title: string;
  eyebrow: string;
  subtitle: string | null;
  layout: string | null;
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
    return {
      title: one && two ? `${one} & ${two}` : eventTitle,
      eyebrow: config.albumEyebrow.trim() || "The Album",
      subtitle: config.dateDisplay.trim() || null,
      layout,
    };
  }

  return {
    title: eventTitle,
    eyebrow: "Event memories",
    subtitle: hostName ? `Hosted by ${hostName}` : null,
    layout,
  };
}
