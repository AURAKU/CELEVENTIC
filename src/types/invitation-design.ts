export type InvitationLayoutSlug =
  | "classic-gold"
  | "arch-green"
  | "rustic-lace"
  | "boho-hexagon"
  | "luxury-rings"
  | "custom-media";

export type MediaType = "image" | "video" | "pdf";

export interface InvitationMediaAsset {
  url: string;
  type: MediaType;
  role: "hero" | "background" | "reference" | "attachment";
  name?: string;
}

export interface InvitationDesignColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface InvitationDesignConfig {
  layout: InvitationLayoutSlug;
  colors: InvitationDesignColors;
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
}
