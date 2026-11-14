import {
  DIGITAL_CARD_SOCIAL_NETWORKS,
  type DigitalCardReachItem,
} from "@/lib/digital-business-card/socials";
import type { DigitalCardPublicPayload } from "@/lib/digital-business-card/types";

export const GUEST_IDENTITY_SECTION_ORDER = [
  "about",
  "contact",
  "business",
  "portfolio",
  "social",
  "credentials",
  "products",
] as const;

export type GuestIdentitySectionId = (typeof GUEST_IDENTITY_SECTION_ORDER)[number];

export type GuestIdentitySection = {
  id: GuestIdentitySectionId;
  label: string;
  items: DigitalCardReachItem[];
  body?: string;
};

const SECTION_LABEL: Record<GuestIdentitySectionId, string> = {
  about: "About",
  contact: "Contact",
  business: "Business",
  portfolio: "Portfolio",
  social: "Social",
  credentials: "Credentials",
  products: "Payment Channels & Wallet",
};

const CONTACT_BRANDS = new Set([
  "phone",
  "email",
  "whatsapp",
  "whatsappbusiness",
  "website",
  "telegram",
  "signal",
  "viber",
]);
const BUSINESS_BRANDS = new Set(["location", "meeting"]);
const PORTFOLIO_BRANDS = new Set(["other", "github", "behance", "dribbble"]);
const CREDENTIAL_BRANDS = new Set(["linkedin"]);
const PRODUCT_GROUPS = new Set(["pay"]);

function sectionForBrand(brand: string): GuestIdentitySectionId {
  if (CONTACT_BRANDS.has(brand)) return "contact";
  if (BUSINESS_BRANDS.has(brand)) return "business";
  if (PORTFOLIO_BRANDS.has(brand)) return "portfolio";
  if (CREDENTIAL_BRANDS.has(brand)) return "credentials";
  const network = DIGITAL_CARD_SOCIAL_NETWORKS.find((item) => item.key === brand);
  if (network?.group === "chat") return "contact";
  if (network && PRODUCT_GROUPS.has(network.group)) return "products";
  if (network?.group === "social" || network?.group === "create") return "social";
  return "social";
}

/** Guest About: drop wrapping quotes so the card can carry the ornament. */
export function formatGuestAbout(raw: string): string {
  let text = raw.trim();
  if (!text) return "";
  const wrapped = text.match(/^[“"«]([\s\S]*?)[”"»]$/);
  text = (wrapped?.[1] ?? text).trim();
  if (/^[“"«]/.test(text) && !/[”"»]/.test(text.slice(1))) {
    text = text.slice(1).trim();
  }
  return text;
}

export function guestIdentitySections(
  card: DigitalCardPublicPayload,
  reach: DigitalCardReachItem[]
): GuestIdentitySection[] {
  const buckets = new Map<GuestIdentitySectionId, DigitalCardReachItem[]>();
  for (const item of reach) {
    const id = sectionForBrand(item.brand);
    const list = buckets.get(id) ?? [];
    list.push(item);
    buckets.set(id, list);
  }

  const order = Array.isArray(card.socials.stackOrder) && card.socials.stackOrder.length
    ? mergeSectionOrder(card.socials.stackOrder, reach)
    : GUEST_IDENTITY_SECTION_ORDER;

  const sections: GuestIdentitySection[] = [];
  for (const id of order) {
    if (id === "about") {
      const bio = card.bio?.trim();
      if (bio) sections.push({ id, label: SECTION_LABEL.about, items: [], body: bio });
      continue;
    }
    const items = buckets.get(id);
    if (!items?.length) continue;
    sections.push({
      id,
      label: SECTION_LABEL[id],
      items: id === "products" ? asGuestWalletDock(items) : items,
    });
  }
  return sections;
}

/** Guest Payment Channels always sit in the profile dock, including hidden wallets. */
export function asGuestWalletDock(items: DigitalCardReachItem[]): DigitalCardReachItem[] {
  return items.map((item) => (item.surface === "dock" ? item : { ...item, surface: "dock" as const }));
}

function mergeSectionOrder(stackOrder: string[], reach: DigitalCardReachItem[]): GuestIdentitySectionId[] {
  const seen = new Set<GuestIdentitySectionId>(["about"]);
  const ordered: GuestIdentitySectionId[] = ["about"];
  for (const id of stackOrder) {
    const item = reach.find((entry) => entry.id === id);
    const section = item ? sectionForBrand(item.brand) : null;
    if (!section || seen.has(section)) continue;
    seen.add(section);
    ordered.push(section);
  }
  for (const id of GUEST_IDENTITY_SECTION_ORDER) {
    if (seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
  }
  return ordered;
}
