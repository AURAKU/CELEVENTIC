import type { InvitationDesignConfig, InvitationLayoutSlug } from "@/types/invitation-design";
import type { OpeningExperienceId } from "@/lib/experience/experience-types";
import type { ButtonStyle } from "@/lib/invitation-studio/studio-types";
import { DEFAULT_HUB_TABS } from "@/lib/experience/experience-types";

export type CinematicLayoutSlug =
  | "royal-emerald-wedding"
  | "midnight-velvet-reception"
  | "kente-heritage-union"
  | "floral-garden-romance"
  | "passport-destination-wedding"
  | "crystal-acrylic-luxury"
  | "golden-islamic-nikkah"
  | "memorial-candle-tribute"
  | "neon-celebration-party"
  | "corporate-prestige-summit";

export const CINEMATIC_LAYOUT_SLUGS: CinematicLayoutSlug[] = [
  "royal-emerald-wedding",
  "midnight-velvet-reception",
  "kente-heritage-union",
  "floral-garden-romance",
  "passport-destination-wedding",
  "crystal-acrylic-luxury",
  "golden-islamic-nikkah",
  "memorial-candle-tribute",
  "neon-celebration-party",
  "corporate-prestige-summit",
];

export function isCinematicLayout(slug: string): slug is CinematicLayoutSlug {
  return (CINEMATIC_LAYOUT_SLUGS as readonly string[]).includes(slug);
}

export interface CinematicTheme {
  slug: CinematicLayoutSlug;
  name: string;
  category: string;
  tagline: string;
  previewGradient: string;
  background: string;
  particleColor: string;
  accentGlow: string;
  defaultAudioCategory: string;
  openingExperience: OpeningExperienceId;
  buttonStyle: ButtonStyle;
  ornament: InvitationDesignConfig["ornament"];
  isPremium: boolean;
  config: InvitationDesignConfig;
}

const CINEMATIC_EXPERIENCE_BASE = {
  introEnabled: true,
  introDurationSec: 2 as const,
  hubMode: "scroll" as const,
  enabledTabs: DEFAULT_HUB_TABS,
  countdownStyle: "classic" as const,
  environment: "royal-wedding" as const,
};

