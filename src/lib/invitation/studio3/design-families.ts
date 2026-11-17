/**
 * Invitation Experience 3.0 — design family catalog (configuration only).
 *
 * No visual components are registered here. Families guide future v2 / new-slug
 * reference experiences after eligibility is proven.
 */

export type Experience3DesignFamilyId =
  | "editorial-wedding"
  | "heritage-ceremony"
  | "brand-launch"
  | "memorial"
  | "celebration"
  | "academic"
  | "shower"
  | "conference"
  | "custom";

export type Experience3OpeningStyle =
  | "classic-reveal"
  | "envelope"
  | "cinematic"
  | "monogram"
  | "portrait"
  | "minimal-instant";

export type Experience3DesignFamily = {
  id: Experience3DesignFamilyId;
  label: string;
  categories: string[];
  openingDefaults: Experience3OpeningStyle[];
  motionTone: "editorial" | "ceremonial" | "launch" | "solemn" | "festive" | "professional";
  /** First reference experiences to build once eligibility allows. */
  isPriorityReference: boolean;
  notes: string;
};

export const EXPERIENCE3_DESIGN_FAMILIES: readonly Experience3DesignFamily[] = [
  {
    id: "editorial-wedding",
    label: "Luxury Wedding — Editorial",
    categories: ["Wedding", "Engagement"],
    openingDefaults: ["cinematic", "monogram", "envelope", "classic-reveal"],
    motionTone: "editorial",
    isPriorityReference: true,
    notes:
      "Reference #1. Study Forever Afaris / Aurelia / Seraphine; ship as new version or new slug only.",
  },
  {
    id: "brand-launch",
    label: "Premium Brand Launch",
    categories: ["Corporate", "Lunch", "Private Event", "Conference"],
    openingDefaults: ["cinematic", "classic-reveal", "minimal-instant"],
    motionTone: "launch",
    isPriorityReference: true,
    notes:
      "Reference #2. Study Femmora flagship patterns; do not modify luxury-fashion-flagship v1.",
  },
  {
    id: "memorial",
    label: "Contemporary Memorial",
    categories: ["Funeral"],
    openingDefaults: ["portrait", "minimal-instant", "classic-reveal"],
    motionTone: "solemn",
    isPriorityReference: true,
    notes:
      "Reference #3. Calm motion only; no playful reveals or intrusive audio. Study memorial family as reference.",
  },
  {
    id: "heritage-ceremony",
    label: "Traditional Marriage — Contemporary Heritage",
    categories: ["Wedding"],
    openingDefaults: ["envelope", "classic-reveal", "cinematic"],
    motionTone: "ceremonial",
    isPriorityReference: false,
    notes: "Study traditional-marriage-ceremony; never edit its v1 stack in place.",
  },
  {
    id: "celebration",
    label: "Birthdays & Milestone Celebrations",
    categories: ["Birthday", "Concert", "Private Event"],
    openingDefaults: ["classic-reveal", "cinematic", "minimal-instant"],
    motionTone: "festive",
    isPriorityReference: false,
    notes: "neon-celebration-party is UNKNOWN until production proof; upgrades = v2 only.",
  },
  {
    id: "conference",
    label: "Conferences & Business Events",
    categories: ["Conference", "Corporate"],
    openingDefaults: ["minimal-instant", "classic-reveal"],
    motionTone: "professional",
    isPriorityReference: false,
    notes: "Agenda / speakers modules when entitlements exist.",
  },
  {
    id: "academic",
    label: "Graduations & Academic Celebrations",
    categories: ["Private Event"],
    openingDefaults: ["portrait", "classic-reveal", "minimal-instant"],
    motionTone: "festive",
    isPriorityReference: false,
    notes: "No first-class catalogue category yet — new SKUs allowed.",
  },
  {
    id: "shower",
    label: "Baby Showers & Naming Ceremonies",
    categories: ["Private Event"],
    openingDefaults: ["classic-reveal", "minimal-instant"],
    motionTone: "festive",
    isPriorityReference: false,
    notes: "Gentle motion; gift info only when configured.",
  },
  {
    id: "custom",
    label: "Custom / Organizer Canvas",
    categories: ["Private Event", "Custom"],
    openingDefaults: ["minimal-instant", "classic-reveal"],
    motionTone: "editorial",
    isPriorityReference: false,
    notes: "custom-media remains organizer-driven; Experience 3.0 wraps modules only.",
  },
] as const;

export function listPriorityReferenceFamilies(): Experience3DesignFamily[] {
  return EXPERIENCE3_DESIGN_FAMILIES.filter((family) => family.isPriorityReference);
}

export function getDesignFamily(id: Experience3DesignFamilyId): Experience3DesignFamily | undefined {
  return EXPERIENCE3_DESIGN_FAMILIES.find((family) => family.id === id);
}
