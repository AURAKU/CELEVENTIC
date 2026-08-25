/**
 * Canonical “how the platform works” copy for landing + /guide preview.
 * Guest journey stays the hero path; host / door / vendor lanes + system map
 * cover the rest of Celeventic so nothing important is left unexplained.
 */

export type PlatformLaneId = "guest" | "host" | "door" | "vendor";

export type JourneyStage = {
  id: string;
  label: string;
  headline: string;
  summary: string;
  details: string[];
  durationMs: number;
  motionKey: string;
  guideHref: string;
};

export type PlatformLane = {
  id: PlatformLaneId;
  label: string;
  title: string;
  summary: string;
  steps: Array<{ title: string; body: string }>;
  guideHref: string;
};

export type PlatformCapability = {
  id: string;
  label: string;
  body: string;
  guideHref: string;
};

/** Guest celebration path — Invite → Remember */
export const GUEST_JOURNEY_STAGES: JourneyStage[] = [
  {
    id: "invite",
    label: "Invite",
    headline: "Open a living invitation",
    summary:
      "Guests open a branded digital invitation from WhatsApp, SMS, or email — no app install required.",
    details: [
      "Cinematic openings (envelope, seal, curtain) play once guests tap to begin.",
      "Music and media never autoplay unmuted — guests stay in control.",
      "One link can cover a household or party when the host sends a group invite.",
      "Templates and Design Studio give hosts a polished look in minutes.",
    ],
    durationMs: 5200,
    motionKey: "invite",
    guideHref: "/guide/open-your-invitation",
  },
  {
    id: "rsvp",
    label: "RSVP",
    headline: "Confirm who is coming",
    summary: "Guests accept, decline, or update attendance — including plus guests — in a few taps.",
    details: [
      "Choose attending, maybe, or decline, then save.",
      "Add meal notes or party size when the host asks for them.",
      "Reopen the same link later to change an RSVP.",
      "Hosts see live counts in Guests so planning stays accurate.",
    ],
    durationMs: 4800,
    motionKey: "rsvp",
    guideHref: "/guide/rsvp",
  },
  {
    id: "admit",
    label: "Admit",
    headline: "Enter with a personal QR pass",
    summary: "Each guest gets a unique admission QR. Door staff scan it for a fast, secure check-in.",
    details: [
      "Find the pass on the invitation after RSVP, then screenshot or keep the link handy.",
      "Group invites still give each person their own QR identity.",
      "Scanners work online or offline and sync when the network returns.",
      "Vendor and team passes use the same door flow for load-in and staff.",
    ],
    durationMs: 5000,
    motionKey: "admit",
    guideHref: "/guide/your-qr-admission-pass",
  },
  {
    id: "guide",
    label: "Guide",
    headline: "Stay oriented all day",
    summary:
      "Event Guide is the day-of companion: programme, seating, menu, venue, and help in one place.",
    details: [
      "Open from a QR or link — programme, seating lookup, menu, and directions.",
      "Hosts publish updates once; every guest phone stays current.",
      "Place cards and seat lookups reduce usher chaos at reception.",
      "Need help? Guests can call the host or open Celeventic Guide topics.",
    ],
    durationMs: 5200,
    motionKey: "guide",
    guideHref: "/guide/event-guide-guest",
  },
  {
    id: "celebrate",
    label: "Celebrate",
    headline: "Less friction, more joy",
    summary:
      "With passes, seats, and programme sorted, guests focus on the celebration — not logistics.",
    details: [
      "Optional cash gifts flow securely without fundraising language on celebratory events.",
      "Wishes, seating continuity, and post-admission companion keep the evening clear.",
      "Tickets, contributions, and marketplace vendors plug in when the event needs them.",
      "Hosts collaborate in workspace tools while the floor runs smoothly.",
    ],
    durationMs: 4800,
    motionKey: "celebrate",
    guideHref: "/guide/gifts-guest",
  },
  {
    id: "remember",
    label: "Remember",
    headline: "Keep the moments",
    summary: "Memory Vault collects guest photos and videos into a shared album hosts can treasure.",
    details: [
      "Guests upload from the invite or companion — common photo and video formats.",
      "Hosts moderate and share approved memories after the day.",
      "Thank-you pages and closing notes wrap the journey with gratitude.",
      "Everything lives on the web — guests never need a separate app.",
    ],
    durationMs: 5000,
    motionKey: "remember",
    guideHref: "/guide/view-shared-memories",
  },
];

