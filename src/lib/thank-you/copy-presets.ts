/**
 * Event-type copy presets for Thank You Page content.
 */

export type ThankYouEventPresetKind =
  | "WEDDING"
  | "TRADITIONAL_MARRIAGE"
  | "BIRTHDAY"
  | "CORPORATE"
  | "FUNERAL"
  | "CUSTOM";

export interface ThankYouCopyPreset {
  id: ThankYouEventPresetKind;
  label: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  message: string;
  closing: string;
  signatureLine: string;
  guestComposerHeading: string;
  guestComposerIntro: string;
}

export const THANK_YOU_COPY_PRESETS: ThankYouCopyPreset[] = [
  {
    id: "WEDDING",
    label: "Wedding",
    eyebrow: "WITH HEARTFELT GRATITUDE",
    title: "Thank You for Celebrating With Us",
    message:
      "Our celebration was made even more meaningful by the love, laughter and warmth you shared with us. Thank you for being part of this beautiful chapter and for creating memories we will always treasure.",
    closing: "With love and gratitude,",
    signatureLine: "{Couple Names}",
    guestComposerHeading: "Leave a Note for the Hosts",
    guestComposerIntro:
      "Share a favourite memory, a warm wish or a few words the hosts can return to long after the celebration.",
  },
  {
    id: "TRADITIONAL_MARRIAGE",
    label: "Traditional Marriage",
    eyebrow: "WITH DEEP APPRECIATION",
    title: "Our Hearts Are Full",
    message:
      "To our families, friends and loved ones, thank you for surrounding us with love as we honoured our traditions and began this new chapter together. Your presence, blessings and support made the celebration truly unforgettable.",
    closing: "With appreciation from both families.",
    signatureLine: "{Family Names}",
    guestComposerHeading: "Leave a Blessing",
    guestComposerIntro:
      "Share a blessing, a favourite moment or a few words the families can treasure.",
  },
  {
    id: "BIRTHDAY",
    label: "Birthday",
    eyebrow: "WITH JOYFUL THANKS",
    title: "Thank You for Making It Special",
    message:
      "Thank you for the laughter, kind wishes and wonderful memories. Having you there made the celebration more joyful than we could have imagined.",
    closing: "With appreciation,",
    signatureLine: "{Host Name}",
    guestComposerHeading: "Leave a Birthday Note",
    guestComposerIntro: "Share a favourite moment or a warm wish from the celebration.",
  },
  {
    id: "CORPORATE",
    label: "Corporate Event",
    eyebrow: "WITH APPRECIATION",
    title: "Thank You for Joining Us",
    message:
      "We appreciate your presence, participation and contribution to this event. Thank you for helping make the experience engaging, meaningful and successful.",
    closing: "Kind regards,",
    signatureLine: "{Organisation}",
    guestComposerHeading: "Share Your Feedback",
    guestComposerIntro: "Leave a short note about a highlight from the event.",
  },
  {
    id: "FUNERAL",
    label: "Funeral / Memorial",
    eyebrow: "WITH SINCERE THANKS",
    title: "With Sincere Appreciation",
    message:
      "Our family is deeply grateful for the compassion, prayers and support shown during this time. Your presence and kindness have brought us comfort and strength.",
    closing: "With gratitude,",
    signatureLine: "{Family Name}",
    guestComposerHeading: "Leave a Message of Condolence",
    guestComposerIntro:
      "Share a memory, prayer or kind words the family may return to.",
  },
  {
    id: "CUSTOM",
    label: "Custom",
    eyebrow: "WITH GRATITUDE",
    title: "Thank You",
    message:
      "Thank you for being part of this occasion. Your presence and kindness meant so much to us.",
    closing: "With thanks,",
    signatureLine: "{Host Names}",
    guestComposerHeading: "Leave a Note for the Hosts",
    guestComposerIntro:
      "Share a favourite memory, a warm wish or a few words the hosts can return to later.",
  },
];

export function getThankYouCopyPreset(id?: string | null): ThankYouCopyPreset {
  return (
    THANK_YOU_COPY_PRESETS.find((preset) => preset.id === id) ??
    THANK_YOU_COPY_PRESETS.find((preset) => preset.id === "CUSTOM")!
  );
}

export function applyCopyPlaceholders(
  text: string,
  vars: { coupleNames?: string; hostNames?: string; familyNames?: string; organisation?: string }
): string {
  return text
    .replace(/\{Couple Names\}/gi, vars.coupleNames || vars.hostNames || "the hosts")
    .replace(/\{Host Names?\}/gi, vars.hostNames || "the hosts")
    .replace(/\{Family Names?\}/gi, vars.familyNames || vars.hostNames || "our family")
    .replace(/\{Organisation\}/gi, vars.organisation || vars.hostNames || "the team");
}
