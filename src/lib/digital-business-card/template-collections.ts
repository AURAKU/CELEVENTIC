import {
  DIGITAL_CARD_THEMES,
  type DigitalCardTheme,
  type DigitalCardThemeCategory,
} from "@/lib/digital-business-card/themes";

/** Industry shelves over existing theme categories. No new theme IDs. */
export const CELEYOU_TEMPLATE_COLLECTIONS: {
  id: string;
  label: string;
  hint: string;
  categories: DigitalCardThemeCategory[];
}[] = [
  { id: "personal", label: "Personal", hint: "Everyday identity", categories: ["personal", "minimal"] },
  { id: "professional", label: "Professional", hint: "Boardroom and studio", categories: ["executive", "minimal"] },
  { id: "corporate", label: "Corporate", hint: "House and firm plates", categories: ["executive", "business"] },
  { id: "entrepreneur", label: "Entrepreneur", hint: "Founders and operators", categories: ["business", "creator"] },
  { id: "creator", label: "Creator", hint: "Makers and public work", categories: ["creator", "iconic"] },
  { id: "automotive", label: "Automotive", hint: "Motion and night roads", categories: ["cinematic", "landmark"] },
  { id: "real-estate", label: "Real Estate", hint: "Property and place", categories: ["luxury", "executive", "landmark"] },
  { id: "hospitality", label: "Hospitality", hint: "Rooms and tables", categories: ["atelier", "luxury"] },
  { id: "events", label: "Events", hint: "Nights and stages", categories: ["cinematic", "public-figure"] },
];

export function themesForCollection(collectionId: string | null | undefined): DigitalCardTheme[] {
  if (!collectionId || collectionId === "all") return DIGITAL_CARD_THEMES;
  const collection = CELEYOU_TEMPLATE_COLLECTIONS.find((item) => item.id === collectionId);
  if (!collection) {
    return DIGITAL_CARD_THEMES.filter((theme) => theme.category === collectionId);
  }
  const allowed = new Set(collection.categories);
  return DIGITAL_CARD_THEMES.filter((theme) => allowed.has(theme.category));
}

export const CELEYOU_TEMPLATE_PAGE_SIZE = 12;
