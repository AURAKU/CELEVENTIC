/**
 * Synthetic second house — proves the luxury-fashion engine is template DNA,
 * not a Femmora microsite. Not a catalogue SKU.
 */

import type { InvitationDesignColors } from "@/types/invitation-design";
import { LUXURY_FASHION_HOUSE_DEFAULTS, mergeFashionHouse } from "./house-defaults";
import type { LuxuryFashionHouseConfig } from "./types";

export const MAISON_VALE_START_ISO = "2026-09-12T10:00:00+03:00";
export const MAISON_VALE_END_ISO = "2026-09-13T19:00:00+03:00";

export const MAISON_VALE_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=Kilimani%20Nairobi%20showroom";

export const MAISON_VALE_COLORS: InvitationDesignColors = {
  primary: "#F4EFE6",
  secondary: "#C4A574",
  accent: "#8A6A3C",
  background: "#1C1613",
  text: "#F4EFE6",
};

export const MAISON_VALE_HOUSE: LuxuryFashionHouseConfig = mergeFashionHouse(
  LUXURY_FASHION_HOUSE_DEFAULTS,
  {
    houseName: "MAISON VALE",
    monogram: "MV",
    eventTitle: "Collection Launch",
    unveilingLabel: "Enter the Atelier",
    teaserLine: "Night gold. A quieter door.",
    whisperLine: "The night opens in darker gold",
    whisperEyebrow: "THE NIGHT OPENS",
    whisperScript: "In darker gold",
    hubLede: "An invitation to the Vale collection launch.",
    portalWelcome: "Welcome to Maison Vale",
    portalPrompt: "The atelier is waiting",
    rsvpHeading: "Will we see you at Maison Vale?",
    rsvpAcceptedLabel: "Yes — I'll be there",
    finaleKicker: "Cut from night and gold.",
    hoursLabel: "10 AM TO 7 PM EACH DAY",
    datesLabel: "12TH & 13TH SEPTEMBER",
    locationName: "VALE SHOWROOM",
    address: "Kilimani",
    mapsUrl: MAISON_VALE_MAPS_URL,
    silkStyle: "espresso-gold",
    openingStyle: "silk-only",
    markVariant: "letter",
    filmCta: "Watch the launch",
    filmSkipLabel: "Continue to the invitation",
    lookbookTitle: "Night Collection",
    lookbookItems: [
      {
        id: "vale-look-01",
        url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=900&q=80&auto=format&fit=crop",
        type: "image",
        caption: "Night 01",
        collectionName: "Night Collection",
      },
      {
        id: "vale-look-02",
        url: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=900&q=80&auto=format&fit=crop",
        type: "image",
        caption: "Night 02",
        collectionName: "Night Collection",
      },
    ],
    silkBedUrl: null,
    startAtIso: MAISON_VALE_START_ISO,
    endAtIso: MAISON_VALE_END_ISO,
    filmUrl: null,
    filmPosterUrl: null,
    visitDayOptions: [
      { id: "12", label: "12 September" },
      { id: "13", label: "13 September" },
      { id: "BOTH", label: "Both" },
    ],
    chapters: {
      boutique: true,
      film: false,
      collection: true,
      countdown: true,
      maps: true,
      rsvp: true,
      share: true,
    },
  }
);

export function assertHouseIsNotFemmora(house: LuxuryFashionHouseConfig): string[] {
  const blob = JSON.stringify(house).toLowerCase();
  const leaks = ["femmora", "westlands", "/templates/femmora"].filter((needle) => blob.includes(needle));
  return leaks;
}
