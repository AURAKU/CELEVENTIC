import type { SocialEventKind } from "@/lib/social/social-category";
import { isMemorialSocialKind } from "@/lib/social/social-category";

export const SOCIAL_PLACE_CARD_KICKER = "YOU'RE INVITED";
export const SOCIAL_PLACE_CARD_PRIVATE_KICKER = "PRIVATE INVITATION";
export const SOCIAL_PLACE_CARD_PHRASE = "A celebration awaits.";
export const SOCIAL_PLACE_CARD_PERSONAL_PHRASE = "You are personally invited.";

type KindCopy = {
  fallbackTitle: string;
  phrase: string;
  personalPhrase: string;
  shareText: (title: string) => string;
  personalShareText: (title: string, guest: string) => string;
  description: (title: string, host: string | null) => string;
  personalDescription: (title: string, host: string | null, guest: string) => string;
  unavailablePhrase: string;
};

const KIND_COPY: Record<SocialEventKind, KindCopy> = {
  wedding: {
    fallbackTitle: "Wedding Celebration",
    phrase: "A celebration awaits.",
    personalPhrase: "You are personally invited.",
    shareText: (title) => `You're invited to ${title}.`,
    personalShareText: (title, guest) => `Dear ${guest}, you're invited to ${title}.`,
    description: (title) => `You're invited to ${title}.`,
    personalDescription: (_title, _host, guest) =>
      `Dear ${guest}, you are personally invited.`,
    unavailablePhrase: "The celebration link is closed.",
  },
  engagement: {
    fallbackTitle: "Engagement Celebration",
    phrase: "A moment to remember.",
    personalPhrase: "A moment to remember.",
    shareText: (title) => `You're invited to ${title}.`,
    personalShareText: (title, guest) => `Dear ${guest}, you're invited to ${title}.`,
    description: (title) => `You're invited to ${title}.`,
    personalDescription: (title, _host, guest) => `Dear ${guest}, you're invited to ${title}.`,
    unavailablePhrase: "The celebration link is closed.",
  },
  birthday: {
    fallbackTitle: "Birthday Celebration",
    phrase: "A birthday celebration awaits.",
    personalPhrase: "A birthday celebration awaits.",
    shareText: (title) => `You're invited to ${title}.`,
    personalShareText: (title, guest) => `Dear ${guest}, you're invited to ${title}.`,
    description: (title) => `You're invited to ${title}.`,
    personalDescription: (title, _host, guest) => `Dear ${guest}, you're invited to ${title}.`,
    unavailablePhrase: "The celebration link is closed.",
  },
  funeral: {
    fallbackTitle: "Celebration of Life",
    phrase: "Please join us as we honour and remember a cherished life.",
    personalPhrase: "please join us as we honour this cherished life",
    shareText: (title) => `You're invited to honour ${title}.`,
    personalShareText: (title, guest) => `Dear ${guest}, you're invited to honour ${title}.`,
    description: (title) => `Please join us as we honour and remember ${title}.`,
    personalDescription: (title, _host, guest) =>
      `Dear ${guest}, please join us as we honour and remember ${title}.`,
    unavailablePhrase: "This invitation is no longer available.",
  },
  church: {
    fallbackTitle: "Special Service",
    phrase: "You're warmly invited to join us.",
    personalPhrase: "you're warmly invited to join us",
    shareText: (title) => `You're invited to ${title}.`,
    personalShareText: (title, guest) => `Dear ${guest}, you're invited to ${title}.`,
    description: (title) => `You're warmly invited to ${title}.`,
    personalDescription: (title, _host, guest) => `Dear ${guest}, you're warmly invited to ${title}.`,
    unavailablePhrase: "This invitation is no longer available.",
  },
  corporate: {
    fallbackTitle: "Corporate Event",
    phrase: "You're invited to join us for this special event.",
    personalPhrase: "you're invited to join us for this special event",
    shareText: (title) => `You're invited to ${title}.`,
    personalShareText: (title, guest) => `Dear ${guest}, you're invited to ${title}.`,
    description: (title) => `You're invited to ${title}.`,
    personalDescription: (title, _host, guest) => `Dear ${guest}, you're invited to ${title}.`,
    unavailablePhrase: "This invitation is no longer available.",
  },
  conference: {
    fallbackTitle: "Conference",
    phrase: "You're invited to connect, learn and experience the event.",
    personalPhrase: "you're invited to connect, learn and experience the event",
    shareText: (title) => `You're invited to ${title}.`,
    personalShareText: (title, guest) => `Dear ${guest}, you're invited to ${title}.`,
    description: (title) => `You're invited to ${title}.`,
    personalDescription: (title, _host, guest) => `Dear ${guest}, you're invited to ${title}.`,
    unavailablePhrase: "This invitation is no longer available.",
  },
  concert: {
    fallbackTitle: "Live Event",
    phrase: "You're invited to experience it live.",
    personalPhrase: "you're invited to experience it live",
    shareText: (title) => `You're invited to ${title}.`,
    personalShareText: (title, guest) => `Dear ${guest}, you're invited to ${title}.`,
    description: (title) => `You're invited to ${title}.`,
    personalDescription: (title, _host, guest) => `Dear ${guest}, you're invited to ${title}.`,
    unavailablePhrase: "This invitation is no longer available.",
  },
  lunch: {
    fallbackTitle: "Special Gathering",
    phrase: "You're invited to this special gathering.",
    personalPhrase: "you're invited to this special gathering",
    shareText: (title) => `You're invited to ${title}.`,
    personalShareText: (title, guest) => `Dear ${guest}, you're invited to ${title}.`,
    description: (title) => `You're invited to ${title}.`,
    personalDescription: (title, _host, guest) => `Dear ${guest}, you're invited to ${title}.`,
    unavailablePhrase: "This invitation is no longer available.",
  },
  private: {
    fallbackTitle: "Private Celebration",
    phrase: "You're invited to this special gathering.",
    personalPhrase: "you're invited to this special gathering",
    shareText: (title) => `You're invited to ${title}.`,
    personalShareText: (title, guest) => `Dear ${guest}, you're invited to ${title}.`,
    description: (title) => `You're invited to ${title}.`,
    personalDescription: (title, _host, guest) => `Dear ${guest}, you're invited to ${title}.`,
    unavailablePhrase: "This invitation is no longer available.",
  },
};

export function socialCopyForKind(kind: SocialEventKind): KindCopy {
  return KIND_COPY[kind];
}

export function socialFallbackTitle(kind: SocialEventKind): string {
  return KIND_COPY[kind].fallbackTitle;
}

export function socialCardPhrase(kind: SocialEventKind, personalized: boolean): string {
  const copy = KIND_COPY[kind];
  return personalized ? copy.personalPhrase : copy.phrase;
}

export function socialShareTitle(title: string, kind: SocialEventKind): string {
  if (isMemorialSocialKind(kind)) return `${title} · You're invited`;
  return `${title} · You're invited`;
}

export function socialNativeShareText(input: {
  kind: SocialEventKind;
  title: string;
  guestDisplayName?: string | null;
}): string {
  const copy = KIND_COPY[input.kind];
  const guest = input.guestDisplayName?.trim();
  if (guest) return copy.personalShareText(input.title, guest);
  return copy.shareText(input.title);
}
