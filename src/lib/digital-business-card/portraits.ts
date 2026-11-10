/**
 * CeleYou portrait: cropped photo, chosen house mark, illustrated avatar, or the CeleYou mark.
 * Marks and avatars are original so every background can pick one without a photo.
 */

export const CELECARD_HOUSE_AVATAR_IDS = [
  "celecard",
  "foil",
  "pulse",
  "night",
  "earth",
  "bloom",
  "grid",
  "wave",
  "crop",
  "specs",
  "wrap",
  "afro",
  "longwave",
  "braids",
  "hood",
  "puff",
  "locs",
  "silver",
  "fade",
  "crown",
  "bob",
  "rows",
  "twists",
  "collar",
  "kohl",
  "russet",
  "mesa",
  "nile",
  "island",
  "silk",
  "pampas",
  "fox",
  "lion",
  "crane",
  "whale",
  "beetle",
  "koi",
  "comet",
  "prism",
  "orbit",
  "spark",
  "knot",
  "eclipse",
  "rocket",
  "vinyl",
  "kite",
  "crystal",
] as const;

export type CeleCardHouseAvatarId = (typeof CELECARD_HOUSE_AVATAR_IDS)[number];
export type CeleCardHouseAvatarKind = "mark" | "avatar";
export type CeleCardHouseAvatarGroup = "mark" | "people" | "creature" | "studio";

export const CELECARD_HOUSE_AVATAR_PREFIX = "house:";
export const CELECARD_DEFAULT_AVATAR = `${CELECARD_HOUSE_AVATAR_PREFIX}celecard`;

/** Longest edge kept for a cropped portrait. Covers 3x present and the 36% portrait panel. Never upscale. */
export const CELECARD_PORTRAIT_MAX_EDGE = 2048;
export const CELECARD_PORTRAIT_WEBP_QUALITY = 92;
export const CELECARD_LOGO_MAX_EDGE = 720;
export const CELECARD_LOGO_WEBP_QUALITY = 92;

