export type BlockCategory = "default" | "funeral" | "corporate";

export const DEFAULT_BLOCK_TYPES = [
  "WELCOME",
  "COUPLE_INTRO",
  "COUNTDOWN",
  "EVENT_DETAILS",
  "STORY",
  "GALLERY",
  "DRESS_CODE",
  "VENUE_MAPS",
  "SCHEDULE",
  "RSVP",
  "GIFT_REGISTRY",
  "MENU",
  "SEATING_INFO",
  "HOTEL_TRAVEL",
  "CONTACT_HOST",
  "QR_GUEST_PASS",
  "THANK_YOU",
  "MEMORY_VAULT",
] as const;

export const FUNERAL_BLOCK_TYPES = [
  "OBITUARY",
  "TRIBUTE_WALL",
  "FUNERAL_PROGRAM",
  "BURIAL_DIRECTIONS",
  "FAMILY_CONTACTS",
  "CONTRIBUTION_LINK",
  "MEMORIAL_GALLERY",
] as const;

export const CORPORATE_BLOCK_TYPES = [
  "AGENDA",
  "SPEAKERS",
  "REGISTRATION",
  "TICKET_PASS",
  "VENUE",
  "SPONSORS",
  "CERTIFICATE_INFO",
] as const;

export type InvitationBlockType =
  | (typeof DEFAULT_BLOCK_TYPES)[number]
  | (typeof FUNERAL_BLOCK_TYPES)[number]
  | (typeof CORPORATE_BLOCK_TYPES)[number];

export const BLOCK_TYPE_LABELS: Record<string, { en: string; fr: string; category: BlockCategory }> = {
  WELCOME: { en: "Welcome", fr: "Bienvenue", category: "default" },
  COUPLE_INTRO: { en: "Couple / Event Intro", fr: "Introduction", category: "default" },
  COUNTDOWN: { en: "Countdown", fr: "Compte à rebours", category: "default" },
  EVENT_DETAILS: { en: "Event Details", fr: "Détails de l'événement", category: "default" },
  STORY: { en: "Story", fr: "Notre histoire", category: "default" },
  GALLERY: { en: "Gallery", fr: "Galerie", category: "default" },
  DRESS_CODE: { en: "Dress Code", fr: "Code vestimentaire", category: "default" },
  VENUE_MAPS: { en: "Venue & Maps", fr: "Lieu et carte", category: "default" },
  SCHEDULE: { en: "Schedule / Timeline", fr: "Programme", category: "default" },
  RSVP: { en: "RSVP", fr: "Confirmer ma présence", category: "default" },
  GIFT_REGISTRY: { en: "Gift Registry", fr: "Liste de cadeaux", category: "default" },
  MENU: { en: "Menu", fr: "Menu", category: "default" },
  SEATING_INFO: { en: "Seating Info", fr: "Plan de table", category: "default" },
  HOTEL_TRAVEL: { en: "Hotel / Travel", fr: "Hébergement et voyage", category: "default" },
  CONTACT_HOST: { en: "Contact Host", fr: "Contacter l'hôte", category: "default" },
  QR_GUEST_PASS: { en: "QR Guest Pass", fr: "Pass invité QR", category: "default" },
  THANK_YOU: { en: "Thank You", fr: "Merci", category: "default" },
  MEMORY_VAULT: { en: "Memory Vault Preview", fr: "Aperçu Memory Vault", category: "default" },
  OBITUARY: { en: "Obituary", fr: "Nécrologie", category: "funeral" },
  TRIBUTE_WALL: { en: "Tribute Wall", fr: "Mur des hommages", category: "funeral" },
  FUNERAL_PROGRAM: { en: "Funeral Program", fr: "Programme funéraire", category: "funeral" },
  BURIAL_DIRECTIONS: { en: "Burial Directions", fr: "Directions vers le cimetière", category: "funeral" },
  FAMILY_CONTACTS: { en: "Family Contacts", fr: "Contacts familiaux", category: "funeral" },
  CONTRIBUTION_LINK: { en: "Contribution Link", fr: "Lien de contribution", category: "funeral" },
  MEMORIAL_GALLERY: { en: "Memorial Gallery", fr: "Galerie commémorative", category: "funeral" },
  AGENDA: { en: "Agenda", fr: "Ordre du jour", category: "corporate" },
  SPEAKERS: { en: "Speakers", fr: "Intervenants", category: "corporate" },
  REGISTRATION: { en: "Registration", fr: "Inscription", category: "corporate" },
  TICKET_PASS: { en: "Ticket Pass", fr: "Billet d'accès", category: "corporate" },
  VENUE: { en: "Venue", fr: "Lieu", category: "corporate" },
  SPONSORS: { en: "Sponsors", fr: "Sponsors", category: "corporate" },
  CERTIFICATE_INFO: { en: "Certificate Info", fr: "Informations certificat", category: "corporate" },
};

export const STYLE_VARIANTS = ["elegant", "minimal", "bold", "romantic", "formal"] as const;
export type StyleVariant = (typeof STYLE_VARIANTS)[number];

export function getBlockTypesForEventType(eventType: string): InvitationBlockType[] {
  const normalized = eventType.toUpperCase();
  const base = [...DEFAULT_BLOCK_TYPES] as InvitationBlockType[];

  if (normalized === "FUNERAL" || normalized.includes("MEMORIAL")) {
    return [...base, ...FUNERAL_BLOCK_TYPES];
  }
  if (
    normalized === "CORPORATE_EVENT" ||
    normalized === "CORPORATE" ||
    normalized === "CONFERENCE"
  ) {
    return [...base, ...CORPORATE_BLOCK_TYPES];
  }
  return base;
}

export interface BlockContentJson {
  body?: string;
  items?: { label: string; value?: string; time?: string; description?: string }[];
  ctaLabel?: string;
  ctaUrl?: string;
  mapsUrl?: string;
  countdownTarget?: string;
  registryUrl?: string;
  phone?: string;
  email?: string;
  highlight?: string;
}

export interface InvitationBlockDto {
  id: string;
  blockType: string;
  title: string | null;
  subtitle: string | null;
  contentJson: BlockContentJson | null;
  sortOrder: number;
  isVisible: boolean;
  styleVariant: string;
  language: string;
  contents?: {
    language: string;
    title: string | null;
    subtitle: string | null;
    content: string | null;
    contentJson: BlockContentJson | null;
  }[];
  media?: { id: string; url: string; type: string; alt: string | null; sortOrder: number }[];
  galleryItems?: { id: string; url: string; caption: string | null; sortOrder: number }[];
}

export interface BlockRenderContext {
  eventTitle: string;
  hostName: string;
  eventDate?: string;
  eventDateRaw?: string;
  eventTime?: string;
  venueName?: string;
  landmark?: string;
  mapsLink?: string;
  dressCode?: string;
  story?: string;
  contactPhone?: string;
  contactEmail?: string;
  coupleName1?: string;
  coupleName2?: string;
  deceasedName?: string;
  invitationId?: string;
  guestId?: string;
  guestName?: string;
  qrDataUrl?: string;
  memoryVaultEnabled?: boolean;
  eventId?: string;
}
