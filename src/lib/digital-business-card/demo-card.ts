import type { DigitalCardPublicPayload } from "./types";
import { DIGITAL_CARD_PUBLIC_PATH, digitalCardQrImageSrc } from "./types";
import { SMARTCARD_NFC_PATH, SMARTCARD_SHORT_PATH } from "./product";
import { courtesyGuestPayload } from "./courtesy";

/** Canonical guest slug for the public dummy CeleYou. */
export const DEMO_CARD_SLUG = "ama-serwaa";
/** Guest Continuity Experience dummy. No private reach. */
export const DEMO_COURTESY_SLUG = "ama-serwaa-courtesy";
/** Smart QR token. Printed QR stores /c/{token}, never the profile. */
export const DEMO_CARD_PUBLIC_TOKEN = "demo-ama-serwaa";
/** NFC tag token. Physical tags store /n/{token} only. */
export const DEMO_CARD_NFC_TOKEN = "nfc-ama-serwaa";
/** Published dummy portrait. Guest cards show this instead of initials. */
export const DEMO_CARD_AVATAR_PATH = "/digital-cards/demo/ama-serwaa.jpg";
/** Dummy yearly window. Status bar counts down to this renewal. */
export const DEMO_CARD_PAID_THROUGH = new Date("2027-11-09T23:59:59.000Z");
export const DEMO_CARD_VIEW_COUNT = 128;

const DEMO_SLUG_ALIASES = new Set(["demo", "ama-mensah", DEMO_CARD_SLUG]);
const DEMO_QR_TOKENS = new Set(["demo", DEMO_CARD_PUBLIC_TOKEN]);
const DEMO_NFC_TOKENS = new Set(["demo", DEMO_CARD_NFC_TOKEN]);

export const DEMO_CARD: DigitalCardPublicPayload = {
  id: "demo-celecard-ama-serwaa",
  slug: DEMO_CARD_SLUG,
  publicToken: DEMO_CARD_PUBLIC_TOKEN,
  displayName: "Ama Serwaa",
  title: "Creative Director",
  company: "Folio Maison",
  bio: "I shape brand worlds for houses that want the first handshake to feel like the room. Tap once for every way to reach me.",
  email: "ama@foliomaison.demo",
  phone: "+233 24 000 0000",
  website: "https://foliomaison.demo",
  socials: {
    emails: ["ama@foliomaison.demo", "studio@foliomaison.demo"],
    emailTags: ["business", "personal"],
    phones: ["+233 24 000 0000", "+233 30 211 4400"],
    phoneTags: ["personal", "business"],
    website: ["https://foliomaison.demo", "https://ama.folio"],
    whatsapp: [
      "233240000000",
      "https://chat.whatsapp.com/FolioMaisonHouse",
      "https://www.whatsapp.com/channel/0029AmaFolio",
    ],
    linkKinds: { whatsapp: ["number", "group", "channel"] },
    momo: "0240000000",
    paypal: "amaserwaa",
    instagram: ["amaserwaa", "foliomaison"],
    linkedin: "ama-serwaa",
    tiktok: "amaserwaa",
    x: "amaserwaa",
    behance: "amaserwaa",
    pinterest: "foliomaison",
    stackOrder: [
      "email-0",
      "email-1",
      "phone-0",
      "whatsapp-0",
      "whatsapp-1",
      "whatsapp-2",
      "momo-0",
      "paypal-0",
      "website-0",
      "website-1",
      "phone-1",
    ],
    dockOrder: ["instagram-0", "instagram-1", "linkedin-0", "tiktok-0", "x-0", "behance-0", "pinterest-0"],
    meeting: {
      enabled: true,
      title: "Book a sitting",
      durationMin: 30,
      timezone: "Africa/Accra",
      weekdays: [1, 2, 3, 4, 5],
      startHour: 9,
      endHour: 17,
      bufferMin: 15,
      noticeHours: 2,
      horizonDays: 14,
      place: "Video",
      note: "I'll confirm the time and send a link.",
    },
  },
  themeId: "gold-folio",
  avatarUrl: DEMO_CARD_AVATAR_PATH,
  pronouns: null,
  nfcEnabled: true,
  connectBackEnabled: true,
  defaultMode: "professional",
  isLive: true,
  isDemo: true,
  presentationMode: "live",
};

export const DEMO_COURTESY_CARD: DigitalCardPublicPayload = {
  ...courtesyGuestPayload({
    slug: DEMO_COURTESY_SLUG,
    themeId: "gold-folio",
    displayName: "Ama Serwaa",
    title: "Creative Director",
    company: "Folio Maison",
    avatarUrl: DEMO_CARD_AVATAR_PATH,
  }),
  isDemo: true,
};

export function isDemoCardSlug(slug: string | null | undefined): boolean {
  return Boolean(slug && DEMO_SLUG_ALIASES.has(slug.trim().toLowerCase()));
}

export function isDemoCourtesySlug(slug: string | null | undefined): boolean {
  return Boolean(slug && slug.trim().toLowerCase() === DEMO_COURTESY_SLUG);
}

export function isDemoQrToken(token: string | null | undefined): boolean {
  return Boolean(token && DEMO_QR_TOKENS.has(token.trim().toLowerCase()));
}

export function isDemoNfcToken(token: string | null | undefined): boolean {
  return Boolean(token && DEMO_NFC_TOKENS.has(token.trim().toLowerCase()));
}

export function getDemoCardBySlug(slug: string | null | undefined): DigitalCardPublicPayload | null {
  if (isDemoCourtesySlug(slug)) return DEMO_COURTESY_CARD;
  return isDemoCardSlug(slug) ? DEMO_CARD : null;
}

export function demoCardGuestPath(): string {
  return `${DIGITAL_CARD_PUBLIC_PATH}/${DEMO_CARD_SLUG}`;
}

export function demoCardQrPath(): string {
  return `${SMARTCARD_SHORT_PATH}/${DEMO_CARD_PUBLIC_TOKEN}`;
}

/** In-app explore path. Dummy QR taps land on the template gallery. */
export function demoCardPreviewExplorePath(): string {
  return "/digital-cards#smartcard-themes";
}

/** Camera-safe dummy QR. A scan opens the public template gallery, not a fake profile. */
export const DEMO_CARD_PREVIEW_QR_URL = "https://celeventic.com/digital-cards#smartcard-themes";

export function demoCardPreviewQrUrl(seed?: string): string {
  if (!seed) return DEMO_CARD_PREVIEW_QR_URL;
  return `https://celeventic.com/digital-cards?look=${encodeURIComponent(seed)}#smartcard-themes`;
}

export function demoCardPreviewQrSrc(seed?: string): string {
  return digitalCardQrImageSrc(demoCardPreviewQrUrl(seed), { size: 640 });
}

export function demoCardNfcPath(): string {
  return `${SMARTCARD_NFC_PATH}/${DEMO_CARD_NFC_TOKEN}`;
}

export function demoCardStudioPath(): string {
  return "/digital-cards/demo/studio";
}

export function demoCardHubPath(): string {
  return "/digital-cards/demo";
}

export function demoCardPresentPath(): string {
  return `${DIGITAL_CARD_PUBLIC_PATH}/${DEMO_CARD_SLUG}/present`;
}
