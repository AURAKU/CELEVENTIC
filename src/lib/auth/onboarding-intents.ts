import type { AccountType } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Building2,
  CalendarHeart,
  Store,
  UserPlus,
} from "lucide-react";

export type OnboardingIntentId = AccountType;

export type OnboardingIntentOption = {
  id: OnboardingIntentId;
  title: string;
  description: string;
  icon: LucideIcon;
  joinIntent: boolean;
  /** Extra fields required on the confirm step before account creation. */
  requiresConfirmFields: boolean;
  confirmHint: string;
};

/** Shared signup + Google-intent choices — keep both pages in sync. */
export const ONBOARDING_INTENT_OPTIONS: OnboardingIntentOption[] = [
  {
    id: "EVENT_OWNER",
    title: "Plan My Own Event",
    description: "Wedding, birthday, funeral, conference — plan your celebration.",
    icon: CalendarHeart,
    joinIntent: false,
    requiresConfirmFields: false,
    confirmHint: "We'll take you to create your first event right after signup.",
  },
  {
    id: "ORGANIZER",
    title: "Plan Events for Clients",
    description: "Professional organizer managing events for others.",
    icon: Briefcase,
    joinIntent: false,
    requiresConfirmFields: false,
    confirmHint: "Optional username helps clients find you later.",
  },
  {
    id: "VENDOR",
    title: "Offer Event Services",
    description: "Photography, catering, venues, décor, and more.",
    icon: Store,
    joinIntent: false,
    requiresConfirmFields: true,
    confirmHint: "Pick your primary service — full vendor setup continues next.",
  },
  {
    id: "ORGANIZATION",
    title: "Manage Events for an Organization",
    description: "Company, church, school, or community group events.",
    icon: Building2,
    joinIntent: false,
    requiresConfirmFields: true,
    confirmHint: "Add your organization name to create a shared workspace.",
  },
  {
    id: "EVENT_OWNER",
    title: "Join an Existing Event",
    description: "You were invited to collaborate on an event.",
    icon: UserPlus,
    joinIntent: true,
    requiresConfirmFields: false,
    confirmHint: "After signup, open workspace invites to join your event team.",
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
