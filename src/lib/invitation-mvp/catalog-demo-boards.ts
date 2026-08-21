/**
 * Catalogue / template-browse sample boards.
 *
 * Forever Afaris and Traditional Marriage ship with real client ceremony copy as
 * layout defaults (for that couple's live invite). Catalogue browse and studio
 * "tap to open" previews must never show those names, phones, venues, or
 * monograms — guests shopping templates need clearly fictional sample details.
 *
 * Funeral browse envelopes must never show wedding seals (C | J). They use a
 * unique poured wax seal + memorial emblem per concept — not couple initials.
 */
import { formatInvitationDateParts, parseCoupleNames } from "@/lib/invitation-templates";
import type { WeddingBoardContent } from "@/lib/invitation/wedding-board";
import {
  extractHonoureeName,
  type VisionBoardContent,
} from "@/lib/invitation/vision-board";
import type { SealDesignId } from "@/lib/invitation/seal-design";
import { resolveFuneralEnvelopeSeal } from "@/lib/invitation/funeral-envelope-seal";

export type CatalogDemoIdentity = {
  title: string;
  hostName: string;
  message: string;
  venueName: string;
  landmark: string;
  dressCode?: string;
  contactPhone?: string;
  /** Explicit memorial / event seal when couple derivation would be wrong. */
  sealInitials?: string;
  invitationName?: string;
};

