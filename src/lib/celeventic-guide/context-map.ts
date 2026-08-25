import { CELEVENTIC_GUIDE_CATALOG } from "./catalog";

export interface ContextHelpMapping {
  routePrefix: string;
  guideSlugs: string[];
  tourId?: string;
  label: string;
}

/**
 * Route-aware contextual help (§58/§62). Invitation templates & /invite blocked.
 */
export const CONTEXT_HELP_MAP: ContextHelpMapping[] = [
  {
    routePrefix: "/dashboard/guests",
    guideSlugs: ["add-guests", "import-guests", "guest-tags", "troubleshoot-rsvp-fail"],
    tourId: "guest-list",
    label: "Guest list help",
  },
  {
    routePrefix: "/dashboard/seating",
    guideSlugs: ["seating-organizer", "smart-auto-seating", "find-your-seat", "troubleshoot-seat-not-found"],
    tourId: "seating",
    label: "Seating help",
  },
  {
    routePrefix: "/dashboard/events",
    guideSlugs: ["event-guide-organizer", "programme-and-menu", "event-guide-qr", "collaboration-workspace"],
    tourId: "event-workspace",
    label: "Event & Guide help",
  },
  {
    routePrefix: "/dashboard/qr-hub",
    guideSlugs: ["qr-hub", "event-guide-qr", "generate-qr-identities", "vendor-passes-organizer"],
    tourId: "qr-hub",
    label: "QR Hub help",
  },
  {
    routePrefix: "/dashboard/qr-admission",
    guideSlugs: ["qr-admission-organizer", "offline-admission", "scan-guest"],
    tourId: "qr-admission",
    label: "QR admission help",
  },
  {
    routePrefix: "/dashboard/qr",
    guideSlugs: ["qr-admission-organizer", "offline-admission", "scan-guest", "troubleshoot-qr-wont-scan"],
    tourId: "qr-admission",
    label: "QR admission help",
  },
  {
    routePrefix: "/dashboard/invitations",
    guideSlugs: ["build-an-invitation", "open-your-invitation", "group-invitations-organizer"],
    tourId: "invitation-studio",
    label: "Invitation Studio help",
  },
  {
    routePrefix: "/dashboard/memory",
    guideSlugs: ["memory-vault-organizer", "memory-vault-guest", "wishes-organizer", "troubleshoot-memory-upload-failed"],
    label: "Memory Vault help",
  },
  {
    routePrefix: "/dashboard/tickets",
    guideSlugs: ["tickets-organizer", "tickets-overview", "payments-overview"],
    label: "Tickets help",
  },
  {
    routePrefix: "/dashboard/gifts",
    guideSlugs: ["gifts-organizer", "organizer-gifts", "wallet-organizer"],
    label: "Gifts help",
  },
  {
    routePrefix: "/dashboard/wallet",
    guideSlugs: ["wallet-organizer", "payments-overview", "gifts-organizer"],
    label: "Wallet help",
  },
  {
    routePrefix: "/dashboard/contributions",
    guideSlugs: ["contributions-organizer", "gifts-organizer"],
    label: "Contributions help",
  },
  {
    routePrefix: "/marketplace",
    guideSlugs: ["marketplace-organizer", "marketplace-basics", "venues-organizer"],
    label: "Marketplace help",
  },
  {
    routePrefix: "/dashboard/venues",
    guideSlugs: ["venues-organizer", "marketplace-organizer"],
    label: "Venues help",
  },
  {
    routePrefix: "/dashboard/vendor-portal",
    guideSlugs: ["vendor-portal", "vendor-pass", "troubleshoot-vendor-pass"],
    label: "Vendor portal help",
  },
  {
    routePrefix: "/dashboard/messages",
    guideSlugs: ["communications-organizer"],
    label: "Messages help",
  },
  {
    routePrefix: "/dashboard/campaigns",
    guideSlugs: ["communications-organizer"],
    label: "Campaigns help",
  },
  {
    routePrefix: "/dashboard/settings",
    guideSlugs: ["settings-overview", "privacy-security", "payments-overview"],
    label: "Settings help",
  },
  {
    routePrefix: "/dashboard/privacy-center",
    guideSlugs: ["privacy-security", "privacy-and-data"],
    label: "Privacy help",
  },
  {
    routePrefix: "/dashboard/funeral",
    guideSlugs: ["event-os-funeral", "contributions-organizer", "memory-vault-organizer"],
    label: "FuneralOS help",
  },
  {
    routePrefix: "/dashboard/getting-started",
    guideSlugs: ["organizer-quick-start", "create-an-event", "build-an-invitation"],
    tourId: "organizer-quick-start",
    label: "Getting started",
  },
  {
    routePrefix: "/dashboard/design-studio",
    guideSlugs: ["design-studio", "build-an-invitation"],
    label: "Design Studio help",
  },
  {
    routePrefix: "/admission",
    guideSlugs: ["your-qr-admission-pass", "troubleshoot-qr-wont-scan"],
    label: "Admission pass help",
  },
  {
    routePrefix: "/guide",
    guideSlugs: ["how-celeventic-works", "welcome-to-celeventic"],
    label: "Learn Celeventic",
  },
];

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
