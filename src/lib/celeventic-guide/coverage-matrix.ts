/**
 * Machine-readable Celeventic Guide coverage matrix (§51 / §60).
 * Honest audit of REAL user-facing features in this repo — do not invent.
 */

export type CoverageStatus = "COVERED" | "PARTIAL" | "MISSING" | "NOT USER-FACING" | "DEPRECATED" | "N/A";
export type CoveragePriority = "P0" | "P1" | "P2" | "P3" | "N/A";
export type CoverageAudience =
  | "PUBLIC"
  | "GUEST"
  | "ORGANIZER"
  | "VENDOR"
  | "SCANNER"
  | "ADMIN"
  | "ALL";

export interface CoverageRow {
  feature: string;
  featureKey: string;
  route: string;
  audience: CoverageAudience;
  existingTutorial: string;
  tutorialType: "full" | "contextual" | "tour" | "motion" | "none" | "n/a";
  videoAvailable: boolean;
  interactiveWalkthrough: boolean;
  contextualHelp: boolean;
  status: CoverageStatus;
  priority: CoveragePriority;
  lastVerified: string;
  owner: string;
  notes?: string;
}

/** Last verified against Guide completeness pass (repo audit date). */
export const COVERAGE_LAST_VERIFIED = "2026-08-11";
export const COVERAGE_OWNER_DEFAULT = "celeventic-guide";

