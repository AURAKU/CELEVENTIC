import { getDefaultDesignConfig, mergeDesignConfig } from "@/lib/invitation-templates";
import { isVideoUrl } from "@/lib/invitation/theme-media-assets";
import type { InvitationDesignConfig, InvitationMediaAsset } from "@/types/invitation-design";

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
 *
 * Media roles stay separated:
 * - `hero` — invitation header portrait (organizer/admin controlled)
 * - `intro` — pre-invite welcome / Tap to Begin screen
 * - `background` — full-page atmosphere
 * - `reference` — swipe gallery only
 */
export function buildPublishedDesignConfig(
  order: PublishableOrderDesignSource
): InvitationDesignConfig {
  const base = getDefaultDesignConfig(order.templateSlug);
  const design = mergeDesignConfig(
    base,
    (order.designConfig ?? undefined) as Partial<InvitationDesignConfig> | undefined
  );

  const heroAsset = design.media?.find((m) => m.role === "hero");
  const introAsset = design.media?.find((m) => m.role === "intro");
  const backgroundAsset = design.media?.find((m) => m.role === "background");
  const gallery = Array.isArray(order.galleryUrls) ? (order.galleryUrls as string[]) : [];

  if (gallery.length > 0 || heroAsset || introAsset || backgroundAsset) {
    const reserved = new Set(
      [heroAsset?.url, introAsset?.url, backgroundAsset?.url].filter(
        (url): url is string => Boolean(url)
      )
    );

    let galleryForRefs = gallery.filter((url) => url && !reserved.has(url));
    const media: InvitationMediaAsset[] = [];

    if (heroAsset) {
      media.push(heroAsset);
    } else if (galleryForRefs[0]) {
      // Legacy orders without a dedicated hero still use the first gallery image.
      const first = galleryForRefs[0];
      media.push({
        url: first,
        type: isVideoUrl(first) ? "video" : "image",
        role: "hero",
        name: "Hero photo",
      });
      galleryForRefs = galleryForRefs.slice(1);
    }

    for (const url of galleryForRefs) {
      media.push({
        url,
        type: isVideoUrl(url) ? "video" : "image",
        role: "reference",
        name: "Gallery photo",
      });
    }

    if (introAsset) media.push(introAsset);
    if (backgroundAsset) media.push(backgroundAsset);

    design.media = media.length ? media : undefined;
  }

  return design;
}
