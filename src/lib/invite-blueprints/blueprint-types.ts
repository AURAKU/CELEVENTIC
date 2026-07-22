import type { InvitationDesignConfig, InvitationEventData } from "@/types/invitation-design";
import type { InvitationThemeTokens } from "@/lib/invitation-theme/theme-types";

/**
 * Invitation page blueprints (Studio 2.0). A blueprint is an ordered list of
 * page definitions rendered by the paged viewer — templates are data
 * (blueprint × theme × motif × motion), not bespoke code.
 *
 * Not to be confused with src/lib/blueprints/ (event-workspace navigation).
 */

export type InviteCategory = "wedding" | "funeral";

export type InvitePageType =
  | "cover"
  | "story-tribute"
  | "details"
  | "venue-map"
  | "rsvp"
  | "closing";

export interface InvitePageDef {
  /** Stable hash anchor (deep link target), e.g. "rsvp" → …/invite/xyz#rsvp */
  id: string;
  type: InvitePageType;
  /** Dot-rail / aria label */
  label: string;
}

export interface InviteBlueprint {
  id: string;
  category: InviteCategory;
  pages: InvitePageDef[];
}

/** Everything a page block needs to render, for live invites and previews alike. */
export interface PageRenderContext {
  invitation: { id: string; name: string; message: string | null; uniqueLink: string };
  event: InvitationEventData;
  design: InvitationDesignConfig;
  theme: InvitationThemeTokens;
  category: InviteCategory;
  guestId?: string;
  guestName?: string;
  /** Catalog slug, for viral-footer attribution */
  templateSlug?: string;
  rsvpRequired?: boolean;
  previewMode?: boolean;
}

export interface InvitePageProps {
  context: PageRenderContext;
  page: InvitePageDef;
  index: number;
}
