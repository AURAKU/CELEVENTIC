export type { FashionInviteAction } from "./analytics";
export { trackFashionAction } from "./analytics";
export {
  FEMMORA_CATALOG_SLUG,
  FEMMORA_DEFAULT_LOOKS,
  FEMMORA_END_ISO,
  FEMMORA_HOUSE_DEFAULTS,
  FEMMORA_MAPS_URL,
  FEMMORA_SILK_BED,
  FEMMORA_START_ISO,
  FEMMORA_STORE_FILM,
  FEMMORA_STORE_POSTER,
  LUXURY_FASHION_LAYOUT_SLUG,
  LUXURY_FASHION_OPENING_ID,
} from "./femmora-preset";
export {
  LUXURY_FASHION_HOUSE_DEFAULTS,
  LUXURY_FASHION_NAV_LABELS,
  mergeFashionHouse,
} from "./house-defaults";
export {
  MAISON_VALE_COLORS,
  MAISON_VALE_END_ISO,
  MAISON_VALE_HOUSE,
  MAISON_VALE_MAPS_URL,
  MAISON_VALE_START_ISO,
  assertHouseIsNotFemmora,
} from "./maison-vale-fixture";
export {
  resolveFashionChapters,
  resolveFashionFilm,
  resolveFashionHouse,
  resolveFashionLookbook,
  resolveFashionStoreStills,
} from "./resolve-fashion-house";
export {
  FASHION_DOORS_OPEN_MS,
  FASHION_EXIT_POINTER_MS,
  FASHION_GESTURE_ARM_MS,
  FASHION_MOTION,
  FASHION_REDUCED_OPEN_MS,
  FASHION_SILK_DRAG_PX,
  FASHION_SILK_OPEN_MS,
  FASHION_TOKEN_VALUES,
  FASHION_WHISPER_MS,
  fashionTokenStyle,
  fashionTokenStyleForSilk,
  fashionTokenStyleFromColors,
} from "./tokens";
export type { FashionChapterFlags, FashionChapterId } from "./resolve-fashion-house";
export type {
  FashionNavDestination,
  FashionNavLabel,
  FashionNavStyle,
  FashionOpeningPhase,
  FashionSilkStyle,
  LuxuryFashionHouseConfig,
} from "./types";
export { FASHION_NAV_DESTINATIONS } from "./types";
