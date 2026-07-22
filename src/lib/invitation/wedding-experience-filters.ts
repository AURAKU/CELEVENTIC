/**
 * Wedding-only filters for openings, hub tabs, outros, and environments.
 * Keeps funeral / corporate / birthday ceremonies out of wedding studio + guest flows.
 */
import type {
  EnvironmentPresetId,
  HubTabId,
  OpeningExperienceId,
  OutroExperienceId,
} from "@/lib/experience/experience-types";

const WEDDING_EVENT_MARKERS = ["WEDDING", "ENGAGEMENT"];

export function isWeddingEventType(eventType: string | undefined | null): boolean {
  if (!eventType) return false;
  const n = eventType.toUpperCase();
  return WEDDING_EVENT_MARKERS.some((m) => n === m || n.includes(m));
}

/** Openings allowed when editing / previewing a wedding invitation */
export const WEDDING_ALLOWED_OPENINGS: ReadonlySet<OpeningExperienceId> = new Set([
  "envelope-classic",
  "wax-seal-pink",
  "wax-seal-gold",
  "wax-seal-rose",
  "wax-seal-silver",
  "wax-seal-black",
  "wax-seal-emerald",
  "envelope-floral",
  "envelope-royal",
  "envelope-kente",
  "envelope-islamic",
  "curtain-wedding",
  "palace-entrance",
  "scratch",
  "passport",
  "glass",
  "scroll-unroll",
  "swipe-reveal",
  "pop-reveal",
  "gift-box",
  "light-beam",
  "film-countdown",
  "letter-unfold",
  "flower-bloom",
  "confetti-burst",
  "flip-reveal",
  "zoom-reveal",
  "magazine-page-turn",
  "press-hold",
  "satin-bow",
  "ring-box",
  "archway",
  "petal-fall",
  "none",
]);

const NON_WEDDING_OPENINGS: ReadonlySet<OpeningExperienceId> = new Set([
  "curtain-corporate",
  "curtain-concert",
  "curtain-award",
  "curtain-birthday",
  "candle-light",
]);

/** Hub tabs appropriate for wedding guest portals (no funeral/corporate semantics) */
export const WEDDING_HUB_TABS: readonly HubTabId[] = [
  "invitation",
  "countdown",
  "story",
  "venue",
  "gallery",
  "timeline",
  "menu",
  "gifts",
  "seating",
  "rsvp",
  "memory",
  "livestream",
] as const;

export const WEDDING_ALLOWED_OUTROS: ReadonlySet<OutroExperienceId> = new Set([
  "thank-you-fade",
  "fireworks",
  "lanterns",
  "butterflies",
  "rose-petals",
  "golden-sparkles",
  "closing-curtain",
  "memory-slideshow",
  "final-quote",
  "see-you-soon",
  "seal-reform",
  "credits-page",
  "none",
]);

export const WEDDING_ALLOWED_ENVIRONMENTS: ReadonlySet<EnvironmentPresetId> = new Set([
  "none",
  "spring-garden",
  "royal-wedding",
  "sunset-beach",
  "floating-petals",
  "fireflies",
  "stars",
  "kente-gold",
  "islamic-gold",
  "lanterns",
  "hearts",
  "butterflies",
  "confetti",
]);

export function filterOpeningsForEventType<T extends { id: OpeningExperienceId }>(
  openings: T[],
  eventType?: string | null
): T[] {
  if (!isWeddingEventType(eventType)) return openings;
  return openings.filter(
    (o) => WEDDING_ALLOWED_OPENINGS.has(o.id) && !NON_WEDDING_OPENINGS.has(o.id)
  );
}

export function hubTabsForEventType(eventType?: string | null): HubTabId[] {
  if (isWeddingEventType(eventType)) return [...WEDDING_HUB_TABS];
  return [
    "invitation",
    "rsvp",
    "story",
    "countdown",
    "venue",
    "gallery",
    "gifts",
    "seating",
    "menu",
    "timeline",
    "memory",
    "livestream",
  ];
}
