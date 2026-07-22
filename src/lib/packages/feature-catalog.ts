import { ALL_FEATURE_KEYS, FeatureKey } from "@/lib/blueprints/feature-keys";

export type PackageFeatureGroup =
  | "Core"
  | "Guests & access"
  | "Creative"
  | "Commerce"
  | "Memorial"
  | "Conference"
  | "Entertainment"
  | "Ops";

export type PackageFeatureDef = {
  key: FeatureKey;
  label: string;
  description?: string;
  group: PackageFeatureGroup;
};

/** Admin + pricing labels for platform modules tied to event packages. */
export const PACKAGE_FEATURE_CATALOG: PackageFeatureDef[] = [
  { key: FeatureKey.OVERVIEW, label: "Overview", group: "Core", description: "Event home dashboard" },
  { key: FeatureKey.SETTINGS, label: "Settings", group: "Core" },
  { key: FeatureKey.COLLABORATORS, label: "Collaborators", group: "Core" },
  { key: FeatureKey.INVITATIONS, label: "Invitations", group: "Core" },
  { key: FeatureKey.DESIGN_STUDIO, label: "Design Studio", group: "Creative" },
  { key: FeatureKey.GUEST_LIST, label: "Guest List", group: "Guests & access" },
  { key: FeatureKey.RSVP, label: "RSVP", group: "Guests & access" },
  { key: FeatureKey.QR_ADMISSION, label: "QR Admission", group: "Guests & access" },
  { key: FeatureKey.SEATING, label: "Seating", group: "Guests & access" },
  { key: FeatureKey.COMMUNICATIONS, label: "Communications", group: "Guests & access" },
  { key: FeatureKey.GALLERY, label: "Gallery", group: "Creative" },
  { key: FeatureKey.MEMORY_VAULT, label: "Memory Vault", group: "Creative" },
  { key: FeatureKey.THANK_YOU, label: "Thank You Page", group: "Creative" },
  { key: FeatureKey.TIMELINE, label: "Timeline", group: "Ops" },
  { key: FeatureKey.VENDORS, label: "Vendors", group: "Ops" },
  { key: FeatureKey.VENUE, label: "Venue", group: "Ops" },
  { key: FeatureKey.ANALYTICS, label: "Analytics", group: "Ops" },
  { key: FeatureKey.EVENT_WALLET, label: "Event Wallet", group: "Commerce" },
  { key: FeatureKey.TICKETING, label: "Ticketing", group: "Commerce" },
  { key: FeatureKey.TICKET_TIERS, label: "Ticket Tiers", group: "Commerce" },
  { key: FeatureKey.CONTRIBUTIONS, label: "Contributions", group: "Commerce" },
  { key: FeatureKey.REGISTRY, label: "Registry", group: "Commerce" },
  { key: FeatureKey.GIFT_LIST, label: "Gift List", group: "Commerce" },
  { key: FeatureKey.WEDDING_PARTY, label: "Wedding Party", group: "Creative" },
  { key: FeatureKey.COUPLE_PROFILE, label: "Couple Profile", group: "Creative" },
  { key: FeatureKey.DRESS_CODE, label: "Dress Code", group: "Creative" },
  { key: FeatureKey.MENU, label: "Menu", group: "Creative" },
  { key: FeatureKey.OBITUARY, label: "Obituary", group: "Memorial" },
  { key: FeatureKey.FUNERAL_SCHEDULE, label: "Funeral Schedule", group: "Memorial" },
  { key: FeatureKey.FAMILY_PORTAL, label: "Family Portal", group: "Memorial" },
  { key: FeatureKey.TRIBUTE_WALL, label: "Tribute Wall", group: "Memorial" },
  { key: FeatureKey.LIVESTREAM, label: "Livestream", group: "Memorial" },
  { key: FeatureKey.LEGACY_ARCHIVE, label: "Legacy Archive", group: "Memorial" },
  { key: FeatureKey.SPEAKERS, label: "Speakers", group: "Conference" },
  { key: FeatureKey.SESSIONS, label: "Sessions", group: "Conference" },
  { key: FeatureKey.SPONSORS, label: "Sponsors", group: "Conference" },
  { key: FeatureKey.EXHIBITORS, label: "Exhibitors", group: "Conference" },
  { key: FeatureKey.AGENDA, label: "Agenda", group: "Conference" },
  { key: FeatureKey.CERTIFICATES, label: "Certificates", group: "Conference" },
  { key: FeatureKey.REGISTRATION, label: "Registration", group: "Conference" },
  { key: FeatureKey.ARTISTS, label: "Artists", group: "Entertainment" },
  { key: FeatureKey.STAGES, label: "Stages", group: "Entertainment" },
  { key: FeatureKey.STAFF_PASSES, label: "Staff Passes", group: "Entertainment" },
  { key: FeatureKey.VIP_ACCESS, label: "VIP Access", group: "Entertainment" },
  { key: FeatureKey.THEME, label: "Theme", group: "Entertainment" },
  { key: FeatureKey.GAMES, label: "Games", group: "Entertainment" },
];

const LABEL_BY_KEY = Object.fromEntries(
  PACKAGE_FEATURE_CATALOG.map((f) => [f.key, f.label])
) as Record<string, string>;

/** Legacy seed keys → FeatureKey */
const LEGACY_FEATURE_MAP: Record<string, FeatureKey> = {
  qrAdmission: FeatureKey.QR_ADMISSION,
  rsvp: FeatureKey.RSVP,
  basicTemplates: FeatureKey.INVITATIONS,
  ticketing: FeatureKey.TICKETING,
  campaigns: FeatureKey.COMMUNICATIONS,
  whiteLabel: FeatureKey.SETTINGS,
  prioritySupport: FeatureKey.COLLABORATORS,
};

export function featureLabel(key: string): string {
  return LABEL_BY_KEY[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function featuresByGroup(): { group: PackageFeatureGroup; items: PackageFeatureDef[] }[] {
  const order: PackageFeatureGroup[] = [
    "Core",
    "Guests & access",
    "Creative",
    "Commerce",
    "Ops",
    "Memorial",
    "Conference",
    "Entertainment",
  ];
  return order
    .map((group) => ({
      group,
      items: PACKAGE_FEATURE_CATALOG.filter((f) => f.group === group),
    }))
    .filter((g) => g.items.length > 0);
}

/**
 * Normalize package.features JSON into FeatureKey strings.
 * Supports arrays, boolean maps, `all: true`, and legacy camelCase keys.
 */
export function normalizePackageFeatureKeys(features: unknown): string[] {
  if (!features) return [];

  if (Array.isArray(features)) {
    return features
      .filter((f): f is string => typeof f === "string" && f.length > 0)
      .map((f) => LEGACY_FEATURE_MAP[f] ?? f)
      .filter((f, i, arr) => arr.indexOf(f) === i);
  }

  if (typeof features === "object" && features !== null) {
    const obj = features as Record<string, unknown>;
    if (obj.all === true) {
      return [...ALL_FEATURE_KEYS];
    }
    return Object.entries(obj)
      .filter(([, v]) => v === true)
      .map(([k]) => LEGACY_FEATURE_MAP[k] ?? k)
      .filter((f, i, arr) => arr.indexOf(f) === i);
  }

  return [];
}

export function packageFeatureLabels(features: unknown): string[] {
  return normalizePackageFeatureKeys(features).map(featureLabel);
}
