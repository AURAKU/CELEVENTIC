import type { GuideCatalogEntry, GuideStepSeed } from "./types";
import { GUEST_ZERO_CATALOG_ADDITIONS } from "./guest-catalog";
import { mergeGuideCatalogs } from "./guest-zero-experience";
import { CELEVENTIC_GUIDE_COMPLETENESS_ADDITIONS } from "./catalog-completeness";
import { PRIORITY_VIDEO_SLUGS } from "./types";

function steps(...items: Array<[string, string] | GuideStepSeed>): GuideStepSeed[] {
  return items.map((item, i) => {
    if (Array.isArray(item)) {
      return { title: item[0], body: item[1], stepType: "motion" as const, motionKey: `step-${i + 1}` };
    }
    return item;
  });
}

/** Base catalog. Guest zero-experience additions merge by slug below. */
const CELEVENTIC_GUIDE_CATALOG_BASE: GuideCatalogEntry[] = [
  {
    slug: "how-celeventic-works",
    title: "How Celeventic Works",
    summary: "Invite → RSVP → Admit → Guide → Celebrate → Remember — the full guest journey in one cinematic walkthrough.",
    body: "Celeventic connects invitations, RSVPs, admission, Event Guide, celebration, and Memory Vault into one operating system for events.",
    role: "GUEST",
    category: "PLATFORM",
    status: "PUBLISHED",
    sortOrder: 0,
    featured: true,
    storyboardKey: "how-celeventic-works",
    synonyms: ["see how it works", "how it works", "learn celeventic", "overview", "platform tour"],
    relatedSlugs: ["welcome-to-celeventic", "open-your-invitation", "rsvp"],
    posterUrl: "/guides/posters/how-celeventic-works.svg",
    captionsEnUrl: "/guides/captions/how-celeventic-works.en.vtt",
    isNew: true,
    transcript:
      "Welcome to Celeventic. First you receive a beautiful invitation. Then you RSVP. On event day your QR pass admits you. The Event Guide helps you find programme, seating, and menu. You celebrate together. Afterward, Memory Vault keeps the moments.",
    steps: steps(
      ["Invite", "Open a branded digital invitation built for your event."],
      ["RSVP", "Confirm attendance for yourself and plus guests in seconds."],
      ["Admit", "Present your QR admission pass at the door."],
      ["Guide", "Use Event Guide for programme, seating, and menu."],
      ["Celebrate", "Enjoy the day with clear access and less friction."],
      ["Remember", "Revisit photos, wishes, and thank-you moments in Memory Vault."]
    ),
  },

  // ── Guest 1–13 ──
  {
    slug: "welcome-to-celeventic",
    title: "Welcome to Celeventic",
    summary: "A quick orientation for guests opening Celeventic for the first time.",
    role: "GUEST",
    category: "GETTING_STARTED",
    status: "PUBLISHED",
    sortOrder: 1,
    featured: true,
    synonyms: ["getting started guest", "new guest", "first time"],
    relatedSlugs: ["how-celeventic-works", "open-your-invitation"],
    posterUrl: "/guides/posters/welcome.svg",
    steps: steps(
      ["Open the link", "Use the invitation or Event Guide link you received."],
      ["Explore safely", "Everything you need is on one guest journey — no app install required."],
      ["Need help?", "Use Help & Guides anytime, or contact the host."]
    ),
  },
  {
    slug: "open-your-invitation",
    title: "Open Your Invitation",
    summary: "How to open and experience a Celeventic invitation on any phone.",
    role: "GUEST",
    category: "INVITATIONS",
    status: "PUBLISHED",
    sortOrder: 2,
    synonyms: ["open invite", "view invitation", "invitation link"],
    relatedSlugs: ["rsvp", "your-qr-admission-pass"],
    posterUrl: "/guides/posters/invitation.svg",
    steps: steps(
      ["Tap the link", "Open the invite from WhatsApp, SMS, or email."],
      ["Allow media", "Play music or video if prompted — audio never autoplays unmuted."],
      ["Continue", "Move to RSVP or your pass when ready."]
    ),
  },
  {
    slug: "rsvp",
    title: "RSVP",
    summary: "Confirm attendance, decline politely, and update your response.",
    role: "GUEST",
    category: "RSVP",
    status: "PUBLISHED",
    sortOrder: 3,
    synonyms: ["respond", "attending", "decline invitation", "rsvp form"],
    relatedSlugs: ["group-invitations-plus-guests", "open-your-invitation"],
    posterUrl: "/guides/posters/rsvp.svg",
    steps: steps(
      ["Choose your response", "Select attending, maybe, or decline."],
      ["Add details", "Share meal preferences or notes if the host asked."],
      ["Save", "You can reopen the link later to update your RSVP."]
    ),
  },
  {
    slug: "your-qr-admission-pass",
    title: "Your QR Admission Pass",
    summary: "Find, save, and present your personal QR pass on event day.",
    role: "GUEST",
    category: "ADMISSION",
    status: "PUBLISHED",
    sortOrder: 4,
    synonyms: ["qr pass", "ticket", "entry code", "admission pass"],
    contextRoutes: ["/invite"],
    relatedSlugs: ["event-day-access", "scan-guest"],
    posterUrl: "/guides/posters/qr-pass.svg",
    steps: steps(
      ["Find your pass", "After RSVP, your QR appears on the invitation or pass page."],
      ["Save it", "Screenshot or keep the link offline-ready on your phone."],
      ["Present at entry", "Show the QR brightly — staff scan it to admit you."]
    ),
  },
  {
    slug: "group-invitations-plus-guests",
    title: "Group Invitations & Plus Guests",
    summary: "Respond for your party and manage plus-one details.",
    role: "GUEST",
    category: "GUESTS",
    status: "PUBLISHED",
    sortOrder: 5,
    synonyms: ["plus one", "party invite", "group rsvp", "family invitation"],
    relatedSlugs: ["rsvp", "your-qr-admission-pass"],
    posterUrl: "/guides/posters/group.svg",
    steps: steps(
      ["Open the group invite", "One link can cover your household or party."],
      ["Name each guest", "Add plus guests the host allowed."],
      ["Each gets a pass", "Individual QR identities keep entry smooth."]
    ),
  },
  {
    slug: "find-your-seat",
    title: "Find Your Seat",
    summary: "Look up seating from Event Guide or your invitation.",
    role: "GUEST",
    category: "SEATING",
    status: "PUBLISHED",
    sortOrder: 6,
    synonyms: ["seating chart", "table number", "where do I sit"],
    relatedSlugs: ["event-guide-guest", "programme"],
    posterUrl: "/guides/posters/seating.svg",
    steps: steps(
      ["Open Event Guide", "Use the guide link or QR from your host."],
      ["Search your name", "Enter a few letters of your name."],
      ["Note table & seat", "Follow ushers if the floor plan is live."]
    ),
  },
  {
    slug: "event-guide-guest",
    title: "Event Guide",
    summary: "Programme, seating, menu, and day-of essentials in one guest companion.",
    role: "GUEST",
    category: "EVENT_GUIDE",
    status: "PUBLISHED",
    sortOrder: 7,
    featured: true,
    synonyms: ["programme guide", "day of guide", "guest companion"],
    relatedSlugs: ["programme", "menu", "find-your-seat"],
    posterUrl: "/guides/posters/event-guide.svg",
    steps: steps(
      ["Scan or open", "Use the Event Guide QR or link."],
      ["Pick a tab", "Programme, seating, menu, and more."],
      ["Stay oriented", "Reopen anytime during the celebration."]
    ),
  },
  {
    slug: "programme",
    title: "Programme",
    summary: "Follow the order of events from the Event Guide programme tab.",
    role: "GUEST",
    category: "EVENT_GUIDE",
    status: "PUBLISHED",
    sortOrder: 8,
    synonyms: ["schedule", "order of service", "timeline"],
    relatedSlugs: ["event-guide-guest", "menu"],
    posterUrl: "/guides/posters/programme.svg",
    steps: steps(
      ["Open Programme", "Inside Event Guide, choose Programme."],
      ["Follow along", "Times and moments update as the host publishes."],
      ["Share quietly", "Keep phones considerate during ceremony moments."]
    ),
  },
  {
    slug: "menu",
    title: "Menu",
    summary: "View courses and dietary notes from the Event Guide menu.",
    role: "GUEST",
    category: "EVENT_GUIDE",
    status: "PUBLISHED",
    sortOrder: 9,
    synonyms: ["food", "courses", "dietary", "dinner menu"],
    relatedSlugs: ["event-guide-guest", "programme"],
    posterUrl: "/guides/posters/menu.svg",
    steps: steps(
      ["Open Menu", "From Event Guide, open the Menu tab."],
      ["Check courses", "See what is being served and any notes."],
      ["Allergies", "Tell a host or usher if you need an alternative."]
    ),
  },
  {
    slug: "memory-vault-guest",
    title: "Memory Vault",
    summary: "Share and revisit photos and memories after the celebration.",
    role: "GUEST",
    category: "MEMORY",
    status: "PUBLISHED",
    sortOrder: 10,
    synonyms: ["photos", "gallery", "memories", "upload photos"],
    relatedSlugs: ["guest-wishes", "thank-you-experience-guest"],
    posterUrl: "/guides/posters/memory.svg",
    steps: steps(
      ["Open Memory Vault", "Use the link from your host or thank-you page."],
      ["Contribute", "Upload photos if the host enabled guest uploads."],
      ["Revisit", "Return later to relive the day."]
    ),
  },
  {
    slug: "guest-wishes",
    title: "Guest Wishes",
    summary: "Leave a warm wish or message for the celebrants.",
    role: "GUEST",
    category: "CELEBRATE",
    status: "PUBLISHED",
    sortOrder: 11,
    synonyms: ["guestbook", "messages", "congratulations"],
    relatedSlugs: ["memory-vault-guest", "thank-you-experience-guest"],
    posterUrl: "/guides/posters/wishes.svg",
    steps: steps(
      ["Open Wishes", "Find Wishes on the invitation or thank-you flow."],
      ["Write sincerely", "Keep it kind — messages may be moderated."],
      ["Submit", "Your wish appears when the host publishes it."]
    ),
  },
  {
    slug: "event-day-access",
    title: "Event Day Access",
    summary: "What to bring and how entry works on the day.",
    role: "GUEST",
    category: "ADMISSION",
    status: "PUBLISHED",
    sortOrder: 12,
    synonyms: ["arrival", "check in", "door entry", "event day"],
    relatedSlugs: ["your-qr-admission-pass", "find-your-seat"],
    posterUrl: "/guides/posters/event-day.svg",
    steps: steps(
      ["Arrive with pass", "Have your QR ready before the queue."],
      ["Brightness up", "Increase screen brightness for a clean scan."],
      ["Follow ushers", "After admit, use Event Guide for seating."]
    ),
  },
  {
    slug: "thank-you-experience-guest",
    title: "Thank You Experience",
    summary: "After the event — thank-you pages, memories, and closing moments.",
    role: "GUEST",
    category: "CELEBRATE",
    status: "PUBLISHED",
    sortOrder: 13,
    synonyms: ["thank you page", "after event", "closing"],
    relatedSlugs: ["memory-vault-guest", "guest-wishes"],
    posterUrl: "/guides/posters/thank-you.svg",
    steps: steps(
      ["Open thank-you", "Hosts may send a thank-you link after the day."],
      ["Relive moments", "Jump into Memory Vault or wishes."],
      ["Stay connected", "Save the link if the host keeps memories open."]
    ),
  },

  // ── Organizer 14–31 ──
  {
    slug: "create-an-event",
    title: "Create an Event",
    summary: "Start a new event workspace with type, details, and package.",
    role: "ORGANIZER",
    category: "GETTING_STARTED",
    status: "PUBLISHED",
    sortOrder: 14,
    featured: true,
    synonyms: ["new event", "start event", "event wizard"],
    contextRoutes: ["/dashboard/events/create", "/dashboard/events"],
    relatedSlugs: ["build-an-invitation", "add-guests"],
    posterUrl: "/guides/posters/create-event.svg",
    steps: steps(
      ["Open Create Event", "From the dashboard, choose Create Event."],
      ["Choose type", "Wedding, funeral, corporate, and more."],
      ["Save workspace", "Your event hub unlocks guests, invites, and admission."]
    ),
  },
  {
    slug: "build-an-invitation",
    title: "Build an Invitation",
    summary: "Design and publish a premium digital invitation.",
    role: "ORGANIZER",
    category: "INVITATIONS",
    status: "PUBLISHED",
    sortOrder: 15,
    featured: true,
    synonyms: ["invitation studio", "design invite", "publish invitation"],
    contextRoutes: ["/dashboard/invitations"],
    relatedSlugs: ["create-an-event", "add-guests"],
    posterUrl: "/guides/posters/build-invite.svg",
    steps: steps(
      ["Pick a template", "Start from Invitation Studio templates."],
      ["Customize", "Photos, copy, music, and reveal motion."],
      ["Publish & share", "Generate guest links when ready."]
    ),
  },
  {
    slug: "add-guests",
    title: "Add Guests",
    summary: "Add guests one by one with tags and contact details.",
    role: "ORGANIZER",
    category: "GUESTS",
    status: "PUBLISHED",
    sortOrder: 16,
    featured: true,
    synonyms: ["guest list", "add guest", "manual guests"],
    contextRoutes: ["/dashboard/guests", "/dashboard/events"],
    relatedSlugs: ["import-guests", "guest-tags"],
    posterUrl: "/guides/posters/add-guests.svg",
    steps: steps(
      ["Open Guests", "From your event, open the guest list."],
      ["Add a guest", "Enter name, contacts, and tags."],
      ["Invite", "Send invitation links when the design is ready."]
    ),
  },
  {
    slug: "import-guests",
    title: "Import Guests",
    summary: "Bulk import guests from CSV with validation and safety checks.",
    role: "ORGANIZER",
    category: "GUESTS",
    status: "PUBLISHED",
    sortOrder: 17,
    synonyms: ["csv import", "bulk guests", "upload guest list"],
    contextRoutes: ["/dashboard/guests"],
    relatedSlugs: ["add-guests", "group-invitations-organizer"],
    posterUrl: "/guides/posters/import-guests.svg",
    steps: steps(
      ["Download template", "Use the CSV template from Import."],
      ["Upload file", "Map columns and review validation."],
      ["Confirm import", "Fix errors, then commit the list."]
    ),
  },
  {
    slug: "group-invitations-organizer",
    title: "Group Invitations",
    summary: "Invite households and parties with shared links and individual passes.",
    role: "ORGANIZER",
    category: "INVITATIONS",
    status: "PUBLISHED",
    sortOrder: 18,
    synonyms: ["party invitations", "household invite", "family group"],
    relatedSlugs: ["generate-qr-identities", "add-guests"],
    posterUrl: "/guides/posters/group-org.svg",
    steps: steps(
      ["Create a party", "Group related guests under one invitation."],
      ["Set plus rules", "Control how many plus guests are allowed."],
      ["Share one link", "Each guest still receives a unique QR identity."]
    ),
  },
  {
    slug: "generate-qr-identities",
    title: "Generate QR Identities",
    summary: "Create branded QR admission identities for guests.",
    role: "ORGANIZER",
    category: "ADMISSION",
    status: "PUBLISHED",
    sortOrder: 19,
    synonyms: ["qr codes", "admission qr", "pass generation"],
    relatedSlugs: ["qr-admission-organizer", "guest-tags"],
    posterUrl: "/guides/posters/qr-identities.svg",
    steps: steps(
      ["Open QR tools", "From admission or guest list actions."],
      ["Generate", "Create passes for selected guests."],
      ["Download packs", "Export branded QR images when needed."]
    ),
  },
  {
    slug: "guest-tags",
    title: "Guest Tags",
    summary: "Organize guests with tags for seating, messaging, and VIP flows.",
    role: "ORGANIZER",
    category: "GUESTS",
    status: "PUBLISHED",
    sortOrder: 20,
    synonyms: ["labels", "vip tag", "segments"],
    relatedSlugs: ["add-guests", "seating-organizer"],
    posterUrl: "/guides/posters/tags.svg",
    steps: steps(
      ["Create tags", "Family, VIP, vendors, table groups, and more."],
      ["Apply in bulk", "Tag guests from the list filters."],
      ["Use downstream", "Tags power seating and communications."]
    ),
  },
  {
    slug: "seating-organizer",
    title: "Seating",
    summary: "Build tables and assign guests to seats.",
    role: "ORGANIZER",
    category: "SEATING",
    status: "PUBLISHED",
    sortOrder: 21,
    featured: true,
    synonyms: ["table plan", "seat assignment", "floor plan"],
    contextRoutes: ["/dashboard/seating"],
    relatedSlugs: ["smart-auto-seating", "find-your-seat"],
    posterUrl: "/guides/posters/seating-org.svg",
    steps: steps(
      ["Create tables", "Define table names and seat counts."],
      ["Assign guests", "Drag or assign from the guest list."],
      ["Publish to Guide", "Guests can look up seats in Event Guide."]
    ),
  },
  {
    slug: "smart-auto-seating",
    title: "Smart Auto Seating",
    summary: "Let Celeventic propose seating based on tags and constraints.",
    role: "ORGANIZER",
    category: "SEATING",
    status: "PUBLISHED",
    sortOrder: 22,
    synonyms: ["auto seat", "ai seating", "automatic tables"],
    relatedSlugs: ["seating-organizer", "guest-tags"],
    posterUrl: "/guides/posters/auto-seating.svg",
    steps: steps(
      ["Set constraints", "Keep families together, separate conflicts."],
      ["Run auto seating", "Review the proposed plan."],
      ["Adjust & save", "Fine-tune before publishing."]
    ),
  },
  {
    slug: "event-guide-organizer",
    title: "Event Guide (Organizer)",
    summary: "Build and publish the guest Event Guide companion.",
    role: "ORGANIZER",
    category: "EVENT_GUIDE",
    status: "PUBLISHED",
    sortOrder: 23,
    featured: true,
    synonyms: ["build event guide", "publish guide", "guest programme builder"],
    contextRoutes: ["/dashboard/events"],
    relatedSlugs: ["programme-and-menu", "event-guide-qr"],
    posterUrl: "/guides/posters/event-guide-org.svg",
    steps: steps(
      ["Open Event Guide builder", "From your event workspace."],
      ["Add content", "Programme, menu, seating, welcome."],
      ["Publish", "Guests scan the guide QR to open it."]
    ),
  },
  {
    slug: "programme-and-menu",
    title: "Programme & Menu",
    summary: "Edit programme scripts and menu courses for Event Guide.",
    role: "ORGANIZER",
    category: "EVENT_GUIDE",
    status: "PUBLISHED",
    sortOrder: 24,
    synonyms: ["edit programme", "edit menu", "courses"],
    relatedSlugs: ["event-guide-organizer", "programme"],
    posterUrl: "/guides/posters/programme-menu.svg",
    steps: steps(
      ["Edit Programme", "Add moments and timing."],
      ["Edit Menu", "List courses and dietary notes."],
      ["Publish updates", "Guests see the latest published version."]
    ),
  },
  {
    slug: "event-guide-qr",
    title: "Event Guide QR",
    summary: "Generate and share the Event Guide QR for day-of access.",
    role: "ORGANIZER",
    category: "EVENT_GUIDE",
    status: "PUBLISHED",
    sortOrder: 25,
    synonyms: ["guide qr code", "print guide qr"],
    relatedSlugs: ["event-guide-organizer", "event-guide-guest"],
    posterUrl: "/guides/posters/guide-qr.svg",
    steps: steps(
      ["Open QR hub", "Find Event Guide QR in your event tools."],
      ["Download print size", "Use high resolution for signage."],
      ["Place at venue", "Guests scan to open the companion."]
    ),
  },
  {
    slug: "vendor-passes-organizer",
    title: "Vendor Passes",
    summary: "Issue vendor and team passes for staff entry.",
    role: "ORGANIZER",
    category: "VENDOR",
    status: "PUBLISHED",
    sortOrder: 26,
    synonyms: ["staff pass", "vendor entry", "crew pass"],
    relatedSlugs: ["vendor-pass", "scan-vendor"],
    posterUrl: "/guides/posters/vendor-passes.svg",
    steps: steps(
      ["Create pass types", "Photographer, caterer, security, and more."],
      ["Issue passes", "Assign to vendors or team members."],
      ["Brief scanners", "Vendor passes scan differently from guest passes."]
    ),
  },
  {
    slug: "qr-admission-organizer",
    title: "QR Admission",
    summary: "Run door admission with live scanning and guest states.",
    role: "ORGANIZER",
    category: "ADMISSION",
    status: "PUBLISHED",
    sortOrder: 27,
    featured: true,
    synonyms: ["door scan", "check-in", "admission desk"],
    contextRoutes: ["/dashboard/qr", "/dashboard/admission"],
    relatedSlugs: ["offline-admission", "scan-guest"],
    posterUrl: "/guides/posters/admission.svg",
    steps: steps(
      ["Open QR Admission", "Select your event and scanner mode."],
      ["Scan passes", "Admit, reject, or review duplicates."],
      ["Monitor live", "Watch counts as guests arrive."]
    ),
  },
  {
    slug: "offline-admission",
    title: "Offline Admission",
    summary: "Keep scanning when venue connectivity is weak.",
    role: "ORGANIZER",
    category: "ADMISSION",
    status: "PUBLISHED",
    sortOrder: 28,
    synonyms: ["offline scan", "no wifi admission", "sync later"],
    relatedSlugs: ["qr-admission-organizer", "offline-scanning"],
    posterUrl: "/guides/posters/offline-admission.svg",
    steps: steps(
      ["Prepare offline pack", "Download before the event if needed."],
      ["Scan offline", "Admission continues without live internet."],
      ["Sync later", "Upload results when connectivity returns."]
    ),
  },
  {
    slug: "memory-vault-organizer",
    title: "Memory Vault (Organizer)",
    summary: "Collect, moderate, and share event memories.",
    role: "ORGANIZER",
    category: "MEMORY",
    status: "PUBLISHED",
    sortOrder: 29,
    synonyms: ["memory settings", "photo vault", "gallery host"],
    contextRoutes: ["/dashboard/memory"],
    relatedSlugs: ["memory-vault-guest", "wishes-organizer"],
    posterUrl: "/guides/posters/memory-org.svg",
    steps: steps(
      ["Enable Memory Vault", "From your event memory settings."],
      ["Invite contributions", "Share the upload link with guests."],
      ["Moderate & publish", "Keep the gallery polished."]
    ),
  },
  {
    slug: "wishes-organizer",
    title: "Wishes",
    summary: "Collect and moderate guest wishes.",
    role: "ORGANIZER",
    category: "CELEBRATE",
    status: "PUBLISHED",
    sortOrder: 30,
    synonyms: ["guestbook moderation", "wish wall"],
    relatedSlugs: ["guest-wishes", "thank-you-experience-organizer"],
    posterUrl: "/guides/posters/wishes-org.svg",
    steps: steps(
      ["Enable wishes", "Turn on guest wishes for the event."],
      ["Moderate", "Approve messages before they go public."],
      ["Feature favorites", "Highlight messages on thank-you pages."]
    ),
  },
  {
    slug: "thank-you-experience-organizer",
    title: "Thank You Experience (Organizer)",
    summary: "Publish a thank-you page after the celebration.",
    role: "ORGANIZER",
    category: "CELEBRATE",
    status: "PUBLISHED",
    sortOrder: 31,
    synonyms: ["thank you page builder", "post event"],
    relatedSlugs: ["memory-vault-organizer", "thank-you-experience-guest"],
    posterUrl: "/guides/posters/thank-you-org.svg",
    steps: steps(
      ["Compose thank-you", "Add photos, message, and memory links."],
      ["Publish", "Share with guests after the event."],
      ["Keep memories open", "Leave Memory Vault available as long as you like."]
    ),
  },

  // ── Vendor 32–33 ──
  {
    slug: "vendor-pass",
    title: "Vendor Pass",
    summary: "How vendors use their Celeventic entry pass.",
    role: "VENDOR",
    category: "VENDOR",
    status: "PUBLISHED",
    sortOrder: 32,
    synonyms: ["vendor entry", "my vendor qr"],
    relatedSlugs: ["vendor-team-pass", "scan-vendor"],
    posterUrl: "/guides/posters/vendor-pass.svg",
    steps: steps(
      ["Receive your pass", "The organizer issues a branded vendor pass."],
      ["Arrive with QR", "Present it at staff entry."],
      ["Stay identifiable", "Keep the pass handy for re-entry."]
    ),
  },
  {
    slug: "vendor-team-pass",
    title: "Vendor Team Pass",
    summary: "Team passes for vendor crews working the same event.",
    role: "VENDOR",
    category: "VENDOR",
    status: "PUBLISHED",
    sortOrder: 33,
    synonyms: ["crew pass", "team entry", "assistant pass"],
    relatedSlugs: ["vendor-pass", "vendor-passes-organizer"],
    posterUrl: "/guides/posters/vendor-team.svg",
    steps: steps(
      ["Request team seats", "Ask the organizer for team pass slots."],
      ["Distribute", "Each crew member gets an identity where configured."],
      ["Enter together", "Scan at the vendor gate."]
    ),
  },

  // ── Security / Scanner 34–37 ──
  {
    slug: "scan-guest",
    title: "Scan Guest",
    summary: "Admit individual guests with the scanner.",
    role: "SCANNER",
    category: "SCANNING",
    status: "PUBLISHED",
    sortOrder: 34,
    featured: true,
    synonyms: ["scan pass", "admit guest", "door scanner"],
    contextRoutes: ["/dashboard/qr", "/verify"],
    relatedSlugs: ["scan-group", "qr-admission-organizer"],
    posterUrl: "/guides/posters/scan-guest.svg",
    steps: steps(
      ["Open scanner", "Select the event and camera."],
      ["Align QR", "Hold steady until the result appears."],
      ["Confirm admit", "Watch for already admitted or invalid states."]
    ),
  },
  {
    slug: "scan-group",
    title: "Scan Group",
    summary: "Handle party and group admissions efficiently.",
    role: "SCANNER",
    category: "SCANNING",
    status: "PUBLISHED",
    sortOrder: 35,
    synonyms: ["party scan", "family check-in"],
    relatedSlugs: ["scan-guest", "group-invitations-plus-guests"],
    posterUrl: "/guides/posters/scan-group.svg",
    steps: steps(
      ["Identify the party", "Scan the lead guest or party code."],
      ["Admit members", "Confirm each person in the party."],
      ["Resolve issues", "Escalate duplicates to the organizer."]
    ),
  },
  {
    slug: "scan-vendor",
    title: "Scan Vendor",
    summary: "Validate vendor and staff passes at the gate.",
    role: "SCANNER",
    category: "SCANNING",
    status: "PUBLISHED",
    sortOrder: 36,
    synonyms: ["staff scan", "vendor gate"],
    relatedSlugs: ["vendor-pass", "scan-guest"],
    posterUrl: "/guides/posters/scan-vendor.svg",
    steps: steps(
      ["Switch to vendor mode", "If your scanner supports pass types."],
      ["Scan vendor QR", "Confirm name and role."],
      ["Allow entry", "Direct crews to load-in zones."]
    ),
  },
  {
    slug: "offline-scanning",
    title: "Offline Scanning",
    summary: "Continue admitting guests without live network.",
    role: "SCANNER",
    category: "SCANNING",
    status: "PUBLISHED",
    sortOrder: 37,
    synonyms: ["offline mode scanner", "no signal scan"],
    relatedSlugs: ["offline-admission", "scan-guest"],
    posterUrl: "/guides/posters/offline-scan.svg",
    steps: steps(
      ["Enable offline", "Load the offline pack before doors open."],
      ["Scan as usual", "Results queue locally."],
      ["Sync when online", "Push admissions when signal returns."]
    ),
  },

  // ── Catalog depth: Tickets / Payments / Gifts / Marketplace / Privacy / Troubleshooting ──
  {
    slug: "tickets-overview",
    title: "Tickets Overview",
    summary: "How ticketed entry works alongside QR admission on Celeventic.",
    role: "ORGANIZER",
    category: "TICKETS",
    status: "PUBLISHED",
    sortOrder: 40,
    synonyms: ["sell tickets", "ticket types", "paid entry"],
    relatedSlugs: ["qr-admission-organizer", "payments-overview"],
    posterUrl: "/guides/posters/how-celeventic-works.svg",
    isNew: true,
    steps: steps(
      ["Choose ticketed or invite-only", "Match the mode to your event."],
      ["Configure ticket types", "Set capacity and pricing when enabled."],
      ["Admit with QR", "Tickets still resolve to scannable admission."]
    ),
  },
  {
    slug: "payments-overview",
    title: "Payments Overview",
    summary: "Understand guest payments, payouts, and receipts in Celeventic.",
    role: "ORGANIZER",
    category: "PAYMENTS",
    status: "PUBLISHED",
    sortOrder: 41,
    synonyms: ["payout", "checkout", "payment status"],
    relatedSlugs: ["tickets-overview", "organizer-gifts"],
    posterUrl: "/guides/posters/how-celeventic-works.svg",
    steps: steps(
      ["Enable payment features", "Turn on what your plan supports."],
      ["Track status", "See completed, pending, and failed payments."],
      ["Reconcile safely", "Use receipts and ledger views — never guess."]
    ),
  },
  {
    slug: "guest-gifts",
    title: "Send a Gift",
    summary: "How guests send cash gifts or registry contributions from the invitation.",
    role: "GUEST",
    category: "GIFTS",
    status: "PUBLISHED",
    sortOrder: 42,
    synonyms: ["cash gift", "contribute", "registry gift"],
    relatedSlugs: ["organizer-gifts", "open-your-invitation"],
    contextRoutes: ["/invite"],
    posterUrl: "/guides/posters/welcome.svg",
    isNew: true,
    steps: steps(
      ["Open Gifts", "From your invitation, choose the gifts or contribute action."],
      ["Choose amount", "Pick an amount and add a short note if you like."],
      ["Confirm", "You'll see a receipt when payment succeeds."]
    ),
  },
  {
    slug: "organizer-gifts",
    title: "Gifts & Contributions",
    summary: "Enable guest gifts, monitor contributions, and thank givers.",
    role: "ORGANIZER",
    category: "GIFTS",
    status: "PUBLISHED",
    sortOrder: 43,
    synonyms: ["gift registry", "contributions dashboard"],
    relatedSlugs: ["guest-gifts", "payments-overview"],
    posterUrl: "/guides/posters/how-celeventic-works.svg",
    steps: steps(
      ["Enable gifts", "Turn on gifts for your event."],
      ["Share with guests", "Guests find gifts on the invitation."],
      ["Review & thank", "Track contributions and follow up."]
    ),
  },
  {
    slug: "marketplace-basics",
    title: "Marketplace Basics",
    summary: "Discover vendors and services without leaving Celeventic.",
    role: "ORGANIZER",
    category: "MARKETPLACE",
    status: "PUBLISHED",
    sortOrder: 44,
    synonyms: ["find vendors", "hire vendor", "marketplace"],
    relatedSlugs: ["vendor-passes-organizer", "create-an-event"],
    posterUrl: "/guides/posters/how-celeventic-works.svg",
    steps: steps(
      ["Browse categories", "Photography, catering, décor, and more."],
      ["Shortlist", "Save vendors that fit your event."],
      ["Coordinate", "Connect booking with vendor passes when ready."]
    ),
  },
  {
    slug: "privacy-and-data",
    title: "Privacy & Your Data",
    summary: "What Celeventic stores for invitations, RSVPs, and admission — and your choices.",
    role: "GUEST",
    category: "PRIVACY",
    status: "PUBLISHED",
    sortOrder: 45,
    synonyms: ["data privacy", "personal information", "GDPR"],
    relatedSlugs: ["welcome-to-celeventic"],
    posterUrl: "/guides/posters/welcome.svg",
    steps: steps(
      ["Only what the host needs", "RSVP and admission details stay event-scoped."],
      ["Secure links", "Treat invitation links like tickets — don't reshare blindly."],
      ["Ask the host", "Contact the organizer or support for data requests."]
    ),
  },
  {
    slug: "troubleshoot-invitation-wont-open",
    title: "Invitation Won't Open",
    summary: "Fix common invite link, browser, and media playback issues.",
    role: "GUEST",
    category: "TROUBLESHOOTING",
    status: "PUBLISHED",
    sortOrder: 46,
    synonyms: ["broken invite", "link not working", "won't load"],
    relatedSlugs: ["open-your-invitation"],
    posterUrl: "/guides/posters/invitation.svg",
    steps: steps(
      ["Retry the original link", "Open from WhatsApp, SMS, or email — not a screenshot."],
      ["Try another browser", "Safari or Chrome usually work best."],
      ["Ask the host", "They can resend your personal link."]
    ),
  },
  {
    slug: "troubleshoot-qr-wont-scan",
    title: "QR Won't Scan",
    summary: "Brighten the screen, avoid glare, and keep the code uncropped.",
    role: "GUEST",
    category: "TROUBLESHOOTING",
    status: "PUBLISHED",
    sortOrder: 47,
    synonyms: ["qr failed", "scan error", "admission failed"],
    relatedSlugs: ["your-qr-admission-pass", "scan-guest"],
    posterUrl: "/guides/posters/qr-pass.svg",
    steps: steps(
      ["Raise brightness", "Fill the screen with your QR."],
      ["Hold steady", "Avoid glare and don't crop the code."],
      ["Ask staff", "They can look you up if the camera fails."]
    ),
  },
  {
    slug: "troubleshoot-rsvp-fail",
    title: "RSVP Not Saving",
    summary: "Recover when RSVP submissions fail or seem stuck.",
    role: "GUEST",
    category: "TROUBLESHOOTING",
    status: "PUBLISHED",
    sortOrder: 48,
    synonyms: ["rsvp error", "can't respond"],
    relatedSlugs: ["rsvp"],
    posterUrl: "/guides/posters/rsvp.svg",
    steps: steps(
      ["Check connection", "Submit again on stable wifi or data."],
      ["Refresh the invite", "Reopen the original link."],
      ["Contact the host", "They can update your RSVP manually."]
    ),
  },
  {
    slug: "troubleshoot-seat-not-found",
    title: "Seat Not Found",
    summary: "What to do when your name isn't in seating lookup yet.",
    role: "GUEST",
    category: "TROUBLESHOOTING",
    status: "PUBLISHED",
    sortOrder: 49,
    synonyms: ["no seat", "missing table"],
    relatedSlugs: ["find-your-seat", "event-guide-guest"],
    posterUrl: "/guides/posters/seating.svg",
    steps: steps(
      ["Try alternate spelling", "Search a few letters of your first or last name."],
      ["Check Event Guide", "Seating may publish closer to the event."],
      ["Ask an usher", "Hosts can place you if the chart is still updating."]
    ),
  },
  {
    slug: "troubleshoot-event-guide-unavailable",
    title: "Event Guide Unavailable",
    summary: "When the companion isn't published or the link looks wrong.",
    role: "GUEST",
    category: "TROUBLESHOOTING",
    status: "PUBLISHED",
    sortOrder: 50,
    synonyms: ["guide offline", "companion missing"],
    relatedSlugs: ["event-guide-guest"],
    posterUrl: "/guides/posters/event-guide.svg",
    steps: steps(
      ["Confirm the link", "Use the QR or URL from your host."],
      ["Try later", "Guides may publish closer to event day."],
      ["Ask the host", "They control publish status."]
    ),
  },

  // Admin-only (restricted server-side)
  {
    slug: "admin-guide-manager",
    title: "Managing Celeventic Guide (Admin)",
    summary: "Publish, feature, and archive Learn Celeventic tutorials.",
    role: "ADMIN",
    category: "PLATFORM",
    status: "DRAFT",
    sortOrder: 100,
    adminOnly: true,
    synonyms: ["cms guides", "help admin"],
    steps: steps(
      ["Open /admin/guides", "Create or edit tutorials."],
      ["Set visibility", "Draft, publish, or archive."],
      ["Never expose admin guides", "Public /guide filters adminOnly server-side."]
    ),
  },
];

export const CELEVENTIC_GUIDE_CATALOG = mergeGuideCatalogs(
  CELEVENTIC_GUIDE_CATALOG_BASE,
  GUEST_ZERO_CATALOG_ADDITIONS,
  CELEVENTIC_GUIDE_COMPLETENESS_ADDITIONS
) as GuideCatalogEntry[];

export function getCatalogBySlug(slug: string): GuideCatalogEntry | undefined {
  return CELEVENTIC_GUIDE_CATALOG.find((g) => g.slug === slug);
}

export function catalogRequiresVideoProduction(slug: string): boolean {
  const g = getCatalogBySlug(slug);
  if (!g) return false;
  if (g.videoUrl || g.mp4Url || g.webmUrl || g.mobileVideoUrl) return false;
  return g.videoProductionRequired !== false || (PRIORITY_VIDEO_SLUGS as readonly string[]).includes(slug);
}
