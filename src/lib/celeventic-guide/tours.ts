export interface TourStep {
  id: string;
  title: string;
  body: string;
  targetSelector?: string;
}

export interface MiniTour {
  id: string;
  title: string;
  guideSlug: string;
  steps: TourStep[];
}

export const MINI_TOURS: MiniTour[] = [
  {
    id: "welcome-navigation",
    title: "Celeventic quick tour",
    guideSlug: "getting-started",
    steps: [
      {
        id: "welcome",
        title: "You're in. Here's the map",
        body: "This 30-second tour shows where everything lives. No pressure. You can skip anytime and reopen Help later.",
      },
      {
        id: "search",
        title: "Find anything fast",
        body: "Search events, guests, and more from the top bar. Like the search box on Instagram or X.",
        targetSelector: "[data-tour='nav-search']",
      },
      {
        id: "create",
        title: "Create is your main action",
        body: "Tap Create when you're ready to start an event. That's the golden path for most hosts.",
        targetSelector: "[data-tour='nav-create']",
      },
      {
        id: "alerts",
        title: "Stay updated",
        body: "Notifications appear here. Invites, RSVPs, messages, and important event updates.",
        targetSelector: "[data-tour='nav-notifications']",
      },
      {
        id: "account",
        title: "Your account & settings",
        body: "Open your profile for settings, Help & Guides, and sign out. Always in the same place.",
        targetSelector: "[data-tour='nav-account']",
      },
      {
        id: "browse",
        title: "Move around the app",
        body: "On phones, use the bottom bar for Home, Events, Marketplace, Messages, and Profile. On desktop, use the left sidebar.",
        targetSelector: "[data-tour='nav-browse-mobile'], [data-tour='nav-browse-desktop']",
      },
      {
        id: "ready",
        title: "You're ready",
        body: "Next up: create your first event (or open an invite). Need a refresher anytime? Tap Help in the top bar.",
        targetSelector: "[data-tour='nav-create']",
      },
    ],
  },
  {
    id: "guest-list",
    title: "Guest List walkthrough",
    guideSlug: "add-guests",
    steps: [
      { id: "list", title: "Your guest list", body: "This is where every invitee lives. Search, tag, and invite from here.", targetSelector: "[data-tour='guest-list']" },
      { id: "add", title: "Add guests", body: "Add one guest at a time, or import a CSV for bulk uploads.", targetSelector: "[data-tour='guest-add']" },
      { id: "invite", title: "Send invitations", body: "When your invitation is ready, send links from the list actions.", targetSelector: "[data-tour='guest-invite']" },
    ],
  },
  {
    id: "seating",
    title: "Seating walkthrough",
    guideSlug: "seating-organizer",
    steps: [
      { id: "plan", title: "Seating plan", body: "Create tables, set capacities, and keep VIP parties together.", targetSelector: "[data-tour='seating-plan']" },
      { id: "assign", title: "Assign seats", body: "Place guests manually or run smart auto seating, then adjust.", targetSelector: "[data-tour='seating-assign']" },
      { id: "publish", title: "Publish to Event Guide", body: "Guests look up their seat from Event Guide on the day.", targetSelector: "[data-tour='seating-publish']" },
    ],
  },
  {
    id: "event-guide",
    title: "Event Guide walkthrough",
    guideSlug: "event-guide-organizer",
    steps: [
      { id: "builder", title: "Event Guide builder", body: "Build the guest companion: programme, menu, seating lookup, and more.", targetSelector: "[data-tour='event-guide-builder']" },
      { id: "content", title: "Content tabs", body: "Fill programme, menu, and day-of details guests will open on their phones.", targetSelector: "[data-tour='event-guide-content']" },
      { id: "publish", title: "Publish & QR", body: "Publish when ready and share the Event Guide QR with guests.", targetSelector: "[data-tour='event-guide-publish']" },
    ],
  },
  {
    id: "qr-admission",
    title: "QR Admission walkthrough",
    guideSlug: "qr-admission-organizer",
    steps: [
      { id: "hub", title: "QR Admission hub", body: "Generate identities, manage passes, and prepare door staff.", targetSelector: "[data-tour='qr-admission-hub']" },
      { id: "passes", title: "Guest passes", body: "Each guest gets a scannable QR pass after invitation / RSVP flow.", targetSelector: "[data-tour='qr-admission-passes']" },
      { id: "offline", title: "Offline ready", body: "Download offline packs so scanning still works without perfect wifi.", targetSelector: "[data-tour='qr-admission-offline']" },
    ],
  },
  {
    id: "invitation-studio",
    title: "Invitation Studio walkthrough",
    guideSlug: "build-an-invitation",
    steps: [
      { id: "studio", title: "Invitation Studio", body: "Design and manage event invitations from this workspace.", targetSelector: "[data-tour='invitation-studio']" },
      { id: "create", title: "Create or edit", body: "Start a new invitation or open an existing design to refine.", targetSelector: "[data-tour='invitation-create']" },
      { id: "distribute", title: "Distribute", body: "When ready, send links and track opens from your guest list.", targetSelector: "[data-tour='invitation-distribute']" },
    ],
  },
  {
    id: "celeyou-studio",
    title: "CeleYou Studio walkthrough",
    guideSlug: "celeyou",
    steps: [
      {
        id: "activity",
        title: "Activity",
        body: "Live counts from people who open this CeleYou. Filter with Today, 7 days, 30 days, This month, All time, or pick dates on the calendar.",
        targetSelector: "#studio-activity",
      },
      {
        id: "activation",
        title: "Activation",
        body: "A paid plan keeps the public page live. You cannot renew or upgrade until the current term ends.",
        targetSelector: "#studio-activation",
      },
      {
        id: "identity",
        title: "Identity",
        body: "Name, portrait, and company. Save to publish. Guests see the saved plate.",
        targetSelector: "#studio-identity",
      },
      {
        id: "look",
        title: "Design",
        body: "Choose a look, then save it. Every template on the platform uses this same Studio.",
        targetSelector: "#studio-look",
      },
      {
        id: "reach",
        title: "Contact and Reach",
        body: "Add mail, numbers, sites, chat, and wallets. Guests only see what you fill.",
        targetSelector: "#studio-contact, #studio-reach",
      },
      {
        id: "privacy",
        title: "Access codes",
        body: "Mark a detail Public, Code, or Ask. Code stays hidden on the public page until the guest enters that code.",
        targetSelector: "#studio-privacy",
      },
      {
        id: "share",
        title: "Share",
        body: "Share My Card sends the live public link with the plate. Copy Profile Link copies that URL. Wallet card opens the payment channels you uploaded. Hold up this card fills the screen with only the plate.",
        targetSelector: "#share",
      },
      {
        id: "nfc",
        title: "NFC",
        body: "A programmed NFC card opens this CeleYou. Copy the NFC link to program a card, or share the QR.",
        targetSelector: "#studio-live",
      },
    ],
  },
];

export function getMiniTour(id: string): MiniTour | null {
  return MINI_TOURS.find((t) => t.id === id) ?? null;
}
