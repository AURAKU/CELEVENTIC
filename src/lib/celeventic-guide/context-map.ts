import { CELEVENTIC_GUIDE_CATALOG } from "./catalog";

export interface ContextHelpMapping {
  routePrefix: string;
  guideSlugs: string[];
  tourId?: string;
  label: string;
}

/**
 * Route-aware contextual help. Invitation template surfaces are intentionally excluded
 * so we never float intrusive help over guest invitation templates.
 */
export const CONTEXT_HELP_MAP: ContextHelpMapping[] = [
  {
    routePrefix: "/dashboard/guests",
    guideSlugs: ["add-guests", "import-guests", "guest-tags"],
    tourId: "guest-list",
    label: "Guest list help",
  },
  {
    routePrefix: "/dashboard/seating",
    guideSlugs: ["seating-organizer", "smart-auto-seating", "find-your-seat"],
    tourId: "seating",
    label: "Seating help",
  },
  {
    routePrefix: "/dashboard/events",
    guideSlugs: ["event-guide-organizer", "programme-and-menu", "event-guide-qr", "create-an-event"],
    tourId: "event-guide",
    label: "Event Guide help",
  },
  {
    routePrefix: "/dashboard/qr-admission",
    guideSlugs: ["qr-admission-organizer", "offline-admission", "scan-guest"],
    tourId: "qr-admission",
    label: "QR admission help",
  },
  {
    routePrefix: "/dashboard/qr",
    guideSlugs: ["qr-admission-organizer", "offline-admission", "scan-guest"],
    tourId: "qr-admission",
    label: "QR admission help",
  },
  {
    routePrefix: "/dashboard/admission",
    guideSlugs: ["qr-admission-organizer", "offline-admission", "generate-qr-identities"],
    tourId: "qr-admission",
    label: "Admission help",
  },
  {
    routePrefix: "/dashboard/invitations",
    guideSlugs: ["build-an-invitation", "open-your-invitation", "group-invitations-organizer"],
    tourId: "invitation-studio",
    label: "Invitation Studio help",
  },
  {
    routePrefix: "/dashboard/memory",
    guideSlugs: ["memory-vault-organizer", "memory-vault-guest", "wishes-organizer"],
    label: "Memory Vault help",
  },
];

/** Paths where contextual float/drawer must never appear (invitation templates & public invite). */
export const CONTEXT_HELP_BLOCKLIST_PREFIXES = [
  "/invite/",
  "/invitations/templates",
  "/event-guide/",
  "/auth/",
];

export function isContextHelpAllowed(pathname: string): boolean {
  const path = pathname.split("?")[0] || "/";
  if (CONTEXT_HELP_BLOCKLIST_PREFIXES.some((p) => path === p || path.startsWith(p))) {
    return false;
  }
  return true;
}

export function resolveContextHelp(pathname: string): ContextHelpMapping | null {
  if (!isContextHelpAllowed(pathname)) return null;
  const path = pathname.split("?")[0] || "/";
  const matches = CONTEXT_HELP_MAP.filter(
    (m) => path === m.routePrefix || path.startsWith(m.routePrefix + "/")
  ).sort((a, b) => b.routePrefix.length - a.routePrefix.length);
  return matches[0] ?? null;
}

export function getContextGuideTitles(pathname: string): Array<{ slug: string; title: string }> {
  const mapping = resolveContextHelp(pathname);
  if (!mapping) return [];
  return mapping.guideSlugs
    .map((slug) => {
      const g = CELEVENTIC_GUIDE_CATALOG.find((c) => c.slug === slug);
      return g ? { slug: g.slug, title: g.title } : null;
    })
    .filter(Boolean) as Array<{ slug: string; title: string }>;
}
