import { digitalCardIdentityUrl, type DigitalCardPublicPayload } from "@/lib/digital-business-card/types";
import { listDigitalCardReachItems, type DigitalCardReachItem } from "@/lib/digital-business-card/socials";

export type CeleYouShareSnapshot = {
  cardId: string;
  slug: string;
  displayName: string;
  title: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  profileUrl: string;
  avatarUrl: string | null;
};

function unlockedReach(reach: DigitalCardReachItem[], brand: string): string | null {
  const item = reach.find((entry) => entry.brand === brand && !entry.locked);
  if (!item) return null;
  if (item.copyValue?.trim()) return item.copyValue.trim();
  if (item.href.startsWith("mailto:")) return item.href.slice("mailto:".length).split("?")[0] || null;
  if (item.href.startsWith("tel:")) return item.href.slice("tel:".length) || null;
  if (/^https?:/i.test(item.href)) return item.href;
  return item.subtitle?.trim() || item.title.trim() || null;
}

/** Public shareable fields only. Locked reach never enters the snapshot. */
export function celeYouPublicShareSnapshot(
  card: DigitalCardPublicPayload,
  origin: string
): CeleYouShareSnapshot {
  const reach = Array.isArray(card.guestReach) ? card.guestReach : listDigitalCardReachItems(card);
  return {
    cardId: card.id,
    slug: card.slug,
    displayName: card.displayName,
    title: card.title,
    company: card.company,
    email: unlockedReach(reach, "email"),
    phone: unlockedReach(reach, "phone"),
    website: unlockedReach(reach, "website"),
    profileUrl: digitalCardIdentityUrl(card.slug, origin),
    avatarUrl: card.avatarUrl,
  };
}
