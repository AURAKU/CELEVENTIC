import type { InviteBlueprint, InviteCategory } from "./blueprint-types";

/**
 * Page order within a blueprint is fixed to protect narrative quality
 * (cover opens, closing always ends with the viral footer). Free-tier
 * blueprints cap at 4 pages — premium value lives in the extra pages.
 */

const weddingCore: InviteBlueprint = {
  id: "wedding-core-v1",
  category: "wedding",
  pages: [
    { id: "cover", type: "cover", label: "Invitation" },
    { id: "details", type: "details", label: "Details" },
    { id: "venue", type: "venue-map", label: "Venue" },
    { id: "rsvp", type: "rsvp", label: "RSVP" },
    { id: "closing", type: "closing", label: "Thank you" },
  ],
};

const weddingFree: InviteBlueprint = {
  id: "wedding-free-v1",
  category: "wedding",
  pages: [
    { id: "cover", type: "cover", label: "Invitation" },
    { id: "details", type: "details", label: "Details" },
    { id: "rsvp", type: "rsvp", label: "RSVP" },
    { id: "closing", type: "closing", label: "Thank you" },
  ],
};

const funeralCore: InviteBlueprint = {
  id: "funeral-core-v1",
  category: "funeral",
  pages: [
    { id: "cover", type: "cover", label: "Announcement" },
    { id: "story", type: "story-tribute", label: "Tribute" },
    { id: "details", type: "details", label: "Arrangements" },
    { id: "venue", type: "venue-map", label: "Venue" },
    { id: "rsvp", type: "rsvp", label: "Attendance" },
    { id: "closing", type: "closing", label: "In memory" },
  ],
};

const funeralFree: InviteBlueprint = {
  id: "funeral-free-v1",
  category: "funeral",
  pages: [
    { id: "cover", type: "cover", label: "Announcement" },
    { id: "details", type: "details", label: "Arrangements" },
    { id: "rsvp", type: "rsvp", label: "Attendance" },
    { id: "closing", type: "closing", label: "In memory" },
  ],
};

export const INVITE_BLUEPRINTS: Record<string, InviteBlueprint> = {
  [weddingCore.id]: weddingCore,
  [weddingFree.id]: weddingFree,
  [funeralCore.id]: funeralCore,
  [funeralFree.id]: funeralFree,
};

const DEFAULT_BY_CATEGORY: Record<InviteCategory, InviteBlueprint> = {
  wedding: weddingCore,
  funeral: funeralCore,
};

export function getInviteBlueprint(
  id: string | undefined | null,
  fallbackCategory: InviteCategory = "wedding"
): InviteBlueprint {
  if (id && INVITE_BLUEPRINTS[id]) return INVITE_BLUEPRINTS[id];
  return DEFAULT_BY_CATEGORY[fallbackCategory];
}

export function categoryForBlueprint(id: string | undefined | null): InviteCategory {
  if (id && INVITE_BLUEPRINTS[id]) return INVITE_BLUEPRINTS[id].category;
  return "wedding";
}
