import type { InvitationThemeTokens } from "./theme-types";

/**
 * Wave 1 reference themes. Themes are content: adding one here (or later, as a
 * DB record) yields new sellable templates with zero component changes.
 * This registry and theme-resolver.ts are the only places literal color
 * values are allowed in the invitation-pages system.
 */

const gildedSerif: InvitationThemeTokens = {
  id: "gilded-serif",
  name: "Gilded Serif",
  color: {
    primary: "#7a1f1f",
    secondary: "#b89e67",
    accent: "#c9a227",
    surface: "#fff9f0",
    surfaceAlt: "#f7efe2",
    ink: "#241f1a",
    inkMuted: "#6f6355",
    overlay: "rgba(36, 31, 26, 0.45)",
  },
  typography: {
    displayFont: "playfair",
    bodyFont: "cormorant",
    scriptFont: "great-vibes",
    scale: 1,
    letterSpacing: "normal",
  },
  texture: {
    backgroundTexture: "paper",
    dividerStyle: "flourish",
    frameStyle: "gilded",
    foilEffect: "gold",
  },
  motif: {
    packId: "gilded-classic",
    placements: { coverTop: "flourish", coverBottom: "rings", divider: "flourish" },
  },
  motion: { profileId: "gentle-drift", intensity: 0.5 },
  spacing: { pagePadding: "regular", blockGap: "regular", radius: 20, shadow: "soft" },
};

const emeraldArch: InvitationThemeTokens = {
  id: "emerald-arch",
  name: "Emerald Arch",
  color: {
    primary: "#f5f0e6",
    secondary: "#c9b896",
    accent: "#d9b45b",
    surface: "#12281a",
    surfaceAlt: "#1b3022",
    ink: "#f5f0e6",
    inkMuted: "#bcc9b4",
    overlay: "rgba(10, 22, 14, 0.5)",
  },
  typography: {
    displayFont: "cinzel",
    bodyFont: "cormorant",
    scriptFont: "great-vibes",
    scale: 1,
    letterSpacing: "wide",
  },
  texture: {
    backgroundTexture: "linen",
    dividerStyle: "hairline",
    frameStyle: "arch",
    foilEffect: "gold",
  },
  motif: {
    packId: "emerald-botanical",
    placements: { coverTop: "vine", coverBottom: "vine", divider: "leaf" },
  },
  motion: { profileId: "gentle-drift", intensity: 0.45 },
  spacing: { pagePadding: "regular", blockGap: "airy", radius: 24, shadow: "lifted" },
};

const candlelightElegy: InvitationThemeTokens = {
  id: "candlelight-elegy",
  name: "Candlelight Elegy",
  color: {
    primary: "#f7efd8",
    secondary: "#c9a227",
    accent: "#e0b84a",
    surface: "#0a0a0a",
    surfaceAlt: "#141210",
    ink: "#faf8f4",
    inkMuted: "#d4c9b0",
    overlay: "rgba(8, 8, 8, 0.55)",
  },
  typography: {
    displayFont: "playfair",
    bodyFont: "cormorant",
    scriptFont: "cormorant",
    scale: 1.2,
    letterSpacing: "wide",
  },
  texture: {
    backgroundTexture: "velvet-vignette",
    dividerStyle: "double-rule",
    frameStyle: "gilded",
    foilEffect: "gold",
  },
  motif: {
    packId: "memorial-candle",
    placements: { coverTop: "candle", divider: "ribbon" },
  },
  // Funerals use solemn motion — slow fades, never playful drift.
  motion: { profileId: "solemn", intensity: 0.35 },
  spacing: { pagePadding: "grand", blockGap: "regular", radius: 16, shadow: "soft" },
};

const whiteLilyMemorial: InvitationThemeTokens = {
  id: "white-lily-memorial",
  name: "White Lily Memorial",
  color: {
    primary: "#3a4150",
    secondary: "#8b93a3",
    accent: "#a8894e",
    surface: "#fbfaf7",
    surfaceAlt: "#f0eee8",
    ink: "#2c3038",
    inkMuted: "#727986",
    overlay: "rgba(44, 48, 56, 0.4)",
  },
  typography: {
    displayFont: "cormorant",
    bodyFont: "cormorant",
    scriptFont: "great-vibes",
    scale: 1.15,
    letterSpacing: "normal",
  },
  texture: {
    backgroundTexture: "paper",
    dividerStyle: "hairline",
    frameStyle: "hairline",
    foilEffect: "none",
  },
  motif: {
    packId: "white-lily",
    placements: { coverTop: "lily", divider: "lily" },
  },
  motion: { profileId: "solemn", intensity: 0.25 },
  spacing: { pagePadding: "regular", blockGap: "airy", radius: 12, shadow: "none" },
};

