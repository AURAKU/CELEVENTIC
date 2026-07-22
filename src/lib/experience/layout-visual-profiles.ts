import type { InvitationLayoutSlug } from "@/types/invitation-design";
import type { EnvironmentPresetId } from "@/lib/experience/experience-types";
import { getCinematicTheme, isCinematicLayout } from "@/lib/invitation/cinematic-themes";

export interface LayoutVisualProfile {
  background: string;
  accentGlow: string;
  environment: EnvironmentPresetId;
  vignette: "soft" | "dramatic" | "minimal" | "none";
  overlayGradient: string;
}

/** Per-layout atmospheric identity — no two layouts share the same visual profile. */
const PROFILES: Record<InvitationLayoutSlug, LayoutVisualProfile> = {
  "classic-gold": {
    background: "radial-gradient(ellipse at center, #2a2520 0%, #1a1612 50%, #0a0a0a 100%)",
    accentGlow: "rgba(184,158,103,0.35)",
    environment: "royal-wedding",
    vignette: "soft",
    overlayGradient: "from-amber-950/40 via-black/50 to-black/80",
  },
  "arch-green": {
    background: "radial-gradient(ellipse at top, #1B3022 0%, #0d1a12 60%, #050a08 100%)",
    accentGlow: "rgba(201,184,150,0.3)",
    environment: "spring-garden",
    vignette: "soft",
    overlayGradient: "from-emerald-950/50 via-black/40 to-black/75",
  },
  "rustic-lace": {
    background: "linear-gradient(165deg, #3D2314 0%, #2a1810 50%, #1a0f0a 100%)",
    accentGlow: "rgba(248,244,239,0.2)",
    environment: "none",
    vignette: "dramatic",
    overlayGradient: "from-amber-950/30 via-stone-950/50 to-black/85",
  },
  "boho-hexagon": {
    background: "linear-gradient(180deg, #F9F7F2 0%, #f5e6d3 40%, #e8d5c4 100%)",
    accentGlow: "rgba(212,165,165,0.35)",
    environment: "floating-petals",
    vignette: "minimal",
    overlayGradient: "from-rose-100/20 via-transparent to-amber-100/30",
  },
  "luxury-rings": {
    background: "radial-gradient(circle at 50% 30%, #1a1a1a 0%, #0a0a0a 70%, #000 100%)",
    accentGlow: "rgba(212,175,55,0.45)",
    environment: "stars",
    vignette: "dramatic",
    overlayGradient: "from-black/60 via-black/70 to-black/90",
  },
  "custom-media": {
    background: "linear-gradient(135deg, #134E4A 0%, #0f766e 50%, #042f2e 100%)",
    accentGlow: "rgba(20,184,166,0.35)",
    environment: "none",
    vignette: "soft",
    overlayGradient: "from-teal-950/40 via-black/45 to-black/75",
  },
  "passport-luxe": {
    background: "linear-gradient(160deg, #0f172a 0%, #1e293b 40%, #0f766e 100%)",
    accentGlow: "rgba(212,166,58,0.35)",
    environment: "none",
    vignette: "soft",
    overlayGradient: "from-slate-900/50 via-teal-950/40 to-black/80",
  },
  "glass-acrylic": {
    background: "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,58,138,0.6) 100%)",
    accentGlow: "rgba(56,189,248,0.35)",
    environment: "none",
    vignette: "minimal",
    overlayGradient: "from-sky-950/30 via-indigo-950/40 to-black/70",
  },
  "floral-garden": {
    background: "linear-gradient(180deg, #881337 0%, #4c0519 50%, #1a0510 100%)",
    accentGlow: "rgba(253,164,175,0.35)",
    environment: "floating-petals",
    vignette: "soft",
    overlayGradient: "from-rose-950/40 via-pink-950/30 to-black/75",
  },
  "royal-emerald-wedding": {
    background: "radial-gradient(ellipse at top, #064e3b 0%, #022c22 45%, #0a0a0a 100%)",
    accentGlow: "rgba(212,175,55,0.45)",
    environment: "royal-wedding",
    vignette: "dramatic",
    overlayGradient: "from-emerald-950/50 via-black/40 to-black/80",
  },
  "midnight-velvet-reception": {
    background: "linear-gradient(165deg, #0f172a 0%, #1e1b4b 50%, #020617 100%)",
    accentGlow: "rgba(226,232,240,0.35)",
    environment: "none",
    vignette: "dramatic",
    overlayGradient: "from-indigo-950/60 via-slate-950/50 to-black/85",
  },
  "kente-heritage-union": {
    background: "linear-gradient(145deg, #92400e 0%, #7f1d1d 35%, #14532d 100%)",
    accentGlow: "rgba(251,191,36,0.4)",
    environment: "kente-gold",
    vignette: "soft",
    overlayGradient: "from-amber-950/40 via-red-950/30 to-emerald-950/50",
  },
  "traditional-marriage-ceremony": {
    background: "linear-gradient(180deg, #FDF1EC 0%, #F8E6DC 50%, #E8C9B8 100%)",
    accentGlow: "rgba(139,105,20,0.35)",
    environment: "floating-petals",
    vignette: "minimal",
    overlayGradient: "from-rose-100/20 via-orange-50/10 to-amber-100/40",
  },
  "floral-garden-romance": {
    background: "linear-gradient(180deg, #fff1f2 0%, #fce7f3 30%, #881337 100%)",
    accentGlow: "rgba(253,164,175,0.35)",
    environment: "floating-petals",
    vignette: "minimal",
    overlayGradient: "from-rose-100/30 via-pink-200/20 to-rose-950/60",
  },
  "passport-destination-wedding": {
    background: "linear-gradient(160deg, #F8FAFC 0%, #0f766e 60%, #0f172a 100%)",
    accentGlow: "rgba(212,166,58,0.35)",
    environment: "none",
    vignette: "soft",
    overlayGradient: "from-teal-900/40 via-slate-900/50 to-black/75",
  },
  "crystal-acrylic-luxury": {
    background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(56,189,248,0.15) 50%, rgba(15,23,42,0.95) 100%)",
    accentGlow: "rgba(56,189,248,0.35)",
    environment: "none",
    vignette: "minimal",
    overlayGradient: "from-sky-200/10 via-slate-900/40 to-black/70",
  },
  "golden-islamic-nikkah": {
    background: "radial-gradient(circle at 50% 0%, #064e3b 0%, #022c22 55%, #0a0a0a 100%)",
    accentGlow: "rgba(212,175,55,0.4)",
    environment: "islamic-gold",
    vignette: "dramatic",
    overlayGradient: "from-emerald-950/50 via-black/45 to-black/85",
  },
  "memorial-candle-tribute": {
    background: "radial-gradient(ellipse at center, #1c1917 0%, #0c0a09 70%, #000 100%)",
    accentGlow: "rgba(251,191,36,0.25)",
    environment: "none",
    vignette: "dramatic",
    overlayGradient: "from-stone-950/60 via-black/70 to-black/95",
  },
  "neon-celebration-party": {
    background: "linear-gradient(160deg, #581c87 0%, #1e1b4b 40%, #0a0a0a 100%)",
    accentGlow: "rgba(232,121,249,0.5)",
    environment: "confetti",
    vignette: "minimal",
    overlayGradient: "from-fuchsia-950/40 via-purple-950/30 to-black/80",
  },
  "corporate-prestige-summit": {
    background: "linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #134e4a 100%)",
    accentGlow: "rgba(20,184,166,0.35)",
    environment: "none",
    vignette: "soft",
    overlayGradient: "from-slate-900/50 via-teal-950/30 to-black/75",
  },
};

export function getLayoutVisualProfile(layout: string): LayoutVisualProfile {
  if (layout in PROFILES) return PROFILES[layout as InvitationLayoutSlug];
  if (isCinematicLayout(layout)) {
    const theme = getCinematicTheme(layout);
    if (theme) {
      return {
        background: theme.background,
        accentGlow: theme.accentGlow,
        environment: (theme.config.experience?.environment as EnvironmentPresetId) ?? "none",
        vignette: "soft",
        overlayGradient: "from-black/50 via-black/35 to-black/75",
      };
    }
  }
  return PROFILES["classic-gold"];
}
