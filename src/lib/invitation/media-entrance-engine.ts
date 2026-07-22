import type { InvitationLayoutSlug } from "@/types/invitation-design";

/** Per-template hero / gallery media entrance — each layout feels unique. */
export type MediaEntranceId =
  | "fade-up"
  | "slide-left"
  | "slide-right"
  | "pop-in"
  | "zoom-reveal"
  | "curtain-unveil"
  | "polaroid-drop"
  | "glass-rise"
  | "bloom"
  | "grid-stagger"
  | "neon-pop"
  | "gentle-fade"
  | "passport-flip"
  | "drum-pulse";

export const MEDIA_ENTRANCE_OPTIONS: { id: MediaEntranceId; label: string }[] = [
  { id: "fade-up", label: "Fade up" },
  { id: "slide-left", label: "Slide in left" },
  { id: "slide-right", label: "Slide in right" },
  { id: "pop-in", label: "Pop in" },
  { id: "zoom-reveal", label: "Zoom reveal" },
  { id: "curtain-unveil", label: "Curtain unveil" },
  { id: "polaroid-drop", label: "Polaroid drop" },
  { id: "glass-rise", label: "Glass rise" },
  { id: "bloom", label: "Bloom unfold" },
  { id: "grid-stagger", label: "Grid stagger" },
  { id: "neon-pop", label: "Neon pop" },
  { id: "gentle-fade", label: "Gentle fade" },
  { id: "passport-flip", label: "Passport flip" },
  { id: "drum-pulse", label: "Drum pulse" },
];

const LAYOUT_ENTRANCE: Record<InvitationLayoutSlug, MediaEntranceId> = {
  "classic-gold": "curtain-unveil",
  "arch-green": "bloom",
  "rustic-lace": "polaroid-drop",
  "boho-hexagon": "pop-in",
  "luxury-rings": "zoom-reveal",
  "custom-media": "slide-right",
  "passport-luxe": "passport-flip",
  "glass-acrylic": "glass-rise",
  "floral-garden": "bloom",
  "royal-emerald-wedding": "curtain-unveil",
  "midnight-velvet-reception": "slide-left",
  "kente-heritage-union": "drum-pulse",
  "traditional-marriage-ceremony": "curtain-unveil",
  "floral-garden-romance": "bloom",
  "passport-destination-wedding": "passport-flip",
  "crystal-acrylic-luxury": "glass-rise",
  "golden-islamic-nikkah": "gentle-fade",
  "memorial-candle-tribute": "gentle-fade",
  "neon-celebration-party": "neon-pop",
  "corporate-prestige-summit": "grid-stagger",
};

export function getMediaEntranceForLayout(layout: string): MediaEntranceId {
  return LAYOUT_ENTRANCE[layout as InvitationLayoutSlug] ?? "fade-up";
}

export function getMediaEntranceClass(entrance: MediaEntranceId): string {
  return `inv-media-entrance-${entrance}`;
}