/** Parallel operating lanes — how the rest of the system works */
export const PLATFORM_LANES: PlatformLane[] = [
  {
    id: "guest",
    label: "Guests",
    title: "Guest journey",
    summary: "Invitation → RSVP → QR pass → Event Guide → gifts & memories — all from a link.",
    steps: GUEST_JOURNEY_STAGES.map((s) => ({ title: s.label, body: s.summary })),
    guideHref: "/guide/how-celeventic-works",
  },
  {
    id: "host",
    label: "Hosts",
    title: "Organizer operating system",
    summary: "Create the event, design the invite, import guests, seat them, go live, and measure.",
    steps: [
      {
        title: "Create & brand",
        body: "Start an event, pick a template or Design Studio look, set venue, date, and dress code.",
      },
      {
        title: "Guests & invites",
        body: "Add or import guests, send invitations, track RSVPs, and manage plus-ones.",
      },
      {
        title: "Floor plan & guide",
        body: "Build seating, programme, menu, and Event Guide so day-of stays clear.",
      },
      {
        title: "Door & money",
        body: "Enable QR admission, gifts, tickets, contributions, wallet payouts, and vendor passes.",
      },
      {
        title: "Aftercare",
        body: "Moderate Memory Vault, thank guests, and review analytics from one dashboard.",
      },
    ],
    guideHref: "/guide/organizer-quick-start",
  },
  {
    id: "door",
    label: "Door",
    title: "Scanning & admission",
    summary: "Door staff admit guests, groups, and vendors — online or offline — with a clear scan log.",
    steps: [
      {
        title: "Scan guest QR",
        body: "Brighten the phone screen and scan once for a confirmed admit.",
      },
      {
        title: "Groups & partial entry",
        body: "Admit a household together or one person at a time when needed.",
      },
      {
        title: "Vendor / team passes",
        body: "Scan crew and vendor passes for load-in without mixing them into guest counts.",
      },
      {
        title: "Offline mode",
        body: "Keep admitting when signal drops; sync when the network returns.",
      },
    ],
    guideHref: "/guide/scan-guest",
  },
  {
    id: "vendor",
    label: "Vendors",
    title: "Vendor & team access",
    summary: "Marketplace vendors and crew get event-bound passes through QR Hub and Vendor Portal.",
    steps: [
      {
        title: "Receive a pass",
        body: "Organizers issue vendor or team links from QR Hub for this event only.",
      },
      {
        title: "Show at load-in",
        body: "Present the pass to door staff — validity windows can match setup times.",
      },
      {
        title: "Portal & bookings",
        body: "Vendors manage profile, bookings, and escrow through the vendor portal when enabled.",
      },
    ],
    guideHref: "/guide/vendor-pass",
  },
];

/** Full system map — every major Celeventic surface */
export const PLATFORM_CAPABILITIES: PlatformCapability[] = [
  {
    id: "invitations",
    label: "Invitations & templates",
    body: "Cinematic digital invites, catalogue templates, and live studio editing.",
    guideHref: "/guide/build-an-invitation",
  },
  {
    id: "rsvp",
    label: "RSVP & guests",
    body: "Attendance, party size, import, search, and live guest lists.",
    guideHref: "/guide/add-guests",
  },
  {
    id: "admission",
    label: "QR admission",
    body: "Personal passes, group entry, scan logs, and offline door mode.",
    guideHref: "/guide/qr-admission-organizer",
  },
  {
    id: "event-guide",
    label: "Event Guide",
    body: "Programme, seating, menu, venue, and day-of companion for guests.",
    guideHref: "/guide/event-guide-organizer",
  },
  {
    id: "seating",
    label: "Seating",
    body: "Tables, assignments, place cards, and guest seat lookup.",
    guideHref: "/guide/seating-organizer",
  },
  {
    id: "gifts",
    label: "Gifts & wallet",
    body: "Secure guest gifting with private totals and host payouts.",
    guideHref: "/guide/gifts-organizer",
  },
  {
    id: "memory",
    label: "Memory Vault",
    body: "Guest photo/video uploads into a moderated shared album.",
    guideHref: "/guide/upload-photos",
  },
  {
    id: "tickets",
    label: "Tickets",
    body: "Paid entry and ticket delivery when the event needs them.",
    guideHref: "/guide/tickets-organizer",
  },
  {
    id: "marketplace",
    label: "Marketplace & vendors",
    body: "Discover vendors, book services, and issue team passes.",
    guideHref: "/guide/marketplace-organizer",
  },
  {
    id: "design",
    label: "Design Studio",
    body: "Creative controls, inspiration, and brand-ready layouts.",
    guideHref: "/guide/design-studio",
  },
  {
    id: "comms",
    label: "Communications",
    body: "Share invites and updates through the channels guests already use.",
    guideHref: "/guide/communications-organizer",
  },
  {
    id: "workspace",
    label: "Workspace & privacy",
    body: "Collaborate with your team and keep guest data protected.",
    guideHref: "/guide/privacy-security",
  },
];
