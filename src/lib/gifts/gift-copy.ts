import type { EventGiftType, EventType } from "@prisma/client";

/**
 * Default copy for the Gift Experience.
 *
 * Weddings and celebrations are gifting moments, not fundraisers: the word
 * "donation" (and its cousins "donate", "contribute to our fund", "raised")
 * never appears on a celebratory template. Funeral support is the one context
 * where "support" language is appropriate, and even there we avoid "donation".
 * Every string below is a default — organisers can rewrite all of them.
 */

export interface GiftCopy {
  title: string;
  subtitle: string;
  description: string;
  ctaLabel: string;
  amountPrompt: string;
  messagePrompt: string;
  thankYouTitle: string;
  thankYouMessage: string;
  /** Reassurance shown under the amount field — never a total or a target. */
  privacyNote: string;
}

const WEDDING_COPY: GiftCopy = {
  title: "Send a Gift",
  subtitle: "Your presence is the greatest gift — but if you wish to bless us with more",
  description:
    "Thank you for celebrating with us. If you would like to send a cash gift, you can do so securely below. Your gift goes directly to the couple.",
  ctaLabel: "Send a Gift",
  amountPrompt: "How much would you like to gift?",
  messagePrompt: "Leave a note for the couple (optional)",
  thankYouTitle: "Thank You",
  thankYouMessage:
    "Your gift has been received with so much love. Thank you for being part of our forever.",
  privacyNote: "Your gift is private. Only the couple can see it.",
};

const GIFT_COPY_BY_TYPE: Record<EventGiftType, GiftCopy> = {
  WEDDING_GIFT: WEDDING_COPY,
  CASH_GIFT: {
    title: "Send a Cash Gift",
    subtitle: "A simple, secure way to bless the celebrants",
    description:
      "If you would like to send a cash gift, you can do so securely below. Your gift goes directly to the host.",
    ctaLabel: "Send a Cash Gift",
    amountPrompt: "How much would you like to gift?",
    messagePrompt: "Leave a note for the host (optional)",
    thankYouTitle: "Thank You",
    thankYouMessage: "Your gift has been received. Thank you for celebrating with us.",
    privacyNote: "Your gift is private. Only the host can see it.",
  },
  BRIDAL_SHOWER_GIFT: {
    title: "Send a Gift",
    subtitle: "Help us shower her with love",
    description:
      "If you would like to send a cash gift instead of a wrapped one, you can do so securely below.",
    ctaLabel: "Send a Gift",
    amountPrompt: "How much would you like to gift?",
    messagePrompt: "Leave a note for the bride (optional)",
    thankYouTitle: "Thank You",
    thankYouMessage: "Your gift has been received with gratitude. Thank you for the love.",
    privacyNote: "Your gift is private. Only the host can see it.",
  },
  BABY_GIFT: {
    title: "Bless the Baby",
    subtitle: "A little something for the newest arrival",
    description:
      "If you would like to send a cash gift for the baby, you can do so securely below.",
    ctaLabel: "Send a Gift",
    amountPrompt: "How much would you like to gift?",
    messagePrompt: "Leave a note for the family (optional)",
    thankYouTitle: "Thank You",
    thankYouMessage: "Your gift has been received. Thank you for welcoming our little one.",
    privacyNote: "Your gift is private. Only the family can see it.",
  },
  BIRTHDAY_GIFT: {
    title: "Send a Birthday Gift",
    subtitle: "Make the day even sweeter",
    description: "If you would like to send a cash gift, you can do so securely below.",
    ctaLabel: "Send a Gift",
    amountPrompt: "How much would you like to gift?",
    messagePrompt: "Leave a birthday note (optional)",
    thankYouTitle: "Thank You",
    thankYouMessage: "Your gift has been received. Thank you for making the day special.",
    privacyNote: "Your gift is private. Only the celebrant can see it.",
  },
  ANNIVERSARY_GIFT: {
    title: "Send a Gift",
    subtitle: "Celebrating another year of love",
    description: "If you would like to send a cash gift, you can do so securely below.",
    ctaLabel: "Send a Gift",
    amountPrompt: "How much would you like to gift?",
    messagePrompt: "Leave a note for the couple (optional)",
    thankYouTitle: "Thank You",
    thankYouMessage: "Your gift has been received with love. Thank you for celebrating with us.",
    privacyNote: "Your gift is private. Only the couple can see it.",
  },
  GRADUATION_GIFT: {
    title: "Send a Gift",
    subtitle: "Celebrate the achievement",
    description: "If you would like to send a cash gift, you can do so securely below.",
    ctaLabel: "Send a Gift",
    amountPrompt: "How much would you like to gift?",
    messagePrompt: "Leave a congratulations note (optional)",
    thankYouTitle: "Thank You",
    thankYouMessage: "Your gift has been received. Thank you for celebrating this milestone.",
    privacyNote: "Your gift is private. Only the graduate can see it.",
  },
  HOUSEWARMING_GIFT: {
    title: "Send a Housewarming Gift",
    subtitle: "Help make the new house a home",
    description: "If you would like to send a cash gift, you can do so securely below.",
    ctaLabel: "Send a Gift",
    amountPrompt: "How much would you like to gift?",
    messagePrompt: "Leave a note for the family (optional)",
    thankYouTitle: "Thank You",
    thankYouMessage: "Your gift has been received. Thank you for warming our new home.",
    privacyNote: "Your gift is private. Only the host can see it.",
  },
  NAMING_CEREMONY_GIFT: {
    title: "Bless the Child",
    subtitle: "A gift for the naming ceremony",
    description: "If you would like to send a cash gift, you can do so securely below.",
    ctaLabel: "Send a Gift",
    amountPrompt: "How much would you like to gift?",
    messagePrompt: "Leave a blessing for the child (optional)",
    thankYouTitle: "Thank You",
    thankYouMessage: "Your gift has been received. Thank you for blessing our child.",
    privacyNote: "Your gift is private. Only the family can see it.",
  },
  THANKSGIVING_GIFT: {
    title: "Send a Gift",
    subtitle: "Join us in giving thanks",
    description: "If you would like to send a cash gift, you can do so securely below.",
    ctaLabel: "Send a Gift",
    amountPrompt: "How much would you like to gift?",
    messagePrompt: "Leave a note (optional)",
    thankYouTitle: "Thank You",
    thankYouMessage: "Your gift has been received with gratitude.",
    privacyNote: "Your gift is private. Only the host can see it.",
  },
  FUNERAL_SUPPORT: {
    title: "Send Your Support",
    subtitle: "Stand with the family in this season",
    description:
      "If you would like to send financial support to the bereaved family, you can do so securely below.",
    ctaLabel: "Send Support",
    amountPrompt: "How much would you like to send?",
    messagePrompt: "Leave a message of condolence (optional)",
    thankYouTitle: "Thank You",
    thankYouMessage:
      "Your support has been received. The family is deeply grateful for your kindness.",
    privacyNote: "Your support is private. Only the family can see it.",
  },
  GENERAL_GIFT: {
    title: "Send a Gift",
    subtitle: "A secure way to bless the host",
    description: "If you would like to send a cash gift, you can do so securely below.",
    ctaLabel: "Send a Gift",
    amountPrompt: "How much would you like to gift?",
    messagePrompt: "Leave a note (optional)",
    thankYouTitle: "Thank You",
    thankYouMessage: "Your gift has been received. Thank you.",
    privacyNote: "Your gift is private. Only the host can see it.",
  },
};

