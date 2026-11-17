import type { Experience3DesignFamilyId, Experience3OpeningStyle } from "@/lib/invitation/studio3/design-families";
import type { Experience3NativeLayoutSlug } from "@/lib/invitation/studio3/native-layouts";
import type { GuestFeatureKey } from "@/lib/invitation-features/registry";

export type Experience3SectionModuleId =
  | "opening"
  | "hero"
  | "guest-welcome"
  | "story"
  | "schedule"
  | "venues"
  | "dress-code"
  | "rsvp"
  | "gallery"
  | "tribute"
  | "speakers"
  | "actions"
  | "thank-you";

export type Experience3SectionDef = {
  id: string;
  module: Experience3SectionModuleId;
  /** When set, section mounts only if the resolved guest feature is enabled. */
  featureKey?: GuestFeatureKey;
  label: string;
};

export type Experience3TokenSet = {
  background: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  border: string;
  headingFont: string;
  bodyFont: string;
  eyebrowFont: string;
};

export type Experience3Definition = {
  layout: Experience3NativeLayoutSlug;
  layoutVersion: number;
  designFamily: Experience3DesignFamilyId;
  label: string;
  opening: {
    style: Experience3OpeningStyle;
    skippable: true;
    respectReducedMotion: true;
  };
  tokens: Experience3TokenSet;
  sections: Experience3SectionDef[];
  /** Category-appropriate motion intensity: 0 quiet → 1 expressive */
  motionIntensity: 0 | 0.25 | 0.5 | 0.75 | 1;
  audioDefaultEnabled: boolean;
};
