import type { FuneralIntroId, FuneralMotionLevel, FuneralThemeId } from "./themes";
import { resolveFuneralTheme } from "./themes";

export type MemorialSectionId =
  | "intro"
  | "hero"
  | "announcement"
  | "programme"
  | "venues"
  | "dress-code"
  | "life-story"
  | "timeline"
  | "gallery"
  | "film"
  | "tributes"
  | "condolence"
  | "candles"
  | "memory-vault"
  | "livestream"
  | "support"
  | "contacts"
  | "rsvp"
  | "closing";

export const DEFAULT_MEMORIAL_SECTION_ORDER: MemorialSectionId[] = [
  "intro",
  "hero",
  "announcement",
  "programme",
  "dress-code",
  "venues",
  "life-story",
  "timeline",
  "gallery",
  "film",
  "tributes",
  "condolence",
  "candles",
  "memory-vault",
  "livestream",
  "support",
  "contacts",
  "rsvp",
  "closing",
];

/** Map legacy FuneralOS reveal styles → Funeral Experience intros */
export function mapRevealStyleToIntro(revealStyle: string | null | undefined): FuneralIntroId {
  switch ((revealStyle || "").toUpperCase()) {
    case "CANDLELIGHT":
      return "candle-remembrance";
    case "DOVE_RELEASE":
      return "heavenly-reveal";
    case "FLORAL":
    case "PHOTO_FRAME":
      return "floral-reveal";
    case "LEGACY_TIMELINE":
      return "memory-journey";
    case "MEMORIAL_BOOK":
      return "ghanaian-regal";
    case "INSTANT":
      return "instant";
    default:
      return "candle-remembrance";
  }
}

export function resolveIntroForTheme(
  themeId: string | null | undefined,
  revealStyle?: string | null,
  explicitIntro?: FuneralIntroId | null
): FuneralIntroId {
  if (explicitIntro) return explicitIntro;
  if (revealStyle) return mapRevealStyleToIntro(revealStyle);
  return resolveFuneralTheme(themeId).introDefault;
}

export function resolveMotionLevel(
  preferred: FuneralMotionLevel | null | undefined,
  reduceMotion: boolean,
  lowBandwidth: boolean
): FuneralMotionLevel {
  if (reduceMotion) return "none";
  if (lowBandwidth) return preferred === "none" ? "none" : "minimal";
  return preferred ?? "gentle";
}

export const INTRO_STORAGE_PREFIX = "celeventic.funeral.intro.done.";

export function introStorageKey(memorialKey: string): string {
  return `${INTRO_STORAGE_PREFIX}${memorialKey}`;
}

/** Suggest theme from catalogue SKU / collection slug */
export function suggestThemeFromSku(sku: string | null | undefined): FuneralThemeId {
  const s = (sku || "").toLowerCase();
  if (s.includes("kente") || s.includes("black-red") || s.includes("cloth")) return "ghana-heritage";
  if (s.includes("white") || s.includes("lily") || s.includes("homegoing")) return "heavenly-peace";
  if (s.includes("royal") || s.includes("mourning")) return "golden-legacy";
  if (s.includes("candle")) return "burgundy-honour";
  if (s.includes("vigil") || s.includes("one-week")) return "midnight-memorial";
  if (s.includes("rose") || s.includes("floral")) return "eternal-rose";
  return "eternal-rose";
}
