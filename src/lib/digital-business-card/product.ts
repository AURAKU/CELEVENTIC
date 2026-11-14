/**
 * Celeventic SmartCard / Identity OS. Product naming & architecture map.
 *
 * Routes stay on existing URLs (`/card/[slug]`, `/dashboard/business-card`).
 * Customer-facing name is CeleYou. Keep SmartCard only in code and routes.
 *
 * ── Architecture map ────────────────────────────────────────────────────
 * ACCESS
 *   Anonymous guests: published /card/[slug], /u/{slug}, /c/{qrToken}, /n/{nfcToken},
 *   public GET, Connect POST, QR image, Save/Share. No Celeventic account required.
 *   Each cardholder keeps a unique slug, Smart QR token, NFC token, and tap session.
 *   Owners: shared NextAuth User. CeleYou signup skips event getting-started.
 *   Unpublished, suspended, and expired courtesy payloads withhold contacts.
 *   NFC respects device APIs. Phone to phone NFC is not used.
 *
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
 *   /c + /n redirect tokens, signed Apple/Google Wallet issuer files,
 *   web Wallet card of uploaded payment channels (no Apple/Google Wallet, no phone-to-phone NFC),
 *   offline snapshot, payment hub,
 *   campaigns attribution, block system, team templates.
 *
 * EXTEND
 *   DigitalBusinessCard (+ relations), PublicDigitalCardsShowcase, public view,
 *   studio, themes token system, payment.service when renew is paid.
 *
 * Honest platform limits
 *   Web NFC = Chrome Android primarily. Wallet QR is universal share surface.
 *   Apple Wallet NFC entitlements are separate from physical NFC tags.
 *      Phone to phone NFC is not supported. Tap-to-Connect uses session QR now,
   *   with a documented BLE contract for a future native app. Recipients open
   *   /card/{slug}, /c/{token}, /n/{token}, or /u/{slug} with no account.
 */

export const SMARTCARD_PRODUCT_SHORT_NAME = "CeleYou";
export const SMARTCARD_PRODUCT_NAME = "Celeventic CeleYou";
export const SMARTCARD_BRAND_TAGLINE = "One Identity. Infinite Connections.";
export const SMARTCARD_PRODUCT_TAGLINE = "Your phone. Your identity. Every connection.";
export const SMARTCARD_PRODUCT_SUPPORT = "Meet. Share. Connect. Remember.";
export const SMARTCARD_EYEBROW = "CeleYou";
export const SMARTCARD_HERO_LINE = "Your phone. Your identity. Every connection.";
export const SMARTCARD_HERO_SUPPORT =
  "QR, NFC card, Nearby Share, or a link. One page for your socials, number, WhatsApp, and website. Update once. Every share stays current. Recipients open it with no app and no account.";

export const SMARTCARD_CTA_PRIMARY = "Design my CeleYou";
export const SMARTCARD_CTA_SECONDARY = "View templates";

/** Public CeleYou landing. Guests create an account and browse templates. No login to look. */
export const CELEYOU_PUBLIC_LANDING_PATH = "/digital-cards";

export function celeYouGuestLandingPath(): string {
  return CELEYOU_PUBLIC_LANDING_PATH;
}

/** Short redirect path for Smart QR / share links (resolves to live /card/[slug]). */
export const SMARTCARD_SHORT_PATH = "/c";
/** Short redirect path for NFC tap tokens. */
export const SMARTCARD_NFC_PATH = "/n";

export const SMARTCARD_CAPABILITIES = [
  { id: "smart-qr", label: "Smart QR" },
  { id: "nfc-tap", label: "NFC card tap to open" },
  { id: "tap-to-connect", label: "Tap to Connect" },
  { id: "zero-install", label: "Zero-install recipient" },
  { id: "offline-ready", label: "Offline snapshot" },
  { id: "wallet-ready", label: "Wallet Ready" },
  { id: "contact-exchange", label: "Connect Back" },
  { id: "payment-ready", label: "Paid activation" },
] as const;

export const SMARTCARD_AUTOMATIONS = [
  {
    id: "live-everywhere",
    title: "Update once. Live everywhere.",
    body: "Change your title, photo or WhatsApp. QR, NFC, Wallet and link all follow instantly.",
  },
  {
    id: "connect-back",
    title: "Connect Back, automatically.",
    body: "Guests leave a name and number. You keep the intro without hunting business cards.",
  },
  {
    id: "modes",
    title: "One identity. Many faces.",
    body: "Share as Founder, Creator, or Event without duplicating the person behind the card.",
  },
  {
    id: "gate",
    title: "Stays current after you share.",
    body: "A paid plan keeps the public page live after the studio window. Courtesy mode preserves identity when a plan lapses.",
  },
  {
    id: "vcard",
    title: "Save to contacts in one tap.",
    body: "vCard download plus QR. The handshake that actually stays in the phone.",
  },
  {
    id: "signal",
    title: "See who looked.",
    body: "View counts and tap history so you know which rooms your identity actually worked in.",
  },
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
