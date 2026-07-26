import { getDefaultDesignConfig, mergeDesignConfig } from "@/lib/invitation-templates";
import { isVideoUrl } from "@/lib/invitation/theme-media-assets";
import type { InvitationDesignConfig } from "@/types/invitation-design";

export interface PublishableOrderDesignSource {
  templateSlug: string;
  designConfig: unknown;
  galleryUrls: unknown;
}

/**
 * Collapse a Studio order into the design snapshot stored on the published
 * `Invitation`. Shared by first publish and by every later re-sync so an
 * invitation edited after going live lands on exactly the same shape it would
 * have had if it were published for the first time right now.
 */
export function buildPublishedDesignConfig(
  order: PublishableOrderDesignSource
): InvitationDesignConfig {
  const base = getDefaultDesignConfig(order.templateSlug);
  const design = mergeDesignConfig(
    base,
    (order.designConfig ?? undefined) as Partial<InvitationDesignConfig> | undefined
  );

  // Preserve the dedicated soft-intro / BEGIN-screen welcome photo — it lives
  // outside the swipe gallery, so the gallery-derived media list below must
  // not silently drop it.
  const introAsset = design.media?.find((m) => m.role === "intro");
  const gallery = Array.isArray(order.galleryUrls) ? (order.galleryUrls as string[]) : [];

  if (gallery.length > 0) {
    design.media = gallery.map((url, i) => ({
      url,
      type: isVideoUrl(url) ? ("video" as const) : ("image" as const),
      role: i === 0 ? ("hero" as const) : ("reference" as const),
    }));
    if (introAsset) design.media.push(introAsset);
  }

  return design;
}
