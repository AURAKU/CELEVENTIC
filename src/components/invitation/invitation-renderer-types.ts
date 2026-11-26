import type { InvitationRenderProps } from "@/types/invitation-design";

export type InvitationRendererProps = InvitationRenderProps & {
  interactiveMedia?: boolean;
  /** Optional organizer email, used by themed templates (e.g. traditional marriage merge) */
  contactEmail?: string | null;
  /** Portal section presence, quiet journey links (traditional marriage) */
  hasGiftsSection?: boolean;
  hasTimelineSection?: boolean;
  /** Guest-facing gallery URLs for templates that render their own gallery */
  galleryUrls?: string[];
  /** Live Gift Wallet placement, when the event has an active campaign. */
  giftUrl?: string | null;
  giftQrImageUrl?: string | null;
  giftTitle?: string | null;
  giftSubtitle?: string | null;
  giftCtaLabel?: string | null;
  giftPrivacyNote?: string | null;
  guestQrToken?: string | null;
  eventId?: string | null;
};
