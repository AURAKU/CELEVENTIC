import type { AccountType } from "@prisma/client";
import type { ComponentType } from "react";
import {
  Briefcase,
  Building2,
  CalendarHeart,
  MailOpen,
  Store,
} from "lucide-react";
import { CeleYouMarkIcon } from "@/components/digital-business-card/celeyou-brand-mark";

export type OnboardingIntentId = AccountType;

export type OnboardingIntentOption = {
  id: OnboardingIntentId;
  /** Short URL key: ?intent=host */
  queryKey: string;
  title: string;
  description: string;
  example: string;
  next: string;
  icon: ComponentType<{ className?: string }>;
  joinIntent: boolean;
  requiresConfirmFields: boolean;
  confirmHint: string;
  primaryCta: string;
  primaryHref: string;
};

export const SIGNUP_INTENT_STORAGE_KEY = "celeventic:signup-intent";

/** Shared signup + Google-intent choices. Keep both pages in sync. */
export const ONBOARDING_INTENT_OPTIONS: OnboardingIntentOption[] = [
  {
    id: "EVENT_OWNER",
    queryKey: "host",
    title: "I'm planning an event",
    description: "Wedding, funeral, birthday, conference. This is your celebration.",
    example: "You'll create the event, design the invitation, and invite guests.",
    next: "After signup we'll take you to create your first event.",
    icon: CalendarHeart,
    joinIntent: false,
    requiresConfirmFields: false,
    confirmHint: "We'll take you to create your first event right after signup.",
    primaryCta: "Create my first event",
    primaryHref: "/dashboard/events/create",
  },
  {
    id: "EVENT_OWNER",
    queryKey: "guest",
    title: "I was invited",
    description: "You're a guest, or someone asked you to help on their event.",
    example: "Find the invitation you were sent, RSVP, or accept a team invite.",
    next: "After signup you can paste an invite link or open workspace invites.",
    icon: MailOpen,
    joinIntent: true,
    requiresConfirmFields: false,
    confirmHint: "After signup, open the invitation you were sent or join the event team.",
    primaryCta: "Find my invitation",
    primaryHref: "/dashboard/invitations/workspace?intent=join",
  },
  {
    id: "ORGANIZER",
    queryKey: "organizer",
    title: "I plan events for clients",
    description: "You're a professional planner running celebrations for others.",
    example: "Create client events, share progress, and keep every guest list in one place.",
    next: "After signup you can start a client event or finish your public profile.",
    icon: Briefcase,
    joinIntent: false,
    requiresConfirmFields: false,
    confirmHint: "A public username is optional. Clients can find you later.",
    primaryCta: "Start a client event",
    primaryHref: "/dashboard/events/create",
  },
  {
    id: "EVENT_OWNER",
    queryKey: "smartcard",
    title: "I need a CeleYou",
    description: "QR, NFC, and Wallet identity you share when you meet people.",
    example: "Design your CeleYou, pay a plan, and stay live while the subscription is active.",
    next: "After signup we'll help you publish your first CeleYou.",
    icon: CeleYouMarkIcon,
    joinIntent: false,
    requiresConfirmFields: false,
    confirmHint: "We'll take you to create your first card right after signup.",
    primaryCta: "Create my CeleYou",
    primaryHref: "/dashboard/business-card/start",
  },
  {
    id: "VENDOR",
    queryKey: "vendor",
    title: "I offer event services",
    description: "Photography, catering, décor, venues, DJs, and more.",
    example: "Set up your business so hosts can find and book you.",
    next: "After signup we'll walk you through your vendor profile.",
    icon: Store,
    joinIntent: false,
    requiresConfirmFields: true,
    confirmHint: "Pick your primary service. Full vendor setup continues next.",
    primaryCta: "Set up my vendor profile",
    primaryHref: "/vendor/onboarding",
  },
  {
    id: "ORGANIZATION",
    queryKey: "organization",
    title: "I run events for a group",
    description: "Church, company, school, hotel, or community organisation.",
    example: "One shared workspace for every group event and team member.",
    next: "Add the organisation name, then create your first group event.",
    icon: Building2,
    joinIntent: false,
    requiresConfirmFields: true,
    confirmHint: "Add your organisation name to create a shared workspace.",
    primaryCta: "Create our first event",
    primaryHref: "/dashboard/events/create",
  },
];

export const VENDOR_SERVICE_CATEGORIES = [
  "Photographers",
  "Videographers",
  "Caterers",
  "Venues",
  "Decor & Florals",
  "DJs & Entertainment",
  "Makeup & Beauty",
  "Planners",
  "Other",
] as const;

export function findOnboardingIntent(
  accountType: AccountType | null | undefined,
  joinIntent: boolean
): OnboardingIntentOption | undefined {
  if (!accountType) return undefined;
  return ONBOARDING_INTENT_OPTIONS.find(
    (t) => t.id === accountType && t.joinIntent === joinIntent
  );
}

export function intentFromQuery(raw?: string | null): OnboardingIntentOption | undefined {
  if (!raw) return undefined;
  const key = raw.trim().toLowerCase();
  const aliases: Record<string, string> = {
    host: "host",
    plan: "host",
    event: "host",
    owner: "host",
    guest: "guest",
    invited: "guest",
    join: "guest",
    organizer: "organizer",
    planner: "organizer",
    vendor: "vendor",
    smartcard: "smartcard",
    celecard: "smartcard",
    card: "smartcard",
    identity: "smartcard",
    "digital-card": "smartcard",
    digitalcard: "smartcard",
    organisation: "organization",
    organization: "organization",
    church: "organization",
    company: "organization",
  };
  const queryKey = aliases[key] ?? key;
  return ONBOARDING_INTENT_OPTIONS.find((t) => t.queryKey === queryKey);
}

export type StoredSignupIntent = {
  id: AccountType;
  joinIntent: boolean;
  organizationName?: string;
  vendorCategory?: string;
  queryKey?: string;
  productIntent?: string;
};

export function persistSignupIntent(intent: StoredSignupIntent) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SIGNUP_INTENT_STORAGE_KEY, JSON.stringify(intent));
  } catch {
    /* ignore */
  }
}

export function readSignupIntent(): StoredSignupIntent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SIGNUP_INTENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSignupIntent;
    if (!parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSignupIntent() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SIGNUP_INTENT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
