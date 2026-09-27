import type { SocialEventKind } from "@/lib/social/social-category";
import { isMemorialSocialKind } from "@/lib/social/social-category";

export const SOCIAL_PLACE_CARD_KICKER = "YOU'RE INVITED";
export const SOCIAL_PLACE_CARD_PRIVATE_KICKER = "PRIVATE INVITATION";

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
    phrase: "Join us for this special celebration.",
    personalPhrase: "invite you to celebrate with them",
    shareText: (title) => `You're invited to ${title}.`,
    personalShareText: (title, guest) => `Dear ${guest}, you're invited to ${title}.`,
    description: (title, host) =>
      host
        ? `${host} ${host.includes("&") ? "invite" : "invites"} you to celebrate with them — tap to open your invitation.`
        : `You're invited to ${title}. Tap to open your invitation.`,
    personalDescription: (title, host, guest) =>
      host
        ? `Dear ${guest}, ${host} ${host.includes("&") ? "invite" : "invites"} you to celebrate with them — tap to open your invitation.`
        : `Dear ${guest}, you're invited to ${title}. Tap to open your invitation.`,
    unavailablePhrase: "The celebration link is closed.",
  },
  engagement: {
    fallbackTitle: "Engagement Celebration",
    phrase: "You're invited to celebrate this special moment.",
    personalPhrase: "invite you to celebrate this special moment",
    shareText: (title) => `You're invited to ${title}.`,
    personalShareText: (title, guest) => `Dear ${guest}, you're invited to ${title}.`,
    description: (title, host) =>
      host
        ? `${host} ${host.includes("&") ? "invite" : "invites"} you to celebrate this special moment — tap to open your invitation.`
        : `You're invited to ${title}. Tap to open your invitation.`,
    personalDescription: (title, host, guest) =>
      host
        ? `Dear ${guest}, ${host} ${host.includes("&") ? "invite" : "invites"} you to celebrate this special moment — tap to open your invitation.`
        : `Dear ${guest}, you're invited to ${title}. Tap to open your invitation.`,
    unavailablePhrase: "The celebration link is closed.",
  },
  birthday: {
    fallbackTitle: "Birthday Celebration",
    phrase: "Come celebrate a very special birthday.",
    personalPhrase: "come celebrate this very special birthday",
    shareText: (title) => `You're invited to ${title}.`,
    personalShareText: (title, guest) => `Dear ${guest}, you're invited to ${title}.`,
    description: (title) => `You're invited to ${title}. Tap to open your invitation.`,
    personalDescription: (title, _host, guest) =>
      `Dear ${guest}, you're invited to ${title}. Tap to open your invitation.`,
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
    description: (title) => `You're warmly invited to ${title}. Tap to open your invitation.`,
    personalDescription: (title, _host, guest) =>
      `Dear ${guest}, you're warmly invited to ${title}. Tap to open your invitation.`,
    unavailablePhrase: "This invitation is no longer available.",
  },
  corporate: {
    fallbackTitle: "Corporate Event",
    phrase: "You're invited to join us for this special event.",
    personalPhrase: "you're invited to join us for this special event",
    shareText: (title) => `You're invited to ${title}.`,
    personalShareText: (title, guest) => `Dear ${guest}, you're invited to ${title}.`,
    description: (title) => `You're invited to ${title}. Tap to open your invitation.`,
    personalDescription: (title, _host, guest) =>
      `Dear ${guest}, you're invited to ${title}. Tap to open your invitation.`,
    unavailablePhrase: "This invitation is no longer available.",
  },
  conference: {
    fallbackTitle: "Conference",
    phrase: "You're invited to connect, learn and experience the event.",
    personalPhrase: "you're invited to connect, learn and experience the event",
    shareText: (title) => `You're invited to ${title}.`,
    personalShareText: (title, guest) => `Dear ${guest}, you're invited to ${title}.`,
    description: (title) => `You're invited to ${title}. Tap to open your invitation.`,
    personalDescription: (title, _host, guest) =>
      `Dear ${guest}, you're invited to ${title}. Tap to open your invitation.`,
    unavailablePhrase: "This invitation is no longer available.",
  },
  concert: {
    fallbackTitle: "Live Event",
    phrase: "You're invited to experience it live.",
    personalPhrase: "you're invited to experience it live",
    shareText: (title) => `You're invited to ${title}.`,
    personalShareText: (title, guest) => `Dear ${guest}, you're invited to ${title}.`,
    description: (title) => `You're invited to ${title}. Tap to open your invitation.`,
    personalDescription: (title, _host, guest) =>
      `Dear ${guest}, you're invited to ${title}. Tap to open your invitation.`,
    unavailablePhrase: "This invitation is no longer available.",
  },
  lunch: {
    fallbackTitle: "Special Gathering",
    phrase: "You're invited to this special gathering.",
    personalPhrase: "you're invited to this special gathering",
    shareText: (title) => `You're invited to ${title}.`,
    personalShareText: (title, guest) => `Dear ${guest}, you're invited to ${title}.`,
    description: (title) => `You're invited to ${title}. Tap to open your invitation.`,
    personalDescription: (title, _host, guest) =>
      `Dear ${guest}, you're invited to ${title}. Tap to open your invitation.`,
    unavailablePhrase: "This invitation is no longer available.",
  },
  private: {
    fallbackTitle: "Private Celebration",
    phrase: "You're invited to this special gathering.",
    personalPhrase: "you're invited to this special gathering",
    shareText: (title) => `You're invited to ${title}.`,
    personalShareText: (title, guest) => `Dear ${guest}, you're invited to ${title}.`,
    description: (title) => `You're invited to ${title}. Tap to open your invitation.`,
    personalDescription: (title, _host, guest) =>
      `Dear ${guest}, you're invited to ${title}. Tap to open your invitation.`,
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
