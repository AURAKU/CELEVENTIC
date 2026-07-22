import type { HubTabId } from "@/lib/experience/experience-types";
import { DEFAULT_HUB_TABS as DEFAULTS } from "@/lib/experience/experience-types";

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
