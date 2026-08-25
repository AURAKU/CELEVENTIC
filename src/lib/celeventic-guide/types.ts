export type GuideRole = "GUEST" | "ORGANIZER" | "VENDOR" | "SCANNER" | "ADMIN";
export type GuideStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type GuideReviewStatus = "CURRENT" | "REVIEW_REQUIRED" | "OUTDATED";
export type GuideCategory =
  | "GETTING_STARTED"
  | "INVITATIONS"
  | "RSVP"
  | "GUESTS"
  | "SEATING"
  | "EVENT_GUIDE"
  | "ADMISSION"
  | "MEMORY"
  | "VENDOR"
  | "SCANNING"
  | "CELEBRATE"
  | "PLATFORM"
  | "TICKETS"
  | "PAYMENTS"
  | "GIFTS"
  | "MARKETPLACE"
  | "WALLET"
  | "CONTRIBUTIONS"
  | "COMMUNICATIONS"
  | "PRIVACY"
  | "COLLABORATION"
  | "TROUBLESHOOTING";

export type GuideStepType = "motion" | "tip" | "warning" | "checklist";

export interface GuideStepSeed {
  title: string;
  body: string;
  stepType?: GuideStepType;
  motionKey?: string;
  durationMs?: number;
}

export interface GuideCatalogEntry {
  slug: string;
  title: string;
  summary: string;
  body?: string;
  role: GuideRole;
  category: GuideCategory;
  status?: GuideStatus;
  sortOrder: number;
  featured?: boolean;
  adminOnly?: boolean;
  storyboardKey?: string;
  transcript?: string;
  narrationScript?: string;
  a11yDescription?: string;
  synonyms?: string[];
  contextRoutes?: string[];
  relatedSlugs?: string[];
  ogTitle?: string;
  ogDescription?: string;
  posterUrl?: string | null;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  mp4Url?: string | null;
  webmUrl?: string | null;
  mobileVideoUrl?: string | null;
  desktopVideoUrl?: string | null;
  captionsEnUrl?: string | null;
  captionsFrUrl?: string | null;
  voiceoverEnUrl?: string | null;
  voiceoverFrUrl?: string | null;
  durationSec?: number | null;
  featureKey?: string;
  videoProductionRequired?: boolean;
  reviewStatus?: GuideReviewStatus;
  analyticsEvents?: string[];
  isNew?: boolean;
  newUntil?: string | null;
  steps: GuideStepSeed[];
}

/** Role-aware Start Here paths shown on Celeventic Guide home. */
export interface StartHereJourney {
  id: string;
  role: GuideRole;
  title: string;
  summary: string;
  slugs: string[];
}

export interface GuideSearchHit {
  slug: string;
  title: string;
  summary: string;
  role: GuideRole;
  category: GuideCategory;
  score: number;
  featured: boolean;
}

export interface PublicGuideCard {
  slug: string;
  title: string;
  summary: string;
  role: GuideRole;
  category: GuideCategory;
  featured: boolean;
  posterUrl: string | null;
  hasVideo: boolean;
  videoProductionRequired?: boolean;
  isNew?: boolean;
  stepCount: number;
}

export const GUIDE_ROLE_LABELS: Record<GuideRole, string> = {
  GUEST: "Guest",
  ORGANIZER: "Organizer",
  VENDOR: "Vendor",
  SCANNER: "Scanner",
  ADMIN: "Admin",
};

export const GUIDE_CATEGORY_LABELS: Record<GuideCategory, string> = {
  GETTING_STARTED: "Getting started",
  INVITATIONS: "Invitations",
  RSVP: "RSVP",
  GUESTS: "Guests",
  SEATING: "Seating",
  EVENT_GUIDE: "Event Guide",
  ADMISSION: "Admission",
  MEMORY: "Memory",
  VENDOR: "Vendor",
  SCANNING: "Scanning",
  CELEBRATE: "Celebrate",
  PLATFORM: "Platform",
  TICKETS: "Tickets",
  PAYMENTS: "Payments",
  GIFTS: "Gifts",
  MARKETPLACE: "Marketplace",
  WALLET: "Wallet",
  CONTRIBUTIONS: "Contributions",
  COMMUNICATIONS: "Communications",
  PRIVACY: "Privacy",
  COLLABORATION: "Collaboration",
  TROUBLESHOOTING: "Troubleshooting",
};

export const PUBLIC_GUIDE_ROLES: GuideRole[] = ["GUEST", "ORGANIZER", "VENDOR", "SCANNER"];

/** Priority titles requiring real screen-recorded MP4 delivery (§53). Never invent files. */
export const PRIORITY_VIDEO_SLUGS = [
  "how-celeventic-works",
  "open-your-invitation",
  "rsvp",
  "your-qr-admission-pass",
  "find-your-seat",
  "event-guide-guest",
  "memory-vault-guest",
  "organizer-quick-start",
] as const;