/** Words we refuse to ship as defaults on celebratory templates. */
const FUNDRAISING_WORDS = ["donation", "donate", "donor", "fundraiser", "fundraising", "raised"];

export function containsFundraisingLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return FUNDRAISING_WORDS.some((word) => new RegExp(`\\b${word}`, "i").test(lower));
}

export function defaultGiftTypeForEvent(eventType: EventType): EventGiftType {
  switch (eventType) {
    case "WEDDING":
      return "WEDDING_GIFT";
    case "FUNERAL":
      return "FUNERAL_SUPPORT";
    case "BIRTHDAY":
      return "BIRTHDAY_GIFT";
    case "CHURCH_PROGRAM":
      return "THANKSGIVING_GIFT";
    default:
      return "CASH_GIFT";
  }
}

export function getGiftCopy(giftType: EventGiftType): GiftCopy {
  return GIFT_COPY_BY_TYPE[giftType] ?? GIFT_COPY_BY_TYPE.GENERAL_GIFT;
}

export interface GiftCopyOverrides {
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  ctaLabel?: string | null;
  thankYouTitle?: string | null;
  thankYouMessage?: string | null;
}

/** Merge organiser edits over the defaults, ignoring blank strings. */
export function resolveGiftCopy(giftType: EventGiftType, overrides?: GiftCopyOverrides): GiftCopy {
  const base = getGiftCopy(giftType);
  if (!overrides) return base;
  const pick = (value: string | null | undefined, fallback: string) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : fallback;
  };
  return {
    ...base,
    title: pick(overrides.title, base.title),
    subtitle: pick(overrides.subtitle, base.subtitle),
    description: pick(overrides.description, base.description),
    ctaLabel: pick(overrides.ctaLabel, base.ctaLabel),
    thankYouTitle: pick(overrides.thankYouTitle, base.thankYouTitle),
    thankYouMessage: pick(overrides.thankYouMessage, base.thankYouMessage),
  };
}

export const GIFT_TYPE_LABELS: Record<EventGiftType, string> = {
  WEDDING_GIFT: "Wedding gift",
  CASH_GIFT: "Cash gift",
  BRIDAL_SHOWER_GIFT: "Bridal shower gift",
  BABY_GIFT: "Baby gift",
  BIRTHDAY_GIFT: "Birthday gift",
  ANNIVERSARY_GIFT: "Anniversary gift",
  GRADUATION_GIFT: "Graduation gift",
  HOUSEWARMING_GIFT: "Housewarming gift",
  NAMING_CEREMONY_GIFT: "Naming ceremony gift",
  THANKSGIVING_GIFT: "Thanksgiving gift",
  FUNERAL_SUPPORT: "Funeral support",
  GENERAL_GIFT: "Gift",
};

/** Default suggested amounts in minor units (GHS pesewas). */
export const DEFAULT_SUGGESTED_AMOUNTS_MINOR = [5000, 10000, 20000, 50000];
export const DEFAULT_MIN_AMOUNT_MINOR = 500;
