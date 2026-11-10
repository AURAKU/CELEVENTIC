import { listDigitalCardReachItems, type DigitalCardReachItem } from "@/lib/digital-business-card/socials";
import type { DigitalCardPublicPayload } from "@/lib/digital-business-card/types";
import type { CeleYouPublicEventKind } from "@/lib/celeyou-share/events";

export type GuestPrimaryActionId = "save" | "call" | "whatsapp" | "email" | "website" | "share";

export type GuestPrimaryAction = {
  id: GuestPrimaryActionId;
  label: string;
  href?: string;
  event: CeleYouPublicEventKind;
};

function liveReach(card: DigitalCardPublicPayload): DigitalCardReachItem[] {
  const items = Array.isArray(card.guestReach) ? card.guestReach : listDigitalCardReachItems(card);
  return items.filter((item) => !item.locked && Boolean(item.href));
}

export function guestPrimaryActions(card: DigitalCardPublicPayload): GuestPrimaryAction[] {
  const reach = liveReach(card);
  const actions: GuestPrimaryAction[] = [{ id: "save", label: "Save Contact", event: "vcard_save" }];

  const phone = reach.find((item) => item.brand === "phone" && item.href.startsWith("tel:"));
  if (phone) {
    actions.push({ id: "call", label: "Call", href: phone.href, event: "call_tap" });
  }

  const whatsapp = reach.find((item) => item.brand === "whatsapp");
  if (whatsapp) {
    actions.push({
      id: "whatsapp",
      label: "WhatsApp",
      href: whatsapp.appHref || whatsapp.href,
      event: "whatsapp_tap",
    });
  }

  const email = reach.find((item) => item.brand === "email" && item.href.startsWith("mailto:"));
  if (email) {
    actions.push({ id: "email", label: "Email", href: email.href, event: "email_tap" });
  }

  const website = reach.find((item) => item.brand === "website" && /^https?:/i.test(item.href));
  if (website) {
    actions.push({ id: "website", label: "Visit Website", href: website.href, event: "website_tap" });
  }

  actions.push({ id: "share", label: "Share", event: "share_tap" });
  return actions;
}