export const CELECARD_HOUSE_AVATARS: {
  id: CeleCardHouseAvatarId;
  kind: CeleCardHouseAvatarKind;
  group: CeleCardHouseAvatarGroup;
  label: string;
  hint: string;
}[] = [
  { id: "celecard", kind: "mark", group: "mark", label: "CeleYou", hint: "House mark" },
  { id: "foil", kind: "mark", group: "mark", label: "Foil", hint: "Warm rings" },
  { id: "pulse", kind: "mark", group: "mark", label: "Pulse", hint: "Live signal" },
  { id: "night", kind: "mark", group: "mark", label: "Night", hint: "Quiet crescent" },
  { id: "earth", kind: "mark", group: "mark", label: "Earth", hint: "Warm bands" },
  { id: "bloom", kind: "mark", group: "mark", label: "Bloom", hint: "Open petals" },
  { id: "grid", kind: "mark", group: "mark", label: "Grid", hint: "Studio dots" },
  { id: "wave", kind: "mark", group: "mark", label: "Wave", hint: "Soft current" },
  { id: "crop", kind: "avatar", group: "people", label: "Crop", hint: "Short side part" },
  { id: "specs", kind: "avatar", group: "people", label: "Specs", hint: "Round glasses" },
  { id: "wrap", kind: "avatar", group: "people", label: "Wrap", hint: "Soft headscarf" },
  { id: "afro", kind: "avatar", group: "people", label: "Afro", hint: "Full crown" },
  { id: "longwave", kind: "avatar", group: "people", label: "Long wave", hint: "Side sweep" },
  { id: "braids", kind: "avatar", group: "people", label: "Braids", hint: "Falling braids" },
  { id: "hood", kind: "avatar", group: "people", label: "Hood", hint: "Easy hood" },
  { id: "puff", kind: "avatar", group: "people", label: "Puff", hint: "High puff" },
  { id: "locs", kind: "avatar", group: "people", label: "Locs", hint: "Gathered locs" },
  { id: "silver", kind: "avatar", group: "people", label: "Silver", hint: "Silver crop" },
  { id: "fade", kind: "avatar", group: "people", label: "Fade", hint: "Tapered fade" },
  { id: "crown", kind: "avatar", group: "people", label: "Crown", hint: "Wrapped crown" },
  { id: "bob", kind: "avatar", group: "people", label: "Bob", hint: "Sharp bob" },
  { id: "rows", kind: "avatar", group: "people", label: "Rows", hint: "Cornrows" },
  { id: "twists", kind: "avatar", group: "people", label: "Twists", hint: "Two-strand twists" },
  { id: "collar", kind: "avatar", group: "people", label: "Collar", hint: "Open collar" },
  { id: "kohl", kind: "avatar", group: "people", label: "Kohl", hint: "Center part" },
  { id: "russet", kind: "avatar", group: "people", label: "Russet", hint: "Copper waves" },
  { id: "mesa", kind: "avatar", group: "people", label: "Mesa", hint: "Long braid" },
  { id: "nile", kind: "avatar", group: "people", label: "Nile", hint: "Short coils" },
  { id: "island", kind: "avatar", group: "people", label: "Island", hint: "Open waves" },
  { id: "silk", kind: "avatar", group: "people", label: "Silk", hint: "Clean undercut" },
  { id: "pampas", kind: "avatar", group: "people", label: "Pampas", hint: "Soft waves" },
  { id: "fox", kind: "avatar", group: "creature", label: "Fox", hint: "Alert ears" },
  { id: "lion", kind: "avatar", group: "creature", label: "Lion", hint: "Warm mane" },
  { id: "crane", kind: "avatar", group: "creature", label: "Crane", hint: "Long wing" },
  { id: "whale", kind: "avatar", group: "creature", label: "Whale", hint: "Deep swell" },
  { id: "beetle", kind: "avatar", group: "creature", label: "Beetle", hint: "Shield back" },
  { id: "koi", kind: "avatar", group: "creature", label: "Koi", hint: "River curve" },
  { id: "comet", kind: "avatar", group: "studio", label: "Comet", hint: "Fast tail" },
  { id: "prism", kind: "avatar", group: "studio", label: "Prism", hint: "Cut light" },
  { id: "orbit", kind: "avatar", group: "studio", label: "Orbit", hint: "Ringed world" },
  { id: "spark", kind: "avatar", group: "studio", label: "Spark", hint: "Eight points" },
  { id: "knot", kind: "avatar", group: "studio", label: "Knot", hint: "Linked loop" },
  { id: "eclipse", kind: "avatar", group: "studio", label: "Eclipse", hint: "Covered sun" },
  { id: "rocket", kind: "avatar", group: "studio", label: "Rocket", hint: "Lift mark" },
  { id: "vinyl", kind: "avatar", group: "studio", label: "Vinyl", hint: "Studio disc" },
  { id: "kite", kind: "avatar", group: "studio", label: "Kite", hint: "Wind diamond" },
  { id: "crystal", kind: "avatar", group: "studio", label: "Crystal", hint: "Cut stone" },
];

export function celeCardHouseAvatarsByKind(kind: CeleCardHouseAvatarKind) {
  return CELECARD_HOUSE_AVATARS.filter((item) => item.kind === kind);
}

export function celeCardHouseAvatarsByGroup(group: CeleCardHouseAvatarGroup) {
  return CELECARD_HOUSE_AVATARS.filter((item) => item.group === group);
}

export function celeCardHouseAvatarMeta(id: CeleCardHouseAvatarId) {
  return CELECARD_HOUSE_AVATARS.find((item) => item.id === id) ?? CELECARD_HOUSE_AVATARS[0];
}

export function isCeleCardHouseAvatarId(value: string): value is CeleCardHouseAvatarId {
  return (CELECARD_HOUSE_AVATAR_IDS as readonly string[]).includes(value);
}

export function celeCardHouseAvatarValue(id: CeleCardHouseAvatarId): string {
  return `${CELECARD_HOUSE_AVATAR_PREFIX}${id}`;
}

export function isCeleCardIllustratedAvatar(url?: string | null): boolean {
  if (!url?.startsWith(CELECARD_HOUSE_AVATAR_PREFIX)) return false;
  return celeCardHouseAvatarMeta(celeCardHouseAvatarId(url)).kind === "avatar";
}

/** True when the circle should render a real photograph. */
export function isCeleCardPhotoUrl(url?: string | null): boolean {
  if (!url) return false;
  if (url.startsWith(CELECARD_HOUSE_AVATAR_PREFIX)) return false;
  return true;
}

export function celeCardHouseAvatarId(url?: string | null): CeleCardHouseAvatarId {
  if (!url) return "celecard";
  if (url.startsWith(CELECARD_HOUSE_AVATAR_PREFIX)) {
    const id = url.slice(CELECARD_HOUSE_AVATAR_PREFIX.length);
    if (isCeleCardHouseAvatarId(id)) return id;
  }
  return "celecard";
}