export const CINEMATIC_THEMES: Record<CinematicLayoutSlug, CinematicTheme> = {
  "royal-emerald-wedding": {
    slug: "royal-emerald-wedding",
    name: "Royal Emerald Wedding",
    category: "Wedding",
    tagline: "Emerald green, gold, ivory — palace elegance",
    previewGradient: "from-emerald-900 via-emerald-950 to-amber-950",
    background: "radial-gradient(ellipse at top, #064e3b 0%, #022c22 45%, #0a0a0a 100%)",
    particleColor: "#D4AF37",
    accentGlow: "rgba(212,175,55,0.45)",
    defaultAudioCategory: "violin",
    openingExperience: "wax-seal-gold",
    buttonStyle: "gold",
    ornament: "gold-frame",
    isPremium: true,
    config: {
      layout: "royal-emerald-wedding",
      colors: { primary: "#F5F0E6", secondary: "#D4AF37", accent: "#059669", background: "#022c22", text: "#F5F0E6" },
      fonts: { heading: "Cinzel", script: "Great Vibes", body: "Cormorant Garamond" },
      animation: "ken-burns",
      ornament: "gold-frame",
      introText: "Together with their families",
      studio: { revealMode: "envelope", buttonStyle: "gold", buttonPosition: "center", fullScreen: true, headingSize: 32, bodySize: 15, scriptSize: 26 },
      experience: { ...CINEMATIC_EXPERIENCE_BASE, openingExperience: "wax-seal-gold", environment: "royal-wedding" },
    },
  },
  "midnight-velvet-reception": {
    slug: "midnight-velvet-reception",
    name: "Midnight Velvet Reception",
    category: "Wedding",
    tagline: "Black, navy, silver, champagne — velvet curtain reveal",
    previewGradient: "from-slate-950 via-indigo-950 to-black",
    background: "linear-gradient(165deg, #0f172a 0%, #1e1b4b 50%, #020617 100%)",
    particleColor: "#E2E8F0",
    accentGlow: "rgba(226,232,240,0.35)",
    defaultAudioCategory: "strings",
    openingExperience: "curtain-wedding",
    buttonStyle: "glass",
    ornament: "none",
    isPremium: true,
    config: {
      layout: "midnight-velvet-reception",
      colors: { primary: "#F8FAFC", secondary: "#CBD5E1", accent: "#94A3B8", background: "#020617", text: "#F1F5F9" },
      fonts: { heading: "Playfair Display", script: "Cormorant Garamond", body: "Inter" },
      animation: "fade",
      introText: "An evening of celebration awaits",
      studio: { revealMode: "curtain", buttonStyle: "glass", fullScreen: true },
      experience: { ...CINEMATIC_EXPERIENCE_BASE, openingExperience: "curtain-wedding", environment: "none" },
    },
  },
  "kente-heritage-union": {
    slug: "kente-heritage-union",
    name: "Kente Heritage Union",
    category: "Wedding",
    tagline: "Kente gold, red, green — cloth unfold reveal",
    previewGradient: "from-amber-700 via-red-900 to-emerald-900",
    background: "linear-gradient(145deg, #92400e 0%, #7f1d1d 35%, #14532d 100%)",
    particleColor: "#FBBF24",
    accentGlow: "rgba(251,191,36,0.4)",
    defaultAudioCategory: "african",
    openingExperience: "envelope-kente",
    buttonStyle: "gold",
    ornament: "gold-frame",
    isPremium: true,
    config: {
      layout: "kente-heritage-union",
      colors: { primary: "#FEF3C7", secondary: "#DC2626", accent: "#059669", background: "#451a03", text: "#FFFBEB" },
      fonts: { heading: "Cinzel", script: "Great Vibes", body: "Cormorant Garamond" },
      animation: "parallax",
      introText: "The families invite you to witness",
      studio: { revealMode: "scroll-unroll", buttonStyle: "gold", fullScreen: true },
      experience: { ...CINEMATIC_EXPERIENCE_BASE, openingExperience: "envelope-kente", environment: "kente-gold" },
    },
  },
  "floral-garden-romance": {
    slug: "floral-garden-romance",
    name: "Floral Garden Romance",
    category: "Wedding",
    tagline: "Soft pink, cream, sage — floating petals",
    previewGradient: "from-rose-100 via-pink-50 to-emerald-50",
    background: "linear-gradient(180deg, #fff1f2 0%, #ecfdf5 100%)",
    particleColor: "#FDA4AF",
    accentGlow: "rgba(253,164,175,0.35)",
    defaultAudioCategory: "piano",
    openingExperience: "envelope-floral",
    buttonStyle: "pill",
    ornament: "floral",
    isPremium: false,
    config: {
      layout: "floral-garden-romance",
      colors: { primary: "#881337", secondary: "#BE185D", accent: "#059669", background: "#FFF1F2", text: "#4C0519" },
      fonts: { heading: "Great Vibes", script: "Great Vibes", body: "Cormorant Garamond" },
      animation: "fade",
      ornament: "floral",
      introText: "Join us in the garden",
      studio: { revealMode: "envelope", buttonStyle: "pill", fullScreen: true },
      experience: { ...CINEMATIC_EXPERIENCE_BASE, openingExperience: "envelope-floral", environment: "floating-petals" },
    },
  },
  "passport-destination-wedding": {
    slug: "passport-destination-wedding",
    name: "Passport Destination Wedding",
    category: "Wedding",
    tagline: "Travel paper, navy stamps — passport opens",
    previewGradient: "from-slate-100 via-amber-50 to-teal-900",
    background: "linear-gradient(160deg, #F8FAFC 0%, #E2E8F0 40%, #0f766e 100%)",
    particleColor: "#D4A63A",
    accentGlow: "rgba(212,166,58,0.35)",
    defaultAudioCategory: "instrumentals",
    openingExperience: "passport",
    buttonStyle: "outline",
    ornament: "gold-frame",
    isPremium: true,
    config: {
      layout: "passport-destination-wedding",
      colors: { primary: "#0F172A", secondary: "#D4A63A", accent: "#0B8A83", background: "#F8FAFC", text: "#1E293B" },
      fonts: { heading: "Cinzel", script: "Cormorant Garamond", body: "Inter" },
      animation: "fade",
      introText: "Boarding pass to forever",
      studio: { revealMode: "passport", buttonStyle: "outline", fullScreen: true },
      experience: { ...CINEMATIC_EXPERIENCE_BASE, openingExperience: "passport" },
    },
  },
  "crystal-acrylic-luxury": {
    slug: "crystal-acrylic-luxury",
    name: "Crystal Acrylic Luxury",
    category: "Wedding",
    tagline: "Glass shimmer, white, gold champagne",
    previewGradient: "from-sky-100 via-white to-amber-100",
    background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(254,243,199,0.8) 100%)",
    particleColor: "#FDE68A",
    accentGlow: "rgba(56,189,248,0.35)",
    defaultAudioCategory: "strings",
    openingExperience: "glass",
    buttonStyle: "glass",
    ornament: "none",
    isPremium: true,
    config: {
      layout: "crystal-acrylic-luxury",
      colors: { primary: "#0F172A", secondary: "#38BDF8", accent: "#D4AF37", background: "rgba(255,255,255,0.92)", text: "#334155" },
      fonts: { heading: "Inter", script: "Great Vibes", body: "Inter" },
      animation: "ken-burns",
      introText: "You are cordially invited",
      studio: { revealMode: "glass", buttonStyle: "glass", fullScreen: true },
      experience: { ...CINEMATIC_EXPERIENCE_BASE, openingExperience: "glass", environment: "royal-wedding" },
    },
  },
  "golden-islamic-nikkah": {
    slug: "golden-islamic-nikkah",
    name: "Golden Islamic Nikkah",
    category: "Wedding",
    tagline: "Gold, ivory, emerald ornamental patterns",
    previewGradient: "from-amber-100 via-emerald-50 to-emerald-900",
    background: "radial-gradient(circle at 50% 0%, #064e3b 0%, #022c22 55%, #0a0a0a 100%)",
    particleColor: "#D4AF37",
    accentGlow: "rgba(212,175,55,0.4)",
    defaultAudioCategory: "muslim",
    openingExperience: "palace-entrance",
    buttonStyle: "gold",
    ornament: "gold-frame",
    isPremium: false,
    config: {
      layout: "golden-islamic-nikkah",
      colors: { primary: "#FEFCE8", secondary: "#D4AF37", accent: "#059669", background: "#022c22", text: "#ECFDF5" },
      fonts: { heading: "Cinzel", script: "Cormorant Garamond", body: "Cormorant Garamond" },
      animation: "fade",
      introText: "With blessings and joy",
      studio: { revealMode: "envelope", buttonStyle: "gold", fullScreen: true },
      experience: { ...CINEMATIC_EXPERIENCE_BASE, openingExperience: "palace-entrance", environment: "islamic-gold" },
    },
  },
  "memorial-candle-tribute": {
    slug: "memorial-candle-tribute",
    name: "Memorial Candle Tribute",
    category: "Funeral",
    tagline: "Black, ivory, candle gold — solemn tribute",
    previewGradient: "from-slate-900 via-stone-900 to-red-950",
    background: "radial-gradient(ellipse at center, #1c1917 0%, #0c0a09 70%, #000 100%)",
    particleColor: "#FBBF24",
    accentGlow: "rgba(251,191,36,0.25)",
    defaultAudioCategory: "funeral",
    openingExperience: "curtain-corporate",
    buttonStyle: "outline",
    ornament: "none",
    isPremium: false,
    config: {
      layout: "memorial-candle-tribute",
      colors: { primary: "#FAF8F4", secondary: "#D4A63A", accent: "#7F1D1D", background: "#0C0A09", text: "#E7E5E4" },
      fonts: { heading: "Cinzel", script: "Cormorant Garamond", body: "Cormorant Garamond" },
      animation: "fade",
      introText: "In loving memory",
      studio: { revealMode: "curtain", buttonStyle: "outline", fullScreen: true },
      experience: { ...CINEMATIC_EXPERIENCE_BASE, openingExperience: "curtain-corporate", environment: "none", introDurationSec: 3 },
    },
  },
  "neon-celebration-party": {
    slug: "neon-celebration-party",
    name: "Neon Celebration Party",
    category: "Birthday",
    tagline: "Purple, electric blue, hot pink — neon pulse",
    previewGradient: "from-fuchsia-600 via-purple-900 to-black",
    background: "linear-gradient(160deg, #581c87 0%, #1e1b4b 40%, #0a0a0a 100%)",
    particleColor: "#E879F9",
    accentGlow: "rgba(232,121,249,0.5)",
    defaultAudioCategory: "celebration",
    openingExperience: "scratch",
    buttonStyle: "pill",
    ornament: "none",
    isPremium: false,
    config: {
      layout: "neon-celebration-party",
      colors: { primary: "#FAF5FF", secondary: "#E879F9", accent: "#38BDF8", background: "#0A0A0A", text: "#F5F3FF" },
      fonts: { heading: "Inter", script: "Great Vibes", body: "Inter" },
      animation: "ken-burns",
      introText: "You're invited to celebrate",
      studio: { revealMode: "scratch", buttonStyle: "pill", fullScreen: true },
      experience: { ...CINEMATIC_EXPERIENCE_BASE, openingExperience: "scratch", environment: "confetti" },
    },
  },
  "corporate-prestige-summit": {
    slug: "corporate-prestige-summit",
    name: "Corporate Prestige Summit",
    category: "Corporate",
    tagline: "Navy, white, platinum, teal — professional motion",
    previewGradient: "from-slate-900 via-slate-800 to-teal-900",
    background: "linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #134e4a 100%)",
    particleColor: "#14B8A6",
    accentGlow: "rgba(20,184,166,0.35)",
    defaultAudioCategory: "corporate",
    openingExperience: "none",
    buttonStyle: "sharp",
    ornament: "none",
    isPremium: true,
    config: {
      layout: "corporate-prestige-summit",
      colors: { primary: "#F8FAFC", secondary: "#94A3B8", accent: "#0B8A83", background: "#0F172A", text: "#E2E8F0" },
      fonts: { heading: "Inter", script: "Inter", body: "Inter" },
      animation: "fade",
      introText: "Official invitation",
      studio: { revealMode: "none", buttonStyle: "sharp", fullScreen: true },
      experience: { ...CINEMATIC_EXPERIENCE_BASE, openingExperience: "none", introDurationSec: 2, environment: "none" },
    },
  },
};

export function getCinematicTheme(slug: InvitationLayoutSlug | string): CinematicTheme | undefined {
  if (!isCinematicLayout(slug)) return undefined;
  return CINEMATIC_THEMES[slug];
}