const kenteRoyale: InvitationThemeTokens = {
  id: "kente-royale",
  name: "Kente Royale",
  color: {
    primary: "#f6e3b4",
    secondary: "#a3541b",
    accent: "#e0a422",
    surface: "#3d1410",
    surfaceAlt: "#4d1c12",
    ink: "#f8ecd4",
    inkMuted: "#cfa878",
    overlay: "rgba(33, 10, 8, 0.5)",
  },
  typography: {
    displayFont: "cinzel",
    bodyFont: "poppins",
    scriptFont: "great-vibes",
    scale: 1,
    letterSpacing: "grand",
  },
  texture: {
    backgroundTexture: "linen",
    dividerStyle: "double-rule",
    frameStyle: "gilded",
    foilEffect: "gold",
  },
  motif: {
    packId: "kente-royal",
    placements: { coverTop: "flourish", coverBottom: "vine", divider: "ribbon" },
  },
  motion: { profileId: "gentle-drift", intensity: 0.55 },
  spacing: { pagePadding: "regular", blockGap: "regular", radius: 14, shadow: "lifted" },
};

// Memorial gold / black / white — dignified, high-contrast, easy to read.
const royalMourning: InvitationThemeTokens = {
  id: "royal-mourning",
  name: "Royal Mourning",
  color: {
    primary: "#f7efd8",
    secondary: "#c9a227",
    accent: "#e0b84a",
    surface: "#0a0a0a",
    surfaceAlt: "#141210",
    ink: "#faf8f4",
    inkMuted: "#d4c9b0",
    overlay: "rgba(8, 8, 8, 0.55)",
  },
  typography: {
    displayFont: "cinzel",
    bodyFont: "cormorant",
    scriptFont: "cormorant",
    scale: 1.22,
    letterSpacing: "wide",
  },
  texture: {
    backgroundTexture: "velvet-vignette",
    dividerStyle: "double-rule",
    frameStyle: "gilded",
    foilEffect: "gold",
  },
  motif: {
    packId: "memorial-drape",
    placements: { coverTop: "ribbon", divider: "candle" },
  },
  motion: { profileId: "solemn", intensity: 0.3 },
  spacing: { pagePadding: "grand", blockGap: "regular", radius: 10, shadow: "soft" },
};

/** Memorial black / gold / white — registered for catalogue themeId `black-red-cloth`. */
const blackRedCloth: InvitationThemeTokens = {
  id: "black-red-cloth",
  name: "Black Red Cloth",
  color: {
    primary: "#f7efd8",
    secondary: "#c9a227",
    accent: "#e0b84a",
    surface: "#0a0a0a",
    surfaceAlt: "#141210",
    ink: "#faf8f4",
    inkMuted: "#d4c9b0",
    overlay: "rgba(8, 8, 8, 0.6)",
  },
  typography: {
    displayFont: "cinzel",
    bodyFont: "cormorant",
    scriptFont: "cormorant",
    scale: 1.2,
    letterSpacing: "wide",
  },
  texture: {
    backgroundTexture: "velvet-vignette",
    dividerStyle: "double-rule",
    frameStyle: "gilded",
    foilEffect: "gold",
  },
  motif: {
    packId: "memorial-drape",
    placements: { coverTop: "ribbon", divider: "candle" },
  },
  motion: { profileId: "solemn", intensity: 0.35 },
  spacing: { pagePadding: "grand", blockGap: "regular", radius: 8, shadow: "soft" },
};