function titleCaseWords(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function firstName(full: string, fallback: string): string {
  const token = full.trim().split(/\s+/)[0];
  return token ? titleCaseWords(token) : fallback;
}

function sealMonogram(name1: string, name2: string): string {
  const a = name1.trim().charAt(0).toUpperCase();
  const b = name2.trim().charAt(0).toUpperCase();
  if (a && b) return `${a} | ${b}`;
  if (a) return a;
  return "A | B";
}

function hashtagFromNames(first1: string, first2: string): string {
  const left = first1.replace(/[^A-Za-z]/g, "");
  const right = first2.replace(/[^A-Za-z]/g, "");
  if (left && right) return `#${left}And${right}`;
  return "#SampleCelebration";
}

function resolveCoupleParts(demo: CatalogDemoIdentity): {
  coupleName1: string;
  coupleName2: string;
  first1: string;
  first2: string;
  monogram: string;
  hashtag: string;
  signature: string;
  gateWord: string;
} {
  const hostParts = demo.hostName.split(/\s*[&+]\s*/).map((p) => p.trim()).filter(Boolean);
  const parsed =
    hostParts.length >= 2
      ? { name1: hostParts[0], name2: hostParts[1] }
      : parseCoupleNames(demo.title, demo.hostName);
  const coupleName1 = (parsed.name1 || "Alex Mensah").toUpperCase();
  const coupleName2 = (parsed.name2 || "Jordan Owusu").toUpperCase();
  const first1 = firstName(coupleName1, "Alex");
  const first2 = firstName(coupleName2, "Jordan");
  return {
    coupleName1,
    coupleName2,
    first1,
    first2,
    monogram: sealMonogram(coupleName1, coupleName2),
    hashtag: hashtagFromNames(first1, first2),
    signature: `${first1} & ${first2}`,
    gateWord: `#${first1.toUpperCase()} & ${first2.toUpperCase()}`,
  };
}

function demoRsvpContacts(phone?: string): Array<{ name: string; phone: string }> {
  const primary = phone?.trim() || "+233 25 766 0734";
  return [
    { name: "SAMPLE HOST LINE", phone: primary },
    { name: "SAMPLE EVENT DESK", phone: "+233 20 000 0000" },
  ];
}

/** Identity overlay for wedding-board templates in catalogue browse mode. */
export function buildCatalogDemoWeddingBoard(
  demo: CatalogDemoIdentity,
  eventInstantIso: string
): WeddingBoardContent {
  const couple = resolveCoupleParts(demo);
  const parts = formatInvitationDateParts(eventInstantIso);
  const displayDate = `${parts.monthShort.toUpperCase()} • ${parts.day} • ${parts.year}`;
  const venueLine = demo.venueName.trim().toUpperCase();
  const dress =
    demo.dressCode?.trim() ||
    "Embrace the occasion with elegant attire in soft neutrals and gold accents.";

  return {
    openingInstruction: "Tap anywhere to open",
    sealMonogram: couple.monogram,
    gateWord: couple.gateWord,
    envelopeAddressLine: "You are cordially invited",
    familyIntro:
      "Two families warmly welcome you to share in the joy of this union, a sample celebration for template browsing.",
    coupleName1: couple.coupleName1,
    coupleName2: couple.coupleName2,
    invitationCopy:
      demo.message.trim() ||
      "Joyfully request the honor of your presence at the ceremony of their marriage",
    hashtag: couple.hashtag,
    displayDate,
    weekday: parts.weekday.toUpperCase(),
    timeLabel: parts.time.toUpperCase().replace(/\s+/g, " "),
    venueName: venueLine || "SAMPLE EVENTS CENTRE",
    venueAddress: demo.landmark.trim() || "Accra, Ghana",
    countdownHeading: "Counting Down To Forever",
    countdownTarget: eventInstantIso.replace(/\.\d{3}Z$/, ""),
    countdownExpiredMessage: "Today we celebrate",
    greetingHeading: "A Note For You",
    greetingBody:
      "This is sample guest copy for browsing templates. When you create your invitation, your own words appear here.",
    greetingFallbackName: "Our Treasured Guest",
    programmeHeading: "Order Of The Day",
    programmeItems: [
      { id: "arrival", time: "1:30 PM", title: "Guest Arrival", description: "Welcome drinks & seating" },
      { id: "ceremony", time: "2:00 PM", title: "Wedding Ceremony", description: "The exchange of vows" },
      { id: "photos", time: "3:30 PM", title: "Photographs", description: "Portraits with the couple" },
      { id: "reception", time: "4:30 PM", title: "Reception", description: "Dining, toasts & dancing" },
    ],
    dressCodeHeading: "DRESS CODE",
    dressCodeLadies: dress,
    dressCodeGents: dress,
    guestPolicyHeading: "ARE KIDS ALLOWED OR CAN I BRING A GUEST?",
    guestPolicyBody:
      "This sample celebration is adults-only due to venue capacity. Only guests named on the invitation are accommodated.",
    storyHeading: "Our Story",
    storyBody:
      "Two families, one forever. From a first hello to this joyful yes. Sample story text for template browsing.",
    rsvpHeading: "R.S.V.P",
    rsvpContacts: demoRsvpContacts(demo.contactPhone),
    closingHeading: "With Love & Gratitude",
    closingMessage:
      "Your presence is the greatest gift. We look forward to celebrating this beautiful day with you.",
    closingSignature: couple.signature,
    replayLabel: "Replay opening",
    familyHeading: "",
    memoryHeading: "Memory Vault",
    memoryBody:
      "Every photo and video you capture belongs in our album. Upload yours and we will treasure it forever.",
    memoryCta: "Add your memories",
  };
}

/** Identity overlay for traditional-marriage vision boards in catalogue browse. */
export function buildCatalogDemoVisionBoard(
  demo: CatalogDemoIdentity,
  eventInstantIso: string
): VisionBoardContent {
  const couple = resolveCoupleParts(demo);
  const parts = formatInvitationDateParts(eventInstantIso);
  const dress =
    demo.dressCode?.trim() ||
    "DRESS CODE: EMBRACE THE OCCASION WITH AN ELEGANT TRADITIONAL / AFRICAN WEAR";

  return {
    familyInvite:
      "TWO FAMILIES HUMBLY INVITE YOU TO WITNESS THE TRADITIONAL MARRIAGE CEREMONY BETWEEN THEIR SON AND DAUGHTER. SAMPLE COPY FOR TEMPLATE BROWSING",
    coupleName1: couple.coupleName1,
    coupleName2: couple.coupleName2,
    sealInitials: couple.monogram,
    weekday: parts.weekday.toUpperCase(),
    monthLabel: parts.month.toUpperCase(),
    dayNumber: String(parts.day),
    timeLabel: parts.time.toUpperCase().replace(/\s+/g, ""),
    dressCodeLine: dress.toUpperCase().startsWith("DRESS CODE")
      ? dress.toUpperCase()
      : `DRESS CODE: ${dress.toUpperCase()}`,
    sentiment: "Your Presence Will Be Deeply Appreciated!",
    rsvpContacts: demoRsvpContacts(demo.contactPhone).map((c) => ({
      name: c.name,
      phone: c.phone.replace(/^\+233\s*/, "0").replace(/\s+/g, ""),
    })),
    hashtag: couple.hashtag,
  };
}

/** Per-funeral-SKU wax materials — unique poured wax, never peach wedding pearl. */
function funeralSealDesignForSlug(slug: string): SealDesignId {
  return resolveFuneralEnvelopeSeal(slug).design;
}


const FUNERAL_BOARD_COPY_BY_SLUG: Record<
  string,
  { eyebrow: string; scriptTitle: string; sentiment: string }
> = {
  "memorial-candle-tribute": {
    eyebrow: "IN LOVING MEMORY",
    scriptTitle: "Candlelight Memorial",
    sentiment: "Your presence brings comfort as we remember a faithful life.",
  },
  "black-red-cloth-rite": {
    eyebrow: "FUNERAL RITES",
    scriptTitle: "Black Red Cloth Honour",
    sentiment: "Join the family in black and red cloth to honour a dignified life.",
  },
  "white-cloth-homegoing": {
    eyebrow: "HOMEGOING",
    scriptTitle: "Celebration of Life",
    sentiment: "Come in thanksgiving as we celebrate a life well lived.",
  },
  "kente-border-farewell": {
    eyebrow: "FINAL RITES",
    scriptTitle: "Heritage Farewell",
    sentiment: "With heritage and honour, you are invited to the farewell.",
  },
  "one-week-vigil-notice": {
    eyebrow: "ONE WEEK NOTICE",
    scriptTitle: "Vigil and Burial Path",
    sentiment: "You are invited to the vigil, wake keeping and burial programme.",
  },
};

/**
 * Funeral catalogue vision board — unique wax seal + memorial emblem (no couple initials).
 * Clears wedding couple monogram fields so envelopes never show C | J.
 */
export function buildCatalogDemoMemorialVisionBoard(
  demo: CatalogDemoIdentity,
  eventInstantIso: string,
  catalogSlug?: string | null
): VisionBoardContent {
  const parts = formatInvitationDateParts(eventInstantIso);
  const honouree = extractHonoureeName(demo.title, demo.invitationName);
  const funeralSeal = resolveFuneralEnvelopeSeal(catalogSlug);
  const copy =
    (catalogSlug && FUNERAL_BOARD_COPY_BY_SLUG[catalogSlug]) ||
    {
      eyebrow: "IN MEMORIAM",
      scriptTitle: "Funeral Invitation",
      sentiment: demo.message.trim() || "You are invited to gather in remembrance.",
    };
  const dress =
    demo.dressCode?.trim() ||
    "Dark colours or mourning cloth as directed by the family";
  const slug = catalogSlug ?? "";

  return {
    eyebrow: copy.eyebrow,
    scriptTitle: copy.scriptTitle,
    familyInvite: demo.message.trim().toUpperCase(),
    coupleName1: honouree.toUpperCase() || "IN LOVING MEMORY",
    coupleName2: "",
    sealInitials: "",
    sealEmblem: funeralSeal.emblem,
    sealDesign: funeralSealDesignForSlug(slug),
    sealFontFamily: "cinzel",
    sealSize: slug === "kente-border-farewell" ? "lg" : "md",
    sealTextColor: "",
    weekday: parts.weekday.toUpperCase(),
    monthLabel: parts.month.toUpperCase(),
    dayNumber: String(parts.day),
    timeLabel: parts.time.toUpperCase().replace(/\s+/g, ""),
    dressCodeLine: dress.toUpperCase().startsWith("DRESS CODE")
      ? dress.toUpperCase()
      : `DRESS CODE: ${dress.toUpperCase()}`,
    sentiment: copy.sentiment,
    locationCta: "VIEW VENUE LOCATION",
    rsvpHeading: "ATTENDANCE",
    rsvpContacts: demoRsvpContacts(demo.contactPhone).map((c) => ({
      name: c.name,
      phone: c.phone.replace(/^\+233\s*/, "0").replace(/\s+/g, ""),
    })),
    hashtag: honouree
      ? `#Remember${honouree.split(/\s+/).filter(Boolean).slice(-1)[0] ?? "Them"}`
      : "#InLovingMemory",
    showArtBackdrop: false,
    liveTypography: true,
    features: {
      guestWelcome: true,
      seating: slug === "kente-border-farewell" || slug === "black-red-cloth-rite",
      qr: slug === "black-red-cloth-rite" || slug === "kente-border-farewell",
      rsvp: true,
      location: true,
      music: true,
      gallery:
        slug === "memorial-candle-tribute" ||
        slug === "kente-border-farewell" ||
        slug === "white-cloth-homegoing",
      memory: slug === "memorial-candle-tribute" || slug === "kente-border-farewell",
      admissionCode: false,
      contributions: slug === "memorial-candle-tribute",
      timeline: slug === "memorial-candle-tribute" || slug === "one-week-vigil-notice",
    },
  };
}

/** True when catalogue sample copy still leaks a known client ceremony identity. */
export function catalogDemoLeaksClientIdentity(text: string): boolean {
  return /jeffery|francisca|chelsy|owuraku|afari|opoku|forever\s*afaris|maame\s*yeboah|0242651828|242\s*651\s*828|subtle\s*class/i.test(
    text
  );
}
