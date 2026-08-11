export type GuideRole = "GUEST" | "ORGANIZER" | "VENDOR" | "SCANNER" | "ADMIN";
export type GuideStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
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
  | "PLATFORM";

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
  synonyms?: string[];
  contextRoutes?: string[];
  relatedSlugs?: string[];
  ogTitle?: string;
  ogDescription?: string;
  posterUrl?: string | null;
  videoUrl?: string | null;
  captionsEnUrl?: string | null;
  steps: GuideStepSeed[];
}

/** Role-aware Start Here paths shown on Celeventic Guide / FAQ hub. */
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
};

export const PUBLIC_GUIDE_ROLES: GuideRole[] = ["GUEST", "ORGANIZER", "VENDOR", "SCANNER"];
