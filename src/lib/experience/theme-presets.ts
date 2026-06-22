import type { EventExperienceConfig, OpeningExperienceId } from "@/lib/experience/experience-types";
import type { InvitationDesignColors } from "@/types/invitation-design";

export interface ExperienceThemePreset {
  id: string;
  label: string;
  description: string;
  colors: InvitationDesignColors;
  experience: Partial<EventExperienceConfig>;
  openingExperience: OpeningExperienceId;
}

export const EXPERIENCE_THEME_PRESETS: ExperienceThemePreset[] = [
  {
    id: "luxury-wedding",
    label: "Luxury Wedding",
    description: "Royal gold wax seal, sparkles, luxury countdown",
    colors: {
      primary: "#0F172A",
      secondary: "#D4A63A",
      accent: "#0B8A83",
      background: "#FAF8F4",
      text: "#0F172A",
    },
    openingExperience: "wax-seal-gold",
    experience: {
      environment: "royal-wedding",
      environmentIntensity: "medium",
      countdownStyle: "luxury",
      hubMode: "scroll",
    },
  },
  {
    id: "floral-wedding",
    label: "Floral Wedding",
    description: "Floral envelope, floating petals, spring garden",
    colors: {
      primary: "#831843",
      secondary: "#fda4af",
      accent: "#0B8A83",
      background: "#FFF8F3",
      text: "#1f2937",
    },
    openingExperience: "envelope-floral",
    experience: {
      environment: "spring-garden",
      environmentIntensity: "heavy",
      countdownStyle: "glass",
      hubMode: "journey",
    },
  },
  {
    id: "kente-traditional",
    label: "Kente Traditional",
    description: "Kente envelope, Adinkra particles, royal gold countdown",
    colors: {
      primary: "#1a472a",
      secondary: "#D4A63A",
      accent: "#c0392b",
      background: "#FAF8F4",
      text: "#0F172A",
    },
    openingExperience: "envelope-kente",
    experience: {
      environment: "kente-gold",
      environmentIntensity: "medium",
      countdownStyle: "gold-royal",
      hubMode: "scroll",
    },
  },
  {
    id: "islamic-nikkah",
    label: "Islamic / Nikkah",
    description: "Golden ornamental envelope, Islamic gold environment",
    colors: {
      primary: "#0d3b2e",
      secondary: "#D4A63A",
      accent: "#0B8A83",
      background: "#0d2818",
      text: "#F5E6B8",
    },
    openingExperience: "envelope-islamic",
    experience: {
      environment: "islamic-gold",
      environmentIntensity: "light",
      countdownStyle: "gold-royal",
      hubMode: "scroll",
    },
  },
  {
    id: "corporate-launch",
    label: "Corporate Launch",
    description: "Clean curtain reveal, minimal particles",
    colors: {
      primary: "#0F172A",
      secondary: "#64748b",
      accent: "#0B8A83",
      background: "#f8fafc",
      text: "#0F172A",
    },
    openingExperience: "curtain-corporate",
    experience: {
      environment: "none",
      environmentIntensity: "none",
      countdownStyle: "minimal",
      hubMode: "scroll",
    },
  },
  {
    id: "birthday-celebration",
    label: "Birthday Party",
    description: "Festive curtain, confetti environment",
    colors: {
      primary: "#7c3aed",
      secondary: "#FF6B57",
      accent: "#0B8A83",
      background: "#fef3c7",
      text: "#0F172A",
    },
    openingExperience: "curtain-birthday",
    experience: {
      environment: "floating-petals",
      environmentIntensity: "heavy",
      countdownStyle: "flip",
      hubMode: "journey",
    },
  },
];

export function getThemePreset(id: string) {
  return EXPERIENCE_THEME_PRESETS.find((p) => p.id === id);
}
