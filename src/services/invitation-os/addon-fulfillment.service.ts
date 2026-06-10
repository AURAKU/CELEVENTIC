import { prisma } from "@/lib/prisma";

/** Maps purchased add-on slugs to enabled platform features on the order */
const ADDON_FEATURES: Record<string, string[]> = {
  "express-delivery": ["priority_production"],
  "custom-music": ["guest_music"],
  "voice-intro": ["voice_intro"],
  "custom-monogram": ["custom_monogram"],
  "custom-illustration": ["custom_illustration"],
  "extra-revision": ["extra_revision_credit"],
  "duplicate-invitation": ["duplicate_invitation"],
  "multi-language": ["multi_language"],
  "custom-domain": ["custom_domain"],
  "qr-checkin": ["qr_checkin"],
  "whatsapp-bulk": ["whatsapp_bulk"],
  "seating-plan": ["seating_plan"],
  "gift-registry": ["gift_registry"],
  "memory-vault": ["memory_vault"],
  "video-intro": ["video_intro"],
  "extra-gallery": ["gallery_upgrade"],
  "ai-content-assist": ["ai_assisted"],
};

export class AddonFulfillmentService {
  async fulfillOrderAddons(orderId: string) {
    const order = await prisma.invitationOrder.findUnique({ where: { id: orderId } });
    if (!order) return;

    const slugs = (order.addonSlugs as string[] | null) ?? [];
    const features = new Set<string>();
    for (const slug of slugs) {
      for (const f of ADDON_FEATURES[slug] ?? []) features.add(f);
    }

    await prisma.invitationOrder.update({
      where: { id: orderId },
      data: { fulfilledAddons: { slugs, features: Array.from(features) } },
    });

    return { slugs, features: Array.from(features) };
  }

  hasFeature(order: { fulfilledAddons?: unknown }, feature: string): boolean {
    const data = order.fulfilledAddons as { features?: string[] } | null;
    return data?.features?.includes(feature) ?? false;
  }
}

export const addonFulfillmentService = new AddonFulfillmentService();
