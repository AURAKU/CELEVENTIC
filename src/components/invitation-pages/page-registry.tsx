import type { ComponentType } from "react";
import type { InvitePageProps, InvitePageType } from "@/lib/invite-blueprints/blueprint-types";
import { CoverPage } from "./cover-page";
import { StoryTributePage } from "./story-tribute-page";
import { DetailsPage } from "./details-page";
import { VenueMapPage } from "./venue-map-page";
import { RsvpPage } from "./rsvp-page";
import { ClosingPage } from "./closing-page";

export const PAGE_COMPONENTS: Record<InvitePageType, ComponentType<InvitePageProps>> = {
  cover: CoverPage,
  "story-tribute": StoryTributePage,
  details: DetailsPage,
  "venue-map": VenueMapPage,
  rsvp: RsvpPage,
  closing: ClosingPage,
};
