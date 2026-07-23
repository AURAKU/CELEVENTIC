/**
 * Interactive reveal contract — maps ceremony mechanics onto OpeningExperienceId
 * without rewriting existing reveal components.
 */
import type { OpeningExperienceId } from "@/lib/experience/experience-types";
import type { InteractiveRevealContract, RevealMechanicId } from "@/lib/experience-engine/types";

export const REVEAL_MECHANIC_CONTRACTS: Record<RevealMechanicId, InteractiveRevealContract> = {
  envelope: {
    mechanic: "envelope",
    openingExperience: "envelope-classic",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Open the sealed envelope",
    keyboardLabel: "Open invitation",
  },
  "wax-seal": {
    mechanic: "wax-seal",
    openingExperience: "wax-seal-gold",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Press the wax seal",
    keyboardLabel: "Break seal and open",
  },
  scratch: {
    mechanic: "scratch",
    openingExperience: "scratch",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Scratch to reveal",
    keyboardLabel: "Reveal invitation",
  },
  swipe: {
    mechanic: "swipe",
    openingExperience: "swipe-reveal",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Swipe to unveil",
    keyboardLabel: "Open invitation",
  },
  curtain: {
    mechanic: "curtain",
    openingExperience: "curtain-wedding",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Touch to begin",
    keyboardLabel: "Reveal invitation",
  },
  ribbon: {
    mechanic: "ribbon",
    openingExperience: "satin-bow",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Untie the ribbon",
    keyboardLabel: "Untie and open",
  },
  gate: {
    mechanic: "gate",
    openingExperience: "archway",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Open the gate",
    keyboardLabel: "Enter invitation",
  },
  "card-flip": {
    mechanic: "card-flip",
    openingExperience: "flip-reveal",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Flip the card",
    keyboardLabel: "Flip to open",
  },
  "paper-unfold": {
    mechanic: "paper-unfold",
    openingExperience: "letter-unfold",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Unfold the letter",
    keyboardLabel: "Unfold invitation",
  },
  "tap-to-bloom": {
    mechanic: "tap-to-bloom",
    openingExperience: "flower-bloom",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Tap to bloom",
    keyboardLabel: "Bloom and open",
  },
  "press-hold": {
    mechanic: "press-hold",
    openingExperience: "press-hold",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Press and hold",
    keyboardLabel: "Open invitation",
  },
  peel: {
    mechanic: "peel",
    openingExperience: "glass",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Peel away the cover",
    keyboardLabel: "Peel to open",
  },
  "photo-develop": {
    mechanic: "photo-develop",
    openingExperience: "zoom-reveal",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Watch the photo develop",
    keyboardLabel: "Reveal photo",
  },
  passport: {
    mechanic: "passport",
    openingExperience: "passport",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Stamp your passport",
    keyboardLabel: "Stamp and open",
  },
  glass: {
    mechanic: "glass",
    openingExperience: "glass",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Swipe the frost",
    keyboardLabel: "Clear glass",
  },
  palace: {
    mechanic: "palace",
    openingExperience: "palace-entrance",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Enter the palace",
    keyboardLabel: "Enter invitation",
  },
  "gift-box": {
    mechanic: "gift-box",
    openingExperience: "gift-box",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Open the gift",
    keyboardLabel: "Open gift",
  },
  "light-beam": {
    mechanic: "light-beam",
    openingExperience: "light-beam",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Follow the light",
    keyboardLabel: "Continue",
  },
  "film-countdown": {
    mechanic: "film-countdown",
    openingExperience: "film-countdown",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Countdown begins",
    keyboardLabel: "Skip countdown",
  },
  "confetti-burst": {
    mechanic: "confetti-burst",
    openingExperience: "confetti-burst",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Tap to celebrate",
    keyboardLabel: "Open invitation",
  },
  zoom: {
    mechanic: "zoom",
    openingExperience: "zoom-reveal",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Zoom into the moment",
    keyboardLabel: "Continue",
  },
  pop: {
    mechanic: "pop",
    openingExperience: "pop-reveal",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Tap to pop",
    keyboardLabel: "Open invitation",
  },
  "scroll-unroll": {
    mechanic: "scroll-unroll",
    openingExperience: "scroll-unroll",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Unroll the scroll",
    keyboardLabel: "Unroll invitation",
  },
  "magazine-page-turn": {
    mechanic: "magazine-page-turn",
    openingExperience: "magazine-page-turn",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Swipe to turn the page",
    keyboardLabel: "Turn page and open",
  },
  "candle-light": {
    mechanic: "candle-light",
    openingExperience: "candle-light",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Tap to light the candle",
    keyboardLabel: "Light candle and continue",
  },
  "satin-bow": {
    mechanic: "satin-bow",
    openingExperience: "satin-bow",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Untie the satin bow",
    keyboardLabel: "Untie and open",
  },
  "ring-box": {
    mechanic: "ring-box",
    openingExperience: "ring-box",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Open the ring box",
    keyboardLabel: "Open ring box",
  },
  archway: {
    mechanic: "archway",
    openingExperience: "archway",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Open the archway",
    keyboardLabel: "Enter through the gates",
  },
  "petal-fall": {
    mechanic: "petal-fall",
    openingExperience: "petal-fall",
    supportsKeyboardFallback: true,
    supportsReducedMotion: true,
    gestureHint: "Let the petals fall",
    keyboardLabel: "Reveal invitation",
  },
  none: {
    mechanic: "none",
    openingExperience: "none",
    supportsKeyboardFallback: false,
    supportsReducedMotion: true,
    gestureHint: "",
    keyboardLabel: "Continue",
  },
};