export const CELEVENTIC_HELP_COVERAGE: CoverageRow[] = [
  // ── Core platform ──
  {
    feature: "Marketing home / How it works",
    featureKey: "landing",
    route: "/",
    audience: "PUBLIC",
    existingTutorial: "how-celeventic-works",
    tutorialType: "motion",
    videoAvailable: false,
    interactiveWalkthrough: true,
    contextualHelp: false,
    status: "PARTIAL",
    priority: "P0",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
    notes: "VIDEO PRODUCTION REQUIRED — flagship MP4 not recorded yet; motion + poster ship.",
  },
  {
    feature: "Celeventic Guide home",
    featureKey: "celeventic-guide",
    route: "/guide",
    audience: "ALL",
    existingTutorial: "welcome-to-celeventic",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: true,
    contextualHelp: true,
    status: "COVERED",
    priority: "P0",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Open invitation (guest)",
    featureKey: "invitation-open",
    route: "/invite/[link]",
    audience: "GUEST",
    existingTutorial: "open-your-invitation",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: true,
    contextualHelp: false,
    status: "PARTIAL",
    priority: "P0",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
    notes: "Contextual float blocked on /invite/ by design; VIDEO PRODUCTION REQUIRED.",
  },
  {
    feature: "RSVP",
    featureKey: "rsvp",
    route: "/invite/[link]",
    audience: "GUEST",
    existingTutorial: "rsvp",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: true,
    contextualHelp: false,
    status: "PARTIAL",
    priority: "P0",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
    notes: "VIDEO PRODUCTION REQUIRED.",
  },
  {
    feature: "Guest QR admission pass",
    featureKey: "admission-pass",
    route: "/admission/[token], /qr/[token]",
    audience: "GUEST",
    existingTutorial: "your-qr-admission-pass",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: true,
    contextualHelp: true,
    status: "PARTIAL",
    priority: "P0",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
    notes: "VIDEO PRODUCTION REQUIRED.",
  },
  {
    feature: "Find your seat",
    featureKey: "seating-guest",
    route: "/seat/[token], /event-seat/[token]",
    audience: "GUEST",
    existingTutorial: "find-your-seat",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: true,
    contextualHelp: true,
    status: "PARTIAL",
    priority: "P0",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
    notes: "VIDEO PRODUCTION REQUIRED.",
  },
  {
    feature: "Event Guide (guest companion)",
    featureKey: "event-guide-guest",
    route: "/event-guide/[token]",
    audience: "GUEST",
    existingTutorial: "event-guide-guest",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: true,
    contextualHelp: false,
    status: "PARTIAL",
    priority: "P0",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
    notes: "Float blocked on Event Guide shells; tutorial + embed helper available. VIDEO PRODUCTION REQUIRED.",
  },
  {
    feature: "Memory Vault (guest share)",
    featureKey: "memory-vault-guest",
    route: "/memory/[token], /memory-upload/[eventToken]",
    audience: "GUEST",
    existingTutorial: "memory-vault-guest",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: true,
    contextualHelp: true,
    status: "PARTIAL",
    priority: "P0",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
    notes: "VIDEO PRODUCTION REQUIRED.",
  },
  {
    feature: "Organizer quick start / create event",
    featureKey: "organizer-quick-start",
    route: "/dashboard/getting-started, /dashboard/events",
    audience: "ORGANIZER",
    existingTutorial: "create-an-event, organizer-quick-start",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: true,
    contextualHelp: true,
    status: "PARTIAL",
    priority: "P0",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
    notes: "VIDEO PRODUCTION REQUIRED for organizer-quick-start.",
  },
  {
    feature: "Build invitation",
    featureKey: "invitation-studio",
    route: "/dashboard/invitations, /invitations",
    audience: "ORGANIZER",
    existingTutorial: "build-an-invitation",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: true,
    contextualHelp: true,
    status: "COVERED",
    priority: "P0",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Guest management",
    featureKey: "guest-management",
    route: "/dashboard/guests",
    audience: "ORGANIZER",
    existingTutorial: "add-guests, import-guests, guest-tags",
    tutorialType: "tour",
    videoAvailable: false,
    interactiveWalkthrough: true,
    contextualHelp: true,
    status: "COVERED",
    priority: "P0",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Seating (organizer)",
    featureKey: "seating-organizer",
    route: "/dashboard/seating",
    audience: "ORGANIZER",
    existingTutorial: "seating-organizer, smart-auto-seating",
    tutorialType: "tour",
    videoAvailable: false,
    interactiveWalkthrough: true,
    contextualHelp: true,
    status: "COVERED",
    priority: "P0",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "QR Admission / scanning",
    featureKey: "qr-admission",
    route: "/dashboard/qr, /dashboard/qr-admission",
    audience: "ORGANIZER",
    existingTutorial: "qr-admission-organizer, offline-admission, scan-guest",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: true,
    contextualHelp: true,
    status: "COVERED",
    priority: "P0",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "QR & Pass Hub",
    featureKey: "qr-hub",
    route: "/dashboard/qr-hub",
    audience: "ORGANIZER",
    existingTutorial: "qr-hub, event-guide-qr, generate-qr-identities",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: true,
    contextualHelp: true,
    status: "COVERED",
    priority: "P1",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Event Guide builder",
    featureKey: "event-guide-organizer",
    route: "/dashboard/events/[id]/event-guide",
    audience: "ORGANIZER",
    existingTutorial: "event-guide-organizer, programme-and-menu",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: true,
    contextualHelp: true,
    status: "COVERED",
    priority: "P0",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Vendor passes (organizer)",
    featureKey: "vendor-passes",
    route: "/dashboard/qr-hub, /vendor-pass/[token]",
    audience: "ORGANIZER",
    existingTutorial: "vendor-passes-organizer",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: true,
    contextualHelp: true,
    status: "COVERED",
    priority: "P1",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Vendor portal",
    featureKey: "vendor-portal",
    route: "/dashboard/vendor-portal",
    audience: "VENDOR",
    existingTutorial: "vendor-portal, vendor-pass",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: true,
    contextualHelp: true,
    status: "COVERED",
    priority: "P1",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Tickets / ticketing",
    featureKey: "tickets",
    route: "/dashboard/tickets",
    audience: "ORGANIZER",
    existingTutorial: "tickets-organizer",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: true,
    contextualHelp: true,
    status: "COVERED",
    priority: "P1",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Payments / checkout (invitation orders)",
    featureKey: "payments",
    route: "/dashboard/settings?tab=billing, /invitations (checkout)",
    audience: "ORGANIZER",
    existingTutorial: "payments-overview",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: false,
    contextualHelp: true,
    status: "COVERED",
    priority: "P1",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Gifts / gift wallet",
    featureKey: "gifts",
    route: "/dashboard/gifts, /gift/[publicToken]",
    audience: "ORGANIZER",
    existingTutorial: "gifts-organizer, gifts-guest",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: true,
    contextualHelp: true,
    status: "COVERED",
    priority: "P1",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Marketplace",
    featureKey: "marketplace",
    route: "/marketplace, /dashboard/discovery",
    audience: "ORGANIZER",
    existingTutorial: "marketplace-organizer",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: false,
    contextualHelp: true,
    status: "COVERED",
    priority: "P1",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Venues",
    featureKey: "venues",
    route: "/dashboard/venues",
    audience: "ORGANIZER",
    existingTutorial: "venues-organizer",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: false,
    contextualHelp: true,
    status: "COVERED",
    priority: "P2",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Wallet / payouts",
    featureKey: "wallet",
    route: "/dashboard/wallet",
    audience: "ORGANIZER",
    existingTutorial: "wallet-organizer",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: false,
    contextualHelp: true,
    status: "COVERED",
    priority: "P1",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Contributions",
    featureKey: "contributions",
    route: "/dashboard/contributions",
    audience: "ORGANIZER",
    existingTutorial: "contributions-organizer",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: false,
    contextualHelp: true,
    status: "COVERED",
    priority: "P1",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Communications (messages + campaigns)",
    featureKey: "communications",
    route: "/dashboard/messages, /dashboard/campaigns",
    audience: "ORGANIZER",
    existingTutorial: "communications-organizer",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: false,
    contextualHelp: true,
    status: "COVERED",
    priority: "P1",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Collaboration / event workspace",
    featureKey: "collaboration",
    route: "/dashboard/events/[id]/workspace",
    audience: "ORGANIZER",
    existingTutorial: "collaboration-workspace",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: true,
    contextualHelp: true,
    status: "COVERED",
    priority: "P1",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Privacy & security center",
    featureKey: "privacy",
    route: "/dashboard/privacy-center",
    audience: "ORGANIZER",
    existingTutorial: "privacy-security",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: false,
    contextualHelp: true,
    status: "COVERED",
    priority: "P1",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Memory Vault (organizer)",
    featureKey: "memory-vault-organizer",
    route: "/dashboard/memory",
    audience: "ORGANIZER",
    existingTutorial: "memory-vault-organizer",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: true,
    contextualHelp: true,
    status: "COVERED",
    priority: "P0",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Thank You experience",
    featureKey: "thank-you",
    route: "/dashboard/events/[id]/thank-you, /thank-you/[eventToken]",
    audience: "ORGANIZER",
    existingTutorial: "thank-you-experience-organizer, thank-you-experience-guest",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: true,
    contextualHelp: true,
    status: "COVERED",
    priority: "P1",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Invitations (group / plus guests)",
    featureKey: "group-invitations",
    route: "/invite/[link], /dashboard/guests",
    audience: "GUEST",
    existingTutorial: "group-invitations-plus-guests, group-invitations-organizer",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: true,
    contextualHelp: true,
    status: "COVERED",
    priority: "P1",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Scanner / door staff",
    featureKey: "scanning",
    route: "/dashboard/qr, /verify/[token]",
    audience: "SCANNER",
    existingTutorial: "scan-guest, scan-group, scan-vendor, offline-scanning",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: true,
    contextualHelp: true,
    status: "COVERED",
    priority: "P0",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Event OS — Wedding",
    featureKey: "event-os-wedding",
    route: "/dashboard/events/[id] (WEDDING blueprint)",
    audience: "ORGANIZER",
    existingTutorial: "event-os-wedding",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: false,
    contextualHelp: true,
    status: "COVERED",
    priority: "P1",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
    notes: "No dedicated /dashboard/wedding — shared Event OS routes with WEDDING blueprint.",
  },
  {
    feature: "Event OS — Funeral / FuneralOS",
    featureKey: "event-os-funeral",
    route: "/dashboard/funeral, /memorial/[slug]",
    audience: "ORGANIZER",
    existingTutorial: "event-os-funeral",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: false,
    contextualHelp: true,
    status: "COVERED",
    priority: "P1",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Event OS — Corporate / Conference",
    featureKey: "event-os-corporate",
    route: "/dashboard/events/[id] (CORPORATE_EVENT / CONFERENCE)",
    audience: "ORGANIZER",
    existingTutorial: "event-os-corporate",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: false,
    contextualHelp: true,
    status: "COVERED",
    priority: "P2",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Design Studio / AI / Inspiration",
    featureKey: "design-studio",
    route: "/dashboard/design-studio, /dashboard/inspiration, /dashboard/ai-planner",
    audience: "ORGANIZER",
    existingTutorial: "design-studio",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: false,
    contextualHelp: true,
    status: "COVERED",
    priority: "P2",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Settings / team / billing",
    featureKey: "settings",
    route: "/dashboard/settings",
    audience: "ORGANIZER",
    existingTutorial: "settings-overview",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: false,
    contextualHelp: true,
    status: "COVERED",
    priority: "P2",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Admin Guide CMS",
    featureKey: "admin-guides",
    route: "/admin/guides",
    audience: "ADMIN",
    existingTutorial: "admin-guide-manager",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: false,
    contextualHelp: false,
    status: "COVERED",
    priority: "P1",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
    notes: "adminOnly — never public.",
  },
  {
    feature: "Admin control plane (users, commerce, modules)",
    featureKey: "admin-control-plane",
    route: "/admin/**",
    audience: "ADMIN",
    existingTutorial: "—",
    tutorialType: "none",
    videoAvailable: false,
    interactiveWalkthrough: false,
    contextualHelp: false,
    status: "N/A",
    priority: "P3",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: "platform-admin",
    notes: "Internal ops surfaces; Celeventic Guide focuses on guest/organizer/vendor/scanner journeys. Documented as unnecessary for public help.",
  },
  {
    feature: "Troubleshooting — invitation won't open",
    featureKey: "troubleshoot-invite",
    route: "/guide/troubleshoot-invitation-wont-open",
    audience: "GUEST",
    existingTutorial: "troubleshoot-invitation-wont-open",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: false,
    contextualHelp: true,
    status: "COVERED",
    priority: "P1",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Troubleshooting — QR won't scan",
    featureKey: "troubleshoot-qr",
    route: "/guide/troubleshoot-qr-wont-scan",
    audience: "GUEST",
    existingTutorial: "troubleshoot-qr-wont-scan",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: false,
    contextualHelp: true,
    status: "COVERED",
    priority: "P1",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Troubleshooting — RSVP fail",
    featureKey: "troubleshoot-rsvp",
    route: "/guide/troubleshoot-rsvp-fail",
    audience: "GUEST",
    existingTutorial: "troubleshoot-rsvp-fail",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: false,
    contextualHelp: true,
    status: "COVERED",
    priority: "P1",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Troubleshooting — seat not found",
    featureKey: "troubleshoot-seat",
    route: "/guide/troubleshoot-seat-not-found",
    audience: "GUEST",
    existingTutorial: "troubleshoot-seat-not-found",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: false,
    contextualHelp: true,
    status: "COVERED",
    priority: "P1",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Troubleshooting — Event Guide unavailable",
    featureKey: "troubleshoot-event-guide",
    route: "/guide/troubleshoot-event-guide-unavailable",
    audience: "GUEST",
    existingTutorial: "troubleshoot-event-guide-unavailable",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: false,
    contextualHelp: true,
    status: "COVERED",
    priority: "P1",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Troubleshooting — weak internet / offline",
    featureKey: "troubleshoot-offline",
    route: "/guide/troubleshoot-weak-internet",
    audience: "ALL",
    existingTutorial: "troubleshoot-weak-internet",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: false,
    contextualHelp: true,
    status: "COVERED",
    priority: "P1",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Troubleshooting — memory upload failed",
    featureKey: "troubleshoot-memory",
    route: "/guide/troubleshoot-memory-upload-failed",
    audience: "GUEST",
    existingTutorial: "troubleshoot-memory-upload-failed",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: false,
    contextualHelp: true,
    status: "COVERED",
    priority: "P1",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Troubleshooting — payment pending",
    featureKey: "troubleshoot-payment",
    route: "/guide/troubleshoot-payment-pending",
    audience: "ORGANIZER",
    existingTutorial: "troubleshoot-payment-pending",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: false,
    contextualHelp: true,
    status: "COVERED",
    priority: "P1",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Troubleshooting — ticket not received",
    featureKey: "troubleshoot-ticket",
    route: "/guide/troubleshoot-ticket-not-received",
    audience: "GUEST",
    existingTutorial: "troubleshoot-ticket-not-received",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: false,
    contextualHelp: true,
    status: "COVERED",
    priority: "P2",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  {
    feature: "Troubleshooting — vendor pass not working",
    featureKey: "troubleshoot-vendor-pass",
    route: "/guide/troubleshoot-vendor-pass",
    audience: "VENDOR",
    existingTutorial: "troubleshoot-vendor-pass",
    tutorialType: "full",
    videoAvailable: false,
    interactiveWalkthrough: false,
    contextualHelp: true,
    status: "COVERED",
    priority: "P1",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
  },
  // ── Honest N/A / not separate products ──
  {
    feature: "Dedicated Wedding OS app route",
    featureKey: "wedding-os-dedicated",
    route: "/dashboard/wedding (does not exist)",
    audience: "ORGANIZER",
    existingTutorial: "event-os-wedding",
    tutorialType: "n/a",
    videoAvailable: false,
    interactiveWalkthrough: false,
    contextualHelp: false,
    status: "N/A",
    priority: "N/A",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
    notes: "No dedicated route — Wedding is Event OS blueprint on shared event routes.",
  },
  {
    feature: "Organizer analytics dashboard page",
    featureKey: "organizer-analytics-page",
    route: "/dashboard/analytics (does not exist)",
    audience: "ORGANIZER",
    existingTutorial: "—",
    tutorialType: "n/a",
    videoAvailable: false,
    interactiveWalkthrough: false,
    contextualHelp: false,
    status: "N/A",
    priority: "N/A",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
    notes: "No organizer analytics page; conference blueprint aliases activity tab. Admin has /admin/analytics.",
  },
  {
    feature: "Speakers / Sessions / Sponsors / Exhibitors / Certificates dedicated pages",
    featureKey: "conference-extras",
    route: "FeatureKeys alias workspace tabs",
    audience: "ORGANIZER",
    existingTutorial: "—",
    tutorialType: "n/a",
    videoAvailable: false,
    interactiveWalkthrough: false,
    contextualHelp: false,
    status: "N/A",
    priority: "N/A",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
    notes: "FeatureKeys exist but no dedicated page.tsx folders — not user-facing as separate products.",
  },
  {
    feature: "/dashboard/admission page",
    featureKey: "dashboard-admission-alias",
    route: "/dashboard/admission (no page — use /dashboard/qr)",
    audience: "ORGANIZER",
    existingTutorial: "qr-admission-organizer",
    tutorialType: "n/a",
    videoAvailable: false,
    interactiveWalkthrough: false,
    contextualHelp: false,
    status: "DEPRECATED",
    priority: "N/A",
    lastVerified: COVERAGE_LAST_VERIFIED,
    owner: COVERAGE_OWNER_DEFAULT,
    notes: "Context map historically referenced /dashboard/admission; real scanner is /dashboard/qr + /dashboard/qr-admission.",
  },
];

export interface CoverageReport {
  totalUserFacing: number;
  covered: number;
  partial: number;
  missing: number;
  deprecatedOrNa: number;
  coveragePercent: number;
  unexplainedHighPriorityMissing: CoverageRow[];
  rows: CoverageRow[];
  generatedAt: string;
}

const USER_FACING: CoverageStatus[] = ["COVERED", "PARTIAL", "MISSING"];

export function buildCoverageReport(rows: CoverageRow[] = CELEVENTIC_HELP_COVERAGE): CoverageReport {
  const userFacing = rows.filter((r) => USER_FACING.includes(r.status));
  const covered = userFacing.filter((r) => r.status === "COVERED").length;
  const partial = userFacing.filter((r) => r.status === "PARTIAL").length;
  const missing = userFacing.filter((r) => r.status === "MISSING").length;
  const deprecatedOrNa = rows.filter(
    (r) => r.status === "DEPRECATED" || r.status === "N/A" || r.status === "NOT USER-FACING"
  ).length;
  const totalUserFacing = userFacing.length;
  const weighted = covered + partial * 0.5;
  const coveragePercent = totalUserFacing === 0 ? 0 : Math.round((weighted / totalUserFacing) * 1000) / 10;

  const unexplainedHighPriorityMissing = rows.filter(
    (r) =>
      r.status === "MISSING" &&
      (r.priority === "P0" || r.priority === "P1") &&
      !(r.notes && /unnecessary|n\/a|not required|documented/i.test(r.notes))
  );

  return {
    totalUserFacing,
    covered,
    partial,
    missing,
    deprecatedOrNa,
    coveragePercent,
    unexplainedHighPriorityMissing,
    rows,
    generatedAt: new Date().toISOString(),
  };
}

/** Gate: 0 unexplained high-priority MISSING. */
export function coverageGatePasses(report: CoverageReport = buildCoverageReport()): {
  ok: boolean;
  reason: string;
  report: CoverageReport;
} {
  if (report.unexplainedHighPriorityMissing.length > 0) {
    return {
      ok: false,
      reason: `Unexplained high-priority MISSING: ${report.unexplainedHighPriorityMissing
        .map((r) => r.featureKey)
        .join(", ")}`,
      report,
    };
  }
  return { ok: true, reason: "No unexplained P0/P1 MISSING features.", report };
}

export function toCoverageMarkdown(rows: CoverageRow[] = CELEVENTIC_HELP_COVERAGE): string {
  const report = buildCoverageReport(rows);
  const header = `| Feature | Route | Audience | Existing tutorial | Tutorial type | Video available? | Interactive walkthrough? | Contextual help? | Status | Priority | Last verified | Owner |
|---|---|---|---|---|---|---|---|---|---|---|---|`;
  const body = rows
    .map(
      (r) =>
        `| ${r.feature} | \`${r.route}\` | ${r.audience} | ${r.existingTutorial} | ${r.tutorialType} | ${
          r.videoAvailable ? "yes" : "no"
        } | ${r.interactiveWalkthrough ? "yes" : "no"} | ${r.contextualHelp ? "yes" : "no"} | ${r.status} | ${
          r.priority
        } | ${r.lastVerified} | ${r.owner}${r.notes ? ` — ${r.notes.replace(/\|/g, "/")}` : ""} |`
    )
    .join("\n");

  return `# Celeventic Help Coverage Matrix (§51)

> Honest audit of **real** user-facing features in CELEVENTIC-main. Do not invent features. Do not mark COVERED without evidence.
> Generated companion: \`src/lib/celeventic-guide/coverage-matrix.ts\` · Admin: \`/admin/guides/coverage\`

## Summary (§60)

| Metric | Count |
|---|---|
| TOTAL USER-FACING | ${report.totalUserFacing} |
| COVERED | ${report.covered} |
| PARTIAL | ${report.partial} |
| MISSING | ${report.missing} |
| DEPRECATED / N/A / NOT USER-FACING | ${report.deprecatedOrNa} |
| Coverage % (COVERED + 0.5×PARTIAL) | **${report.coveragePercent}%** |
| Unexplained high-priority MISSING | ${report.unexplainedHighPriorityMissing.length} |

Gate: **${coverageGatePasses(report).ok ? "PASS" : "FAIL"}** — ${coverageGatePasses(report).reason}

PARTIALs are mostly **VIDEO PRODUCTION REQUIRED** (interactive/motion tutorials ship; MP4s not recorded).

## Matrix

${header}
${body}

## Notes

- Spark & Drive is out of scope for this Guide pass.
- Invitation template surfaces intentionally exclude floating contextual help.
- Event OS Wedding/Corporate share event workspace routes (blueprints), not dedicated apps.
- Last verified: ${COVERAGE_LAST_VERIFIED}.
`;
}