/** Christian thanksgiving / celebration of life — ivory cloth. */
const whiteClothHomegoing: InvitationThemeTokens = {
  id: "white-cloth-homegoing",
  name: "White Cloth Homegoing",
  color: {
    primary: "#2c3038",
    secondary: "#6b7280",
    accent: "#a8894e",
    surface: "#faf8f4",
    surfaceAlt: "#f0ece4",
    ink: "#1f2329",
    inkMuted: "#6b7280",
    overlay: "rgba(44, 48, 56, 0.35)",
  },
  typography: {
    displayFont: "cormorant",
    bodyFont: "cormorant",
    scriptFont: "great-vibes",
    scale: 1.15,
    letterSpacing: "normal",
  },
  texture: {
    backgroundTexture: "paper",
    dividerStyle: "hairline",
    frameStyle: "hairline",
    foilEffect: "none",
  },
  motif: {
    packId: "white-lily",
    placements: { coverTop: "lily", divider: "lily" },
  },
  motion: { profileId: "solemn", intensity: 0.25 },
  spacing: { pagePadding: "regular", blockGap: "airy", radius: 12, shadow: "none" },
};

/** Heritage kente border funeral banner. */
const kenteBorderFarewell: InvitationThemeTokens = {
  id: "kente-border-farewell",
  name: "Kente Border Farewell",
  color: {
    primary: "#f6e3b4",
    secondary: "#a3541b",
    accent: "#e0a422",
    surface: "#1a0e0a",
    surfaceAlt: "#2a1810",
    ink: "#f8ecd4",
    inkMuted: "#cfa878",
    overlay: "rgba(20, 8, 4, 0.55)",
  },
  typography: {
    displayFont: "cinzel",
    bodyFont: "cormorant",
    scriptFont: "cormorant",
    scale: 1.18,
    letterSpacing: "grand",
  },
  texture: {
    backgroundTexture: "linen",
    dividerStyle: "double-rule",
    frameStyle: "gilded",
    foilEffect: "gold",
  },
  motif: {
    packId: "kente-royal",
    placements: { coverTop: "flourish", coverBottom: "vine", divider: "ribbon" },
  },
  motion: { profileId: "solemn", intensity: 0.4 },
  spacing: { pagePadding: "regular", blockGap: "regular", radius: 10, shadow: "lifted" },
};

/** One-week vigil / wake-keeping notice. */
const oneWeekVigil: InvitationThemeTokens = {
  id: "one-week-vigil",
  name: "One Week Vigil",
  color: {
    primary: "#faf6f0",
    secondary: "#c9a227",
    accent: "#e0b84a",
    surface: "#0a0a0a",
    surfaceAlt: "#141210",
    ink: "#faf8f4",
    inkMuted: "#d4c9b0",
    overlay: "rgba(8, 8, 8, 0.55)",
  },
  typography: {
    displayFont: "cinzel",
    bodyFont: "cormorant",
    scriptFont: "cormorant",
    scale: 1.2,
    letterSpacing: "wide",
  },
  texture: {
    backgroundTexture: "velvet-vignette",
    dividerStyle: "hairline",
    frameStyle: "gilded",
    foilEffect: "gold",
  },
  motif: {
    packId: "memorial-candle",
    placements: { coverTop: "candle", divider: "ribbon" },
  },
  motion: { profileId: "solemn", intensity: 0.3 },
  spacing: { pagePadding: "regular", blockGap: "regular", radius: 12, shadow: "soft" },
};

export const INVITATION_THEMES: Record<string, InvitationThemeTokens> = {
  [gildedSerif.id]: gildedSerif,
  [emeraldArch.id]: emeraldArch,
  [kenteRoyale.id]: kenteRoyale,
  [candlelightElegy.id]: candlelightElegy,
  [whiteLilyMemorial.id]: whiteLilyMemorial,
  [royalMourning.id]: royalMourning,
  [blackRedCloth.id]: blackRedCloth,
  [whiteClothHomegoing.id]: whiteClothHomegoing,
  [kenteBorderFarewell.id]: kenteBorderFarewell,
  [oneWeekVigil.id]: oneWeekVigil,
};

export const WEDDING_THEME_IDS = [gildedSerif.id, emeraldArch.id, kenteRoyale.id];
export const FUNERAL_THEME_IDS = [
  candlelightElegy.id,
  whiteLilyMemorial.id,
  royalMourning.id,
  blackRedCloth.id,
  whiteClothHomegoing.id,
  kenteBorderFarewell.id,
  oneWeekVigil.id,
];

export function getInvitationTheme(id: string | undefined | null): InvitationThemeTokens | undefined {
  if (!id) return undefined;
  return INVITATION_THEMES[id];
}