const OPENING_TO_MECHANIC: Partial<Record<OpeningExperienceId, RevealMechanicId>> = {
  "envelope-classic": "envelope",
  "envelope-floral": "envelope",
  "envelope-royal": "envelope",
  "envelope-embroidered": "wax-seal",
  "envelope-kente": "envelope",
  "envelope-islamic": "envelope",
  "wax-seal-pink": "wax-seal",
  "wax-seal-gold": "wax-seal",
  "wax-seal-rose": "wax-seal",
  "wax-seal-silver": "wax-seal",
  "wax-seal-black": "wax-seal",
  "wax-seal-emerald": "wax-seal",
  scratch: "scratch",
  "swipe-reveal": "swipe",
  "curtain-wedding": "curtain",
  "curtain-concert": "curtain",
  "curtain-award": "curtain",
  "curtain-birthday": "curtain",
  "curtain-corporate": "curtain",
  "palace-entrance": "palace",
  "flip-reveal": "card-flip",
  "letter-unfold": "paper-unfold",
  "flower-bloom": "tap-to-bloom",
  "pop-reveal": "pop",
  "press-hold": "press-hold",
  glass: "peel",
  "zoom-reveal": "photo-develop",
  passport: "passport",
  "gift-box": "gift-box",
  "light-beam": "light-beam",
  "film-countdown": "film-countdown",
  "confetti-burst": "confetti-burst",
  "scroll-unroll": "scroll-unroll",
  "magazine-page-turn": "magazine-page-turn",
  "candle-light": "candle-light",
  "satin-bow": "satin-bow",
  "ring-box": "ring-box",
  archway: "archway",
  "petal-fall": "petal-fall",
  none: "none",
};

export function getRevealContract(mechanic: RevealMechanicId): InteractiveRevealContract {
  return REVEAL_MECHANIC_CONTRACTS[mechanic] ?? REVEAL_MECHANIC_CONTRACTS.envelope;
}

export function revealMechanicFromOpening(
  opening: OpeningExperienceId | string | undefined
): RevealMechanicId {
  if (!opening) return "envelope";
  return OPENING_TO_MECHANIC[opening as OpeningExperienceId] ?? "envelope";
}

export function getRevealContractForOpening(
  opening: OpeningExperienceId | string | undefined
): InteractiveRevealContract {
  const mechanic = revealMechanicFromOpening(opening);
  const base = getRevealContract(mechanic);
  if (opening && opening !== base.openingExperience && opening !== "none") {
    return { ...base, openingExperience: opening as OpeningExperienceId };
  }
  return base;
}

export function listRevealMechanics(): RevealMechanicId[] {
  return Object.keys(REVEAL_MECHANIC_CONTRACTS) as RevealMechanicId[];
}
