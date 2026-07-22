import type { OpeningExperienceId } from "@/lib/experience/experience-types";
import { OPENING_EXPERIENCES } from "@/lib/experience/opening-experiences";

export type RevealEffectCategory = "envelope" | "curtain" | "interactive" | "palace" | "instant";

export interface RevealEffectMeta {
  id: OpeningExperienceId;
  label: string;
  description: string;
  category: RevealEffectCategory;
  accent: string;
  icon: string;
}

const REVEAL_ACCENT: Partial<Record<OpeningExperienceId, string>> = {
  scratch: "#D4AF37",
  "swipe-reveal": "#6366F1",
  "pop-reveal": "#EC4899",
  "flip-reveal": "#38BDF8",
  "zoom-reveal": "#F59E0B",
  "gift-box": "#F472B6",
  "light-beam": "#FDE68A",
  "film-countdown": "#EF4444",
  "flower-bloom": "#F472B6",
  "confetti-burst": "#A855F7",
  passport: "#0B8A83",
  glass: "#38BDF8",
  "scroll-unroll": "#D4A63A",
  "palace-entrance": "#D4AF37",
};

const REVEAL_ICON: Partial<Record<OpeningExperienceId, string>> = {
  scratch: "✦",
  "swipe-reveal": "→",
  "pop-reveal": "◎",
  "flip-reveal": "↻",
  "zoom-reveal": "⊕",
  "gift-box": "🎁",
  "light-beam": "☀",
  "film-countdown": "3",
  "flower-bloom": "✿",
  "confetti-burst": "✨",
  passport: "✈",
  glass: "◇",
  "scroll-unroll": "📜",
  "palace-entrance": "♛",
};

/** Showcase grid — the 10 hero reveal interactions from the Experience Engine mockup */
export const SHOWCASE_REVEAL_EFFECTS: RevealEffectMeta[] = [
  { id: "scratch", label: "Scratch to Reveal", description: "Scratch gold foil to unveil", category: "interactive", accent: "#D4AF37", icon: "✦" },
  { id: "pop-reveal", label: "Pop to Reveal", description: "Tap to pop and celebrate", category: "interactive", accent: "#EC4899", icon: "◎" },
  { id: "swipe-reveal", label: "Swipe to Reveal", description: "Swipe across to unveil", category: "interactive", accent: "#6366F1", icon: "→" },
  { id: "flip-reveal", label: "Flip to Reveal", description: "3D card flip ceremony", category: "interactive", accent: "#38BDF8", icon: "↻" },
  { id: "zoom-reveal", label: "Zoom to Reveal", description: "Camera zoom into moment", category: "interactive", accent: "#F59E0B", icon: "⊕" },
  { id: "curtain-wedding", label: "Curtain Rise", description: "Velvet curtains part after tap — theatrical reveal", category: "curtain", accent: "#DC2626", icon: "🎭" },
  { id: "glass", label: "Glass Swipe", description: "Frosted acrylic swipe", category: "interactive", accent: "#38BDF8", icon: "◇" },
  { id: "confetti-burst", label: "Particle Burst", description: "Instant confetti celebration", category: "interactive", accent: "#A855F7", icon: "✨" },
  { id: "light-beam", label: "Light Beam", description: "Luxury spotlight reveal", category: "interactive", accent: "#FDE68A", icon: "☀" },
  { id: "film-countdown", label: "Cinematic Fade", description: "Film 3-2-1 countdown", category: "interactive", accent: "#EF4444", icon: "3" },
];

export const REVEAL_EFFECTS_REGISTRY: RevealEffectMeta[] = OPENING_EXPERIENCES
  .filter((e) => e.id !== "none")
  .map((e) => ({
    id: e.id,
    label: e.label,
    description: e.description,
    category: e.category as RevealEffectCategory,
    accent: REVEAL_ACCENT[e.id] ?? "#0B8A83",
    icon: REVEAL_ICON[e.id] ?? "★",
  }));

export function getRevealEffect(id: OpeningExperienceId): RevealEffectMeta | undefined {
  return REVEAL_EFFECTS_REGISTRY.find((r) => r.id === id);
}
