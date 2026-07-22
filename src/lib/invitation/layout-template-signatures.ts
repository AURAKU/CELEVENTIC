/**
 * Per-layout catalogue signatures — unique hub tabs, marketing features, and copy hooks.
 * No two templates share the same feature bundle or tab set.
 */
import type { HubTabId } from "@/lib/experience/experience-types";

export const LAYOUT_ENABLED_TABS: Record<string, HubTabId[]> = {
  "classic-gold": ["invitation", "countdown", "venue", "gallery", "rsvp", "gifts"],
  "luxury-rings": ["invitation", "countdown", "gallery", "rsvp", "gifts", "seating"],
  "arch-green": ["invitation", "story", "countdown", "venue", "rsvp", "timeline"],
  "rustic-lace": ["invitation", "story", "gallery", "venue", "rsvp", "memory"],
  "boho-hexagon": ["invitation", "countdown", "gallery", "rsvp", "memory", "gifts"],
  "floral-garden": ["invitation", "countdown", "gallery", "rsvp", "gifts", "venue"],
  "passport-luxe": ["invitation", "timeline", "venue", "gallery", "rsvp", "gifts"],
  "glass-acrylic": ["invitation", "countdown", "gallery", "venue", "rsvp", "livestream"],
  "royal-emerald-wedding": ["invitation", "timeline", "countdown", "gallery", "rsvp", "seating"],
  "midnight-velvet-reception": ["invitation", "countdown", "gallery", "rsvp", "gifts", "menu"],
  "kente-heritage-union": ["invitation", "story", "seating", "gallery", "memory", "rsvp"],
  "traditional-marriage-ceremony": ["invitation", "story", "seating", "gallery", "memory", "rsvp", "venue"],
  "floral-garden-romance": ["invitation", "story", "countdown", "gallery", "rsvp", "gifts"],
  "passport-destination-wedding": ["invitation", "timeline", "venue", "gallery", "rsvp", "gifts"],
  "crystal-acrylic-luxury": ["invitation", "countdown", "gallery", "venue", "rsvp", "livestream"],
  "golden-islamic-nikkah": ["invitation", "timeline", "venue", "gallery", "rsvp", "gifts"],
  "memorial-candle-tribute": ["invitation", "story", "gallery", "memory", "rsvp", "gifts"],
  "neon-celebration-party": ["invitation", "countdown", "gallery", "rsvp", "memory", "livestream"],
  "corporate-prestige-summit": ["invitation", "timeline", "venue", "rsvp", "seating", "gallery"],
  "custom-media": ["invitation", "gallery", "rsvp", "memory", "venue", "gifts"],
};

/** Marketing feature chips — each layout lists a distinct signature set */
export const LAYOUT_SIGNATURE_FEATURES: Record<string, string[]> = {
  "classic-gold": ["Wax seal reveal", "Gold royal countdown", "Ivory serif card", "Romantic piano", "RSVP"],
  "luxury-rings": ["Light beam reveal", "Onyx film-strip gallery", "Violin elegance", "QR admission", "RSVP"],
  "arch-green": ["Scroll unroll reveal", "Vine arch hero", "Storybook journey", "Garden strings", "Calendar"],
  "rustic-lace": ["Letter unfold reveal", "Polaroid gallery", "Lace frame hero", "Acoustic warmth", "Guest wishes"],
  "boho-hexagon": ["Pop reveal", "Hexagon stack hero", "Grid gallery", "Soft jazz lounge", "Share"],
  "floral-garden": ["Scratch reveal", "Garden card hero", "Petal environment", "Piano garden", "Gift QR"],
  "passport-luxe": ["Passport stamp reveal", "Magazine gallery", "Boarding timeline", "Wanderlust score", "Maps"],
  "glass-acrylic": ["Glass frost reveal", "Floating card gallery", "Frostlight hero", "Crystal strings", "Livestream"],
  "royal-emerald-wedding": ["Emerald wax-seal press", "Luxury frame gallery", "Paper-metal parallax", "Royal orchestra", "Seal-reform outro"],
  "midnight-velvet-reception": ["Magazine page turn", "Film-strip collage", "Midnight jazz", "Editorial chapters", "Credits page"],
  "kente-heritage-union": ["Kente envelope reveal", "Stacked card gallery", "Drum celebration", "Heritage story", "Seating"],
  "traditional-marriage-ceremony": [
    "Peach vision-board card",
    "Live admission QR",
    "Guest seat welcome",
    "Ceremony drums",
    "Digital RSVP",
  ],
  "floral-garden-romance": ["Tap/swipe flower bloom", "Floating botanical frames", "Flower parallax", "Garden piano", "Petals thank-you"],
  "passport-destination-wedding": ["Flip boarding pass", "Destination magazine", "Horizon hero", "Ocean ambience", "Calendar"],
  "crystal-acrylic-luxury": ["Gift box reveal", "Prism hero", "Shimmer gallery", "String quartet garden", "Glass countdown"],
  "golden-islamic-nikkah": ["Islamic gold envelope", "Arch geometry hero", "Ornamental gallery", "Soft instrumental", "Schedule"],
  "memorial-candle-tribute": ["Tap candle to light", "Timeline life album", "Candlelight parallax", "Memorial piano", "Candle legacy"],
  "neon-celebration-party": ["Confetti burst reveal", "Neon grid gallery", "EDM energy", "Ticket QR", "Share"],
  "corporate-prestige-summit": ["Kinetic grid + curtain", "Agenda + speakers", "Glass parallax", "Corporate ambient", "Register + share"],
  "custom-media": ["Swipe reveal", "Your media canvas", "Cinematic frame", "Ambient score", "Upload gallery"],
};

export function getLayoutEnabledTabs(layout: string): HubTabId[] | undefined {
  return LAYOUT_ENABLED_TABS[layout];
}

export function getLayoutSignatureFeatures(layout: string): string[] | undefined {
  return LAYOUT_SIGNATURE_FEATURES[layout];
}
