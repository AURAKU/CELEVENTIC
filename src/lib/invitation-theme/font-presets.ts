import type { FontId } from "./theme-types";

/**
 * Curated font-pairing presets selectable from Studio Look → Typography.
 *
 * Each preset assigns a role-based FontId trio (+ eyebrow) so a single click
 * can restyle a template's headings, script display, body copy, and the
 * small tracked "eyebrow" label (e.g. Traditional Marriage's "WITH GRATITUDE").
 *
 * All FontIds must already be registered in `invitation-fonts.ts` +
 * `FONT_STACKS` — no arbitrary families / runtime font fetches.
 */
export interface InvitationFontPreset {
  id: string;
  label: string;
  description: string;
  /** Small tracked uppercase label font (e.g. "WITH GRATITUDE"). */
  eyebrowFont: FontId;
  /** Section/heading font. */
  headingFont: FontId;
  /** Large script/cursive display font (e.g. "Thank you"). */
  scriptFont: FontId;
  /** Readable body copy font. */
  bodyFont: FontId;
  /** First preset is the Traditional Marriage default — keeps existing designs unchanged. */
  isDefault?: boolean;
}

export const INVITATION_FONT_PRESETS: InvitationFontPreset[] = [
  {
    id: "with-gratitude",
    label: "With Gratitude",
    description:
      "The signature Traditional Marriage thank-you pairing — a tracked Cormorant eyebrow, sweeping Great Vibes script, and warm Cormorant body copy.",
    eyebrowFont: "cormorant",
    headingFont: "cinzel",
    scriptFont: "great-vibes",
    bodyFont: "cormorant",
    isDefault: true,
  },
  {
    id: "heirloom-serif",
    label: "Heirloom Serif",
    description:
      "Classic wedding polish: Playfair Display headings and eyebrow, a Great Vibes script, and Cormorant Garamond body copy.",
    eyebrowFont: "playfair",
    headingFont: "playfair",
    scriptFont: "great-vibes",
    bodyFont: "cormorant",
  },
  {
    id: "modern-muse",
    label: "Modern Muse",
    description:
      "Contemporary geometric-sans headings paired with a relaxed Alex Brush script for a modern-editorial invite.",
    eyebrowFont: "jost",
    headingFont: "jost",
    scriptFont: "alex-brush",
    bodyFont: "jost",
  },
  {
    id: "editorial-vow",
    label: "Editorial Vow",
    description:
      "Fashion-editorial serif: Marcellus headings and eyebrow, a delicate Parisienne script, and EB Garamond body text.",
    eyebrowFont: "marcellus",
    headingFont: "marcellus",
    scriptFont: "parisienne",
    bodyFont: "eb-garamond",
  },
];

export const DEFAULT_FONT_PRESET_ID = "with-gratitude";

export function getFontPreset(id?: string | null): InvitationFontPreset {
  return (
    INVITATION_FONT_PRESETS.find((preset) => preset.id === id) ??
    INVITATION_FONT_PRESETS[0]
  );
}
