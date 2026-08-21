import type { HubTabId } from "@/lib/experience/experience-types";
import { DEFAULT_HUB_TABS as DEFAULTS } from "@/lib/experience/experience-types";
import { isFuneralEventType } from "@/lib/invitation/catalog-event-type";

export const DEFAULT_HUB_TABS = DEFAULTS;

/** Labels for studio scene list — keep in sync with EventExperienceHub labels. */
export const HUB_TAB_LABELS_FALLBACK: Record<HubTabId, string> = {
  invitation: "Invitation",
  rsvp: "RSVP",
  story: "Our story",
  countdown: "Countdown",
  venue: "Venue",
  gallery: "Gallery",
  gifts: "Gifts",
  seating: "Seating",
  menu: "Menu",
  timeline: "Timeline",
  memory: "Memories",
  livestream: "Livestream",
};

const FUNERAL_HUB_TAB_LABELS: Partial<Record<HubTabId, string>> = {
  story: "Tribute",
  gifts: "Contributions",
  memory: "Memorial gallery",
  timeline: "Programme",
};

export function hubTabLabelsForEventType(
  eventType?: string | null
): Record<HubTabId, string> {
  if (!isFuneralEventType(eventType)) return HUB_TAB_LABELS_FALLBACK;
  return { ...HUB_TAB_LABELS_FALLBACK, ...FUNERAL_HUB_TAB_LABELS };
}
