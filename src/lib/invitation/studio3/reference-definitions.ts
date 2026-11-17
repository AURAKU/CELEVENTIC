import type { Experience3Definition } from "@/lib/invitation/studio3/experience-definition";

/** Three priority Experience 3.0 reference definitions (new slugs only). */
export const IX3_EDITORIAL_WEDDING: Experience3Definition = {
  layout: "ix3-editorial-wedding",
  layoutVersion: 1,
  designFamily: "editorial-wedding",
  label: "Experience 3.0 — Editorial Wedding",
  opening: {
    style: "monogram",
    skippable: true,
    respectReducedMotion: true,
  },
  tokens: {
    background: "#f7f2ea",
    surface: "#fffdf9",
    text: "#1c1917",
    muted: "#78716c",
    accent: "#8a6a3d",
    border: "rgba(138, 106, 61, 0.28)",
    headingFont: "var(--font-playfair), Georgia, serif",
    bodyFont: "var(--font-cormorant), Georgia, serif",
    eyebrowFont: "ui-sans-serif, system-ui, sans-serif",
  },
  sections: [
    { id: "opening", module: "opening", label: "Opening" },
    { id: "hero", module: "hero", label: "Cover" },
    { id: "welcome", module: "guest-welcome", label: "Welcome" },
    { id: "story", module: "story", label: "Invitation" },
    { id: "dress", module: "dress-code", label: "Dress code" },
    { id: "venues", module: "venues", label: "Venue" },
    { id: "rsvp", module: "rsvp", featureKey: "RSVP", label: "RSVP" },
    { id: "actions", module: "actions", label: "Actions" },
  ],
  motionIntensity: 0.5,
  audioDefaultEnabled: false,
};

export const IX3_BRAND_LAUNCH: Experience3Definition = {
  layout: "ix3-brand-launch",
  layoutVersion: 1,
  designFamily: "brand-launch",
  label: "Experience 3.0 — Premium Brand Launch",
  opening: {
    style: "cinematic",
    skippable: true,
    respectReducedMotion: true,
  },
  tokens: {
    background: "#070708",
    surface: "#111114",
    text: "#f5f5f4",
    muted: "#a8a29e",
    accent: "#e7e5e4",
    border: "rgba(231, 229, 228, 0.18)",
    headingFont: "ui-sans-serif, system-ui, sans-serif",
    bodyFont: "ui-sans-serif, system-ui, sans-serif",
    eyebrowFont: "ui-sans-serif, system-ui, sans-serif",
  },
  sections: [
    { id: "opening", module: "opening", label: "Opening" },
    { id: "hero", module: "hero", label: "Reveal" },
    { id: "welcome", module: "guest-welcome", label: "VIP welcome" },
    { id: "story", module: "story", label: "Event" },
    { id: "venues", module: "venues", label: "Venue" },
    { id: "rsvp", module: "rsvp", featureKey: "RSVP", label: "RSVP" },
    { id: "actions", module: "actions", label: "Actions" },
  ],
  motionIntensity: 0.75,
  audioDefaultEnabled: false,
};

export const IX3_MEMORIAL: Experience3Definition = {
  layout: "ix3-memorial",
  layoutVersion: 1,
  designFamily: "memorial",
  label: "Experience 3.0 — Contemporary Memorial",
  opening: {
    style: "portrait",
    skippable: true,
    respectReducedMotion: true,
  },
  tokens: {
    background: "#efeae3",
    surface: "#f8f5f0",
    text: "#292524",
    muted: "#78716c",
    accent: "#57534e",
    border: "rgba(87, 83, 78, 0.22)",
    headingFont: "var(--font-cormorant), Georgia, serif",
    bodyFont: "var(--font-cormorant), Georgia, serif",
    eyebrowFont: "ui-sans-serif, system-ui, sans-serif",
  },
  sections: [
    { id: "opening", module: "opening", label: "Opening" },
    { id: "tribute", module: "tribute", label: "Tribute" },
    { id: "welcome", module: "guest-welcome", label: "Welcome" },
    { id: "story", module: "story", label: "Service" },
    { id: "dress", module: "dress-code", label: "Attire" },
    { id: "venues", module: "venues", label: "Location" },
    { id: "rsvp", module: "rsvp", featureKey: "RSVP", label: "Attendance" },
    { id: "actions", module: "actions", label: "Actions" },
  ],
  motionIntensity: 0.25,
  audioDefaultEnabled: false,
};

export const EXPERIENCE3_REFERENCE_DEFINITIONS = [
  IX3_EDITORIAL_WEDDING,
  IX3_BRAND_LAUNCH,
  IX3_MEMORIAL,
] as const;
