export type InvitationLayoutSlug =
  | "classic-gold"
  | "arch-green"
  | "rustic-lace"
  | "boho-hexagon"
  | "luxury-rings"
  | "custom-media"
  | "passport-luxe"
  | "glass-acrylic"
  | "floral-garden"
  | "royal-emerald-wedding"
  | "midnight-velvet-reception"
  | "kente-heritage-union"
  | "floral-garden-romance"
  | "passport-destination-wedding"
  | "crystal-acrylic-luxury"
  | "golden-islamic-nikkah"
  | "memorial-candle-tribute"
  | "neon-celebration-party"
  | "corporate-prestige-summit"
  | "traditional-marriage-ceremony";

export type MediaType = "image" | "video" | "pdf";

export interface InvitationMediaAsset {
  url: string;
  type: MediaType;
  role: "hero" | "background" | "reference" | "attachment";
  name?: string;
  /** Video-only, additive metadata from the processing pipeline (src/lib/video/video-processor.ts). */
  posterUrl?: string | null;
  thumbnailUrl?: string | null;
  /** Private original upload — never rendered directly, kept for reprocessing/audit. */
  originalUrl?: string | null;
  status?: "READY" | "PROCESSING" | "FAILED";
  durationSeconds?: number | null;
  width?: number | null;
  height?: number | null;
}

export interface InvitationDesignColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

import type { InvitationStudioConfig } from "@/lib/invitation-studio/studio-types";
import type { EventExperienceConfig } from "@/lib/experience/experience-types";
import type { InvitationThemeTokens } from "@/lib/invitation-theme/theme-types";

export interface InvitationDesignConfig {
  layout: InvitationLayoutSlug;
  colors: InvitationDesignColors;
  /** Studio 2.0 token theme; when present, `colors`/`fonts` derive from it and the paged viewer activates */
  theme?: InvitationThemeTokens;
  themeId?: string;
  /** Studio 2.0 page blueprint id (see src/lib/invite-blueprints) */
  blueprintId?: string;
  /** Viral-footer referral attribution captured at order creation */
  attribution?: { ref: string; source: string };
  fonts?: {
    heading?: string;
    script?: string;
    body?: string;
  };
  media?: InvitationMediaAsset[];
  animation?: "fade" | "parallax" | "ken-burns" | "none";
  ornament?: "gold-frame" | "vine" | "lace" | "floral" | "hexagon" | "none";
  introText?: string;
  buildMode?: "template" | "inspired" | "similar" | "improved";
  studio?: InvitationStudioConfig;
  experience?: EventExperienceConfig;
}

export interface InvitationEventData {
  title: string;
  hostName: string;
  description: string | null;
  startDate: string;
  startDateRaw?: string;
  venueName: string | null;
  landmark: string | null;
  mapsLink: string | null;
  contactPhone: string | null;
  dressCode: string | null;
  coverImageUrl?: string | null;
}

export interface InvitationRenderProps {
  invitation: {
    id: string;
    name: string;
    message: string | null;
    uniqueLink: string;
  };
  event: InvitationEventData;
  design: InvitationDesignConfig;
  guestId?: string;
  guestName?: string;
  qrDataUrl?: string;
  /** Guest-visible 4-digit gate code (under invitation QR) */
  admissionManualCode?: string | null;
  /** Functional admission QR (preferred over invite QR for gate) */
  admissionQrDataUrl?: string | null;
  /** Assigned table number for personalized invites */
  seatTable?: string | null;
  /** Assigned seat label for personalized invites */
  seatLabel?: string | null;
  /** Per-event Album upload URL (unique QR destination) */
  memoryUploadUrl?: string | null;
  /** Shared guest album gallery URL */
  memoryAlbumUrl?: string | null;
  /** QR image for Album upload */
  memoryUploadQrImageUrl?: string | null;
}
