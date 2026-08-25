/**
 * Celeventic SmartCard / Identity OS — product naming & architecture map.
 *
 * Routes stay on existing URLs (`/card/[slug]`, `/dashboard/business-card`).
 * Product chrome may say SmartCard / Identity without breaking links.
 *
 * ── Architecture map (Phase A) ──────────────────────────────────────────
 * CURRENT
 *   DigitalBusinessCard Prisma model, studio, /card/[slug], 8 themes,
 *   QR via /api/qr/image, vCard, soft Web NFC write, trial/renew gate, viewCount.
 *
 * REUSABLE
 *   digital-business-card.service, themes, vcard, qr branding, Paystack payments
 *   (wire PaymentPurpose later), rate-limit / audit patterns, i18n, PWA shell.
 *
 * MISSING → CREATE (phased)
 *   Profile variants, Connect Back / connections CRM-lite, NFC device registry,
 *   /c + /n redirect tokens, Wallet passes, offline snapshot, payment hub,
 *   campaigns attribution, block system, team templates.
 *
 * EXTEND
 *   DigitalBusinessCard (+ relations), PublicDigitalCardsShowcase, public view,
 *   studio, themes token system, payment.service when renew is paid.
 *
 * Honest platform limits
 *   Web NFC = Chrome Android primarily. Wallet QR is universal share surface.
 *   Apple Wallet NFC entitlements are separate from physical NFC tags.
 */

export const SMARTCARD_PRODUCT_NAME = "Celeventic SmartCard";
export const SMARTCARD_PRODUCT_TAGLINE = "Your Identity. One Tap Away.";
export const SMARTCARD_PRODUCT_SUPPORT =
  "Meet. Share. Connect. Remember.";
export const SMARTCARD_EYEBROW = "Smart Identity";
export const SMARTCARD_HERO_LINE = "One tap. One scan. One unforgettable connection.";
export const SMARTCARD_HERO_SUPPORT =
  "Create a living digital identity you can share through QR, NFC, Wallet, link or contact exchange — and update it without ever reprinting a card.";

export const SMARTCARD_CTA_PRIMARY = "Create my SmartCard";
export const SMARTCARD_CTA_SECONDARY = "See it in action";

/** Short redirect path for Smart QR / share links (resolves to live /card/[slug]). */
export const SMARTCARD_SHORT_PATH = "/c";
/** Short redirect path for NFC tap tokens. */
export const SMARTCARD_NFC_PATH = "/n";

export const SMARTCARD_CAPABILITIES = [
  { id: "smart-qr", label: "Smart QR" },
  { id: "nfc-tap", label: "NFC Tap" },
  { id: "offline-ready", label: "Offline Ready" },
  { id: "wallet-ready", label: "Wallet Ready" },
  { id: "contact-exchange", label: "Contact Exchange" },
  { id: "payment-ready", label: "Payment Ready" },
] as const;

export type SmartCardProfileMode =
  | "personal"
  | "professional"
  | "creator"
  | "business"
  | "sales"
  | "event"
  | "executive"
  | "celebrity"
  | "vendor"
  | "custom";

export const SMARTCARD_PROFILE_MODES: {
  id: SmartCardProfileMode;
  label: string;
  description: string;
}[] = [
  { id: "professional", label: "Professional", description: "Title, LinkedIn, calendar, company" },
  { id: "personal", label: "Personal", description: "Name, photo, essentials only" },
  { id: "creator", label: "Creator", description: "Socials, media, collabs" },
  { id: "business", label: "Business", description: "Store, WhatsApp, payments" },
  { id: "sales", label: "Sales", description: "Demo, quote, brochure" },
  { id: "event", label: "Event", description: "Role, schedule, Event Guide" },
  { id: "executive", label: "Executive", description: "Authority, minimal clutter" },
  { id: "celebrity", label: "Public figure", description: "Verified, press, booking" },
  { id: "vendor", label: "Vendor", description: "Portfolio, booking, marketplace" },
  { id: "custom", label: "Custom", description: "Your own face of identity" },
];

export function smartCardShortUrl(publicToken: string, origin?: string): string {
  const path = `${SMARTCARD_SHORT_PATH}/${encodeURIComponent(publicToken)}`;
  if (!origin) return path;
  return `${origin.replace(/\/$/, "")}${path}`;
}

export function smartCardNfcUrl(publicToken: string, origin?: string): string {
  const path = `${SMARTCARD_NFC_PATH}/${encodeURIComponent(publicToken)}`;
  if (!origin) return path;
  return `${origin.replace(/\/$/, "")}${path}`;
}
