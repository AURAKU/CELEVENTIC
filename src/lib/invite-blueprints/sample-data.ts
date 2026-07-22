import type { InvitationEventData } from "@/types/invitation-design";
import type { InviteCategory } from "./blueprint-types";

/** Gallery preview mode renders the real viewer over sample data. */

function isoDaysFromNow(days: number, hour = 14): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export function getSampleEvent(category: InviteCategory): InvitationEventData {
  if (category === "funeral") {
    const raw = isoDaysFromNow(21, 9);
    return {
      title: "Celebration of Life — Madam Akosua Asantewaa Addo",
      hostName: "The Addo Family",
      description:
        "1948 – 2026. A devoted mother, grandmother, and pillar of her community. Her warmth, wisdom, and unwavering faith touched every life she met. We gather to honour a life beautifully lived.",
      startDate: new Date(raw).toDateString(),
      startDateRaw: raw,
      venueName: "St. Peter's Methodist Church, Kumasi",
      landmark: "Near Adum Central, opposite Prempeh Assembly Hall",
      mapsLink: null,
      contactPhone: null,
      dressCode: "Black and red traditional cloth",
      coverImageUrl: null,
    };
  }
  const raw = isoDaysFromNow(90, 14);
  return {
    title: "The Wedding of Ama & Kofi",
    hostName: "Ama Owusu & Kofi Mensah",
    description:
      "Two families become one. Join us as we celebrate the union of Ama and Kofi with joy, music, and dancing.",
    startDate: new Date(raw).toDateString(),
    startDateRaw: raw,
    venueName: "Labadi Beach Hotel, Accra",
    landmark: "Off La Road, adjacent to La Palm Royal Beach",
    mapsLink: null,
    contactPhone: null,
    dressCode: "Formal · Colour of the day: Emerald & Gold",
    coverImageUrl: null,
  };
}

export function getSampleInvitation(slug: string) {
  return {
    // "preview-" prefix keeps RSVP + analytics no-ops (isPreviewInvitationId).
    id: `preview-${slug}`,
    name: "Template preview",
    message: null,
    uniqueLink: `preview-${slug}`,
  };
}
