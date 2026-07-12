import type { EventType } from "@prisma/client";
import { FeatureKey } from "./feature-keys";
import type { EventBlueprint, NavItemDef } from "./types";

const BASE_NAV: NavItemDef[] = [
  { id: "workspace", featureKey: FeatureKey.COLLABORATORS, href: (id) => `/dashboard/events/${id}/workspace`, icon: "UsersRound", labelKey: "collaborators", sortOrder: 90 },
  { id: "wallet", featureKey: FeatureKey.EVENT_WALLET, href: (id) => `/dashboard/wallet?eventId=${id}`, icon: "Wallet", labelKey: "event_wallet", sortOrder: 85 },
];

function nav(items: NavItemDef[]): NavItemDef[] {
  return [...items, ...BASE_NAV.filter((b) => !items.some((i) => i.id === b.id))].sort((a, b) => a.sortOrder - b.sortOrder);
}

const WEDDING_TERMINOLOGY: Record<string, string> = {
  overview: "Wedding Overview",
  host: "Couple",
  guests: "Guests",
  guest_list: "Guest List",
  invitations: "Wedding Invitations",
  seating: "Reception Seating",
  vendors: "Wedding Vendors",
  contributions: "Gifts & Contributions",
  registry: "Registry",
  wedding_party: "Wedding Party",
  timeline: "Wedding Timeline",
  gallery: "Wedding Gallery",
  memory_vault: "Memory Vault",
  thank_you: "Thank You Page",
  collaborators: "Collaborators",
  event_wallet: "Event Wallet",
  settings: "Settings",
  dress_code: "Dress Code",
  menu: "Menu",
  venue: "Venue",
  qr_admission: "QR Admission",
  communications: "Communications",
};

const FUNERAL_TERMINOLOGY: Record<string, string> = {
  overview: "Memorial Overview",
  host: "Family",
  guests: "Attendees",
  guest_list: "Guest List",
  invitations: "Funeral Invitation",
  seating: "Seating",
  vendors: "Memorial Vendors",
  contributions: "Condolences & Contributions",
  timeline: "Funeral Schedule",
  gallery: "Memorial Gallery",
  memory_vault: "Memory Vault",
  thank_you: "Thank You Page",
  collaborators: "Collaborators",
  event_wallet: "Event Wallet",
  settings: "Settings",
  obituary: "Obituary",
  family_portal: "Family Portal",
  tribute_wall: "Tribute Wall",
  livestream: "Livestream",
  legacy_archive: "Legacy Archive",
  qr_admission: "QR Attendance",
};

const BIRTHDAY_TERMINOLOGY: Record<string, string> = {
  overview: "Birthday Overview",
  host: "Celebrant",
  guests: "Guests",
  guest_list: "Guest List",
  invitations: "Birthday Invitation",
  seating: "Seating",
  vendors: "Vendors",
  contributions: "Contributions",
  timeline: "Party Timeline",
  gallery: "Party Gallery",
  memory_vault: "Memory Vault",
  thank_you: "Thank You Page",
  collaborators: "Collaborators",
  event_wallet: "Event Wallet",
  settings: "Settings",
  theme: "Party Theme",
  games: "Games",
  gift_list: "Gift List",
  dress_code: "Dress Code",
  menu: "Menu",
  venue: "Venue",
  qr_admission: "QR Admission",
  ticketing: "Tickets",
};

const CONFERENCE_TERMINOLOGY: Record<string, string> = {
  overview: "Conference Overview",
  host: "Organizer",
  guests: "Attendees",
  guest_list: "Attendee List",
  invitations: "Invitations",
  registration: "Registration",
  ticketing: "Tickets",
  speakers: "Speakers",
  sessions: "Sessions",
  agenda: "Agenda",
  sponsors: "Sponsors",
  exhibitors: "Exhibitors",
  vendors: "Vendors",
  analytics: "Analytics",
  communications: "Communications",
  certificates: "Certificates",
  collaborators: "Collaborators",
  event_wallet: "Event Wallet",
  settings: "Settings",
  qr_admission: "QR Check-In",
  venue: "Venue Map",
};

const CONCERT_TERMINOLOGY: Record<string, string> = {
  overview: "Event Overview",
  host: "Promoter",
  guests: "Fans",
  ticketing: "Ticketing",
  ticket_tiers: "Ticket Tiers",
  artists: "Artists",
  timeline: "Schedule",
  stages: "Stages",
  sponsors: "Sponsors",
  vendors: "Vendors",
  staff_passes: "Staff Passes",
  vip_access: "VIP Access",
  communications: "Communications",
  analytics: "Analytics",
  gallery: "Gallery",
  memory_vault: "Memory Vault",
  collaborators: "Collaborators",
  event_wallet: "Event Wallet",
  settings: "Settings",
  qr_admission: "QR Admission",
  venue: "Venue",
};

const WEDDING_BLUEPRINT: EventBlueprint = {
  eventType: "WEDDING",
  label: "Wedding",
  navigation: nav([
    { id: "overview", featureKey: FeatureKey.OVERVIEW, href: (id) => `/dashboard/events/${id}`, icon: "Heart", labelKey: "overview", sortOrder: 0 },
    { id: "invitations", featureKey: FeatureKey.INVITATIONS, href: (id) => `/dashboard/invitations?eventId=${id}`, icon: "Mail", labelKey: "invitations", sortOrder: 2 },
    { id: "guests", featureKey: FeatureKey.GUEST_LIST, href: (id) => `/dashboard/guests?eventId=${id}`, icon: "Users", labelKey: "guest_list", sortOrder: 3 },
    { id: "seating", featureKey: FeatureKey.SEATING, href: (id) => `/dashboard/seating?eventId=${id}`, icon: "Armchair", labelKey: "seating", sortOrder: 4 },
    { id: "timeline", featureKey: FeatureKey.TIMELINE, href: (id) => `/dashboard/events/${id}/workspace?tab=activity`, icon: "Clock", labelKey: "timeline", sortOrder: 5 },
    { id: "vendors", featureKey: FeatureKey.VENDORS, href: (id) => `/dashboard/vendors?eventId=${id}`, icon: "Store", labelKey: "vendors", sortOrder: 6 },
    { id: "contributions", featureKey: FeatureKey.CONTRIBUTIONS, href: (id) => `/dashboard/contributions?eventId=${id}`, icon: "Gift", labelKey: "contributions", sortOrder: 7 },
    { id: "qr", featureKey: FeatureKey.QR_ADMISSION, href: (id) => `/dashboard/qr-admission?eventId=${id}`, icon: "QrCode", labelKey: "qr_admission", sortOrder: 8 },
    { id: "gallery", featureKey: FeatureKey.GALLERY, href: (id) => `/dashboard/events/${id}/memories`, icon: "Image", labelKey: "gallery", sortOrder: 9 },
    { id: "memory", featureKey: FeatureKey.MEMORY_VAULT, href: (id) => `/dashboard/events/${id}/memories`, icon: "Heart", labelKey: "memory_vault", sortOrder: 10 },
    { id: "thankyou", featureKey: FeatureKey.THANK_YOU, href: (id) => `/dashboard/events/${id}/thank-you`, icon: "Sparkles", labelKey: "thank_you", sortOrder: 11 },
    { id: "communications", featureKey: FeatureKey.COMMUNICATIONS, href: (id) => `/dashboard/campaigns?eventId=${id}`, icon: "MessageSquare", labelKey: "communications", sortOrder: 12 },
  ]),
  requiredFields: ["title", "hostName", "startDate", "eventType"],
  defaultModules: [FeatureKey.OVERVIEW, FeatureKey.INVITATIONS, FeatureKey.GUEST_LIST, FeatureKey.RSVP, FeatureKey.QR_ADMISSION, FeatureKey.GALLERY, FeatureKey.COLLABORATORS, FeatureKey.SETTINGS],
  optionalModules: [FeatureKey.SEATING, FeatureKey.CONTRIBUTIONS, FeatureKey.MEMORY_VAULT, FeatureKey.THANK_YOU, FeatureKey.EVENT_WALLET, FeatureKey.DESIGN_STUDIO, FeatureKey.ANALYTICS, FeatureKey.VENDORS, FeatureKey.WEDDING_PARTY, FeatureKey.REGISTRY, FeatureKey.TIMELINE, FeatureKey.COMMUNICATIONS],
  hiddenModules: [FeatureKey.OBITUARY, FeatureKey.TRIBUTE_WALL, FeatureKey.LIVESTREAM, FeatureKey.LEGACY_ARCHIVE, FeatureKey.FUNERAL_SCHEDULE, FeatureKey.FAMILY_PORTAL, FeatureKey.SPEAKERS, FeatureKey.SESSIONS, FeatureKey.CERTIFICATES, FeatureKey.EXHIBITORS, FeatureKey.ARTISTS, FeatureKey.STAGES, FeatureKey.STAFF_PASSES, FeatureKey.GAMES],
  templateCategories: ["Luxury Wedding", "Traditional Wedding", "Floral Wedding", "Kente Wedding", "Passport Wedding", "Royal Wedding", "Minimal Wedding", "Nikkah Wedding", "Destination Wedding", "Acrylic Wedding"],
  vendorCategories: ["Wedding Planners", "Venues", "Photographers", "Videographers", "Caterers", "Decorators", "DJs", "MCs", "Makeup Artists", "Fashion Designers", "Florists", "Cake Designers", "Transportation", "Live Bands"],
  defaultSections: ["couple", "ceremony", "reception", "rsvp"],
  analyticsWidgets: ["rsvp_rate", "guest_count", "contributions", "qr_scans"],
  terminology: WEDDING_TERMINOLOGY,
  starterFeatures: [FeatureKey.OVERVIEW, FeatureKey.INVITATIONS, FeatureKey.GUEST_LIST, FeatureKey.RSVP, FeatureKey.QR_ADMISSION, FeatureKey.GALLERY],
  premiumFeatures: [FeatureKey.SEATING, FeatureKey.CONTRIBUTIONS, FeatureKey.THANK_YOU, FeatureKey.VENDORS, FeatureKey.COMMUNICATIONS],
  eliteFeatures: [FeatureKey.DESIGN_STUDIO, FeatureKey.MEMORY_VAULT, FeatureKey.EVENT_WALLET, FeatureKey.ANALYTICS, FeatureKey.COLLABORATORS],
};

const FUNERAL_BLUEPRINT: EventBlueprint = {
  eventType: "FUNERAL",
  label: "Funeral / Memorial",
  navigation: nav([
    { id: "overview", featureKey: FeatureKey.OVERVIEW, href: (id) => `/dashboard/events/${id}`, icon: "Flower2", labelKey: "overview", sortOrder: 0 },
    { id: "funeral", featureKey: FeatureKey.FAMILY_PORTAL, href: (id) => `/dashboard/funeral?eventId=${id}`, icon: "Heart", labelKey: "family_portal", sortOrder: 1 },
    { id: "invitations", featureKey: FeatureKey.INVITATIONS, href: (id) => `/dashboard/invitations?eventId=${id}`, icon: "Mail", labelKey: "invitations", sortOrder: 3 },
    { id: "guests", featureKey: FeatureKey.GUEST_LIST, href: (id) => `/dashboard/guests?eventId=${id}`, icon: "Users", labelKey: "guest_list", sortOrder: 4 },
    { id: "tributes", featureKey: FeatureKey.TRIBUTE_WALL, href: (id) => `/dashboard/funeral?eventId=${id}`, icon: "MessageSquare", labelKey: "tribute_wall", sortOrder: 5 },
    { id: "contributions", featureKey: FeatureKey.CONTRIBUTIONS, href: (id) => `/dashboard/contributions?eventId=${id}`, icon: "Gift", labelKey: "contributions", sortOrder: 6 },
    { id: "livestream", featureKey: FeatureKey.LIVESTREAM, href: (id) => `/dashboard/funeral?eventId=${id}`, icon: "Video", labelKey: "livestream", sortOrder: 7 },
    { id: "seating", featureKey: FeatureKey.SEATING, href: (id) => `/dashboard/seating?eventId=${id}`, icon: "Armchair", labelKey: "seating", sortOrder: 8 },
    { id: "qr", featureKey: FeatureKey.QR_ADMISSION, href: (id) => `/dashboard/qr-admission?eventId=${id}`, icon: "QrCode", labelKey: "qr_admission", sortOrder: 9 },
    { id: "gallery", featureKey: FeatureKey.GALLERY, href: (id) => `/dashboard/events/${id}/memories`, icon: "Image", labelKey: "gallery", sortOrder: 10 },
    { id: "legacy", featureKey: FeatureKey.LEGACY_ARCHIVE, href: (id) => `/dashboard/funeral?eventId=${id}`, icon: "Archive", labelKey: "legacy_archive", sortOrder: 11 },
    { id: "memory", featureKey: FeatureKey.MEMORY_VAULT, href: (id) => `/dashboard/events/${id}/memories`, icon: "Heart", labelKey: "memory_vault", sortOrder: 12 },
    { id: "thankyou", featureKey: FeatureKey.THANK_YOU, href: (id) => `/dashboard/events/${id}/thank-you`, icon: "Sparkles", labelKey: "thank_you", sortOrder: 13 },
    { id: "vendors", featureKey: FeatureKey.VENDORS, href: (id) => `/dashboard/vendors?eventId=${id}`, icon: "Store", labelKey: "vendors", sortOrder: 14 },
  ]),
  requiredFields: ["title", "hostName", "startDate", "eventType"],
  defaultModules: [FeatureKey.OVERVIEW, FeatureKey.INVITATIONS, FeatureKey.GUEST_LIST, FeatureKey.OBITUARY, FeatureKey.FAMILY_PORTAL, FeatureKey.TRIBUTE_WALL, FeatureKey.QR_ADMISSION, FeatureKey.COLLABORATORS],
  optionalModules: [FeatureKey.CONTRIBUTIONS, FeatureKey.LIVESTREAM, FeatureKey.SEATING, FeatureKey.MEMORY_VAULT, FeatureKey.LEGACY_ARCHIVE, FeatureKey.THANK_YOU, FeatureKey.EVENT_WALLET, FeatureKey.VENDORS],
  hiddenModules: [FeatureKey.COUPLE_PROFILE, FeatureKey.WEDDING_PARTY, FeatureKey.REGISTRY, FeatureKey.GAMES, FeatureKey.GIFT_LIST, FeatureKey.SPEAKERS, FeatureKey.CERTIFICATES, FeatureKey.ARTISTS, FeatureKey.TICKET_TIERS, FeatureKey.STAFF_PASSES],
  templateCategories: ["Classic Memorial", "Celebration of Life", "Traditional Funeral", "Christian Funeral", "Islamic Janazah", "Military Tribute", "Royal Memorial", "Minimal Memorial", "Candlelight Tribute"],
  vendorCategories: ["Funeral Homes", "Funeral Coordinators", "Caterers", "Decorators", "Choirs", "Musicians", "Tent Providers", "Transport", "Photographers", "Videographers", "Livestream Providers"],
  defaultSections: ["obituary", "schedule", "tributes", "family"],
  analyticsWidgets: ["attendance", "tributes", "contributions", "qr_scans"],
  terminology: FUNERAL_TERMINOLOGY,
  starterFeatures: [FeatureKey.OVERVIEW, FeatureKey.INVITATIONS, FeatureKey.GUEST_LIST, FeatureKey.OBITUARY, FeatureKey.TRIBUTE_WALL, FeatureKey.QR_ADMISSION],
  premiumFeatures: [FeatureKey.CONTRIBUTIONS, FeatureKey.LIVESTREAM, FeatureKey.SEATING, FeatureKey.THANK_YOU],
  eliteFeatures: [FeatureKey.MEMORY_VAULT, FeatureKey.LEGACY_ARCHIVE, FeatureKey.EVENT_WALLET, FeatureKey.COLLABORATORS],
};

const BIRTHDAY_BLUEPRINT: EventBlueprint = {
  eventType: "BIRTHDAY",
  label: "Birthday",
  navigation: nav([
    { id: "overview", featureKey: FeatureKey.OVERVIEW, href: (id) => `/dashboard/events/${id}`, icon: "Cake", labelKey: "overview", sortOrder: 0 },
    { id: "invitations", featureKey: FeatureKey.INVITATIONS, href: (id) => `/dashboard/invitations?eventId=${id}`, icon: "Mail", labelKey: "invitations", sortOrder: 1 },
    { id: "guests", featureKey: FeatureKey.GUEST_LIST, href: (id) => `/dashboard/guests?eventId=${id}`, icon: "Users", labelKey: "guest_list", sortOrder: 2 },
    { id: "ticketing", featureKey: FeatureKey.TICKETING, href: (id) => `/dashboard/tickets?eventId=${id}`, icon: "Ticket", labelKey: "ticketing", sortOrder: 3 },
    { id: "theme", featureKey: FeatureKey.THEME, href: (id) => `/dashboard/invitations?eventId=${id}`, icon: "Palette", labelKey: "theme", sortOrder: 4 },
    { id: "vendors", featureKey: FeatureKey.VENDORS, href: (id) => `/dashboard/vendors?eventId=${id}`, icon: "Store", labelKey: "vendors", sortOrder: 5 },
    { id: "qr", featureKey: FeatureKey.QR_ADMISSION, href: (id) => `/dashboard/qr-admission?eventId=${id}`, icon: "QrCode", labelKey: "qr_admission", sortOrder: 6 },
    { id: "gallery", featureKey: FeatureKey.GALLERY, href: (id) => `/dashboard/events/${id}/memories`, icon: "Image", labelKey: "gallery", sortOrder: 7 },
    { id: "memory", featureKey: FeatureKey.MEMORY_VAULT, href: (id) => `/dashboard/events/${id}/memories`, icon: "Heart", labelKey: "memory_vault", sortOrder: 8 },
    { id: "thankyou", featureKey: FeatureKey.THANK_YOU, href: (id) => `/dashboard/events/${id}/thank-you`, icon: "Sparkles", labelKey: "thank_you", sortOrder: 9 },
  ]),
  requiredFields: ["title", "hostName", "startDate", "eventType"],
  defaultModules: [FeatureKey.OVERVIEW, FeatureKey.INVITATIONS, FeatureKey.GUEST_LIST, FeatureKey.RSVP, FeatureKey.QR_ADMISSION, FeatureKey.GALLERY, FeatureKey.COLLABORATORS],
  optionalModules: [FeatureKey.TICKETING, FeatureKey.THEME, FeatureKey.GAMES, FeatureKey.GIFT_LIST, FeatureKey.MEMORY_VAULT, FeatureKey.THANK_YOU, FeatureKey.VENDORS, FeatureKey.EVENT_WALLET],
  hiddenModules: [FeatureKey.OBITUARY, FeatureKey.TRIBUTE_WALL, FeatureKey.LIVESTREAM, FeatureKey.LEGACY_ARCHIVE, FeatureKey.SPEAKERS, FeatureKey.CERTIFICATES, FeatureKey.WEDDING_PARTY, FeatureKey.REGISTRY],
  templateCategories: ["Kids Birthday", "Adult Birthday", "Milestone Birthday", "Themed Party", "Surprise Party", "Elegant Birthday"],
  vendorCategories: ["Caterers", "Decorators", "DJs", "Photographers", "Cake Designers", "Entertainment", "Venues"],
  defaultSections: ["celebrant", "theme", "rsvp"],
  analyticsWidgets: ["rsvp_rate", "guest_count", "qr_scans"],
  terminology: BIRTHDAY_TERMINOLOGY,
  starterFeatures: [FeatureKey.OVERVIEW, FeatureKey.INVITATIONS, FeatureKey.GUEST_LIST, FeatureKey.RSVP, FeatureKey.QR_ADMISSION, FeatureKey.GALLERY],
  premiumFeatures: [FeatureKey.THEME, FeatureKey.VENDORS, FeatureKey.THANK_YOU, FeatureKey.TICKETING],
  eliteFeatures: [FeatureKey.MEMORY_VAULT, FeatureKey.EVENT_WALLET, FeatureKey.GAMES, FeatureKey.GIFT_LIST],
};

const CONFERENCE_BLUEPRINT: EventBlueprint = {
  eventType: "CONFERENCE",
  label: "Conference",
  navigation: nav([
    { id: "overview", featureKey: FeatureKey.OVERVIEW, href: (id) => `/dashboard/events/${id}`, icon: "Presentation", labelKey: "overview", sortOrder: 0 },
    { id: "registration", featureKey: FeatureKey.REGISTRATION, href: (id) => `/dashboard/guests?eventId=${id}`, icon: "UserPlus", labelKey: "registration", sortOrder: 1 },
    { id: "ticketing", featureKey: FeatureKey.TICKETING, href: (id) => `/dashboard/tickets?eventId=${id}`, icon: "Ticket", labelKey: "ticketing", sortOrder: 2 },
    { id: "guests", featureKey: FeatureKey.GUEST_LIST, href: (id) => `/dashboard/guests?eventId=${id}`, icon: "Users", labelKey: "guest_list", sortOrder: 3 },
    { id: "agenda", featureKey: FeatureKey.AGENDA, href: (id) => `/dashboard/events/${id}/workspace?tab=tasks`, icon: "Calendar", labelKey: "agenda", sortOrder: 4 },
    { id: "communications", featureKey: FeatureKey.COMMUNICATIONS, href: (id) => `/dashboard/campaigns?eventId=${id}`, icon: "MessageSquare", labelKey: "communications", sortOrder: 5 },
    { id: "qr", featureKey: FeatureKey.QR_ADMISSION, href: (id) => `/dashboard/qr-admission?eventId=${id}`, icon: "QrCode", labelKey: "qr_admission", sortOrder: 6 },
    { id: "analytics", featureKey: FeatureKey.ANALYTICS, href: (id) => `/dashboard/events/${id}/workspace?tab=activity`, icon: "BarChart3", labelKey: "analytics", sortOrder: 7 },
    { id: "vendors", featureKey: FeatureKey.VENDORS, href: (id) => `/dashboard/vendors?eventId=${id}`, icon: "Store", labelKey: "vendors", sortOrder: 8 },
  ]),
  requiredFields: ["title", "hostName", "startDate", "eventType"],
  defaultModules: [FeatureKey.OVERVIEW, FeatureKey.REGISTRATION, FeatureKey.TICKETING, FeatureKey.GUEST_LIST, FeatureKey.QR_ADMISSION, FeatureKey.COLLABORATORS],
  optionalModules: [FeatureKey.AGENDA, FeatureKey.SPEAKERS, FeatureKey.SESSIONS, FeatureKey.SPONSORS, FeatureKey.EXHIBITORS, FeatureKey.CERTIFICATES, FeatureKey.ANALYTICS, FeatureKey.COMMUNICATIONS, FeatureKey.EVENT_WALLET],
  hiddenModules: [FeatureKey.OBITUARY, FeatureKey.TRIBUTE_WALL, FeatureKey.WEDDING_PARTY, FeatureKey.REGISTRY, FeatureKey.GAMES, FeatureKey.COUPLE_PROFILE],
  templateCategories: ["Corporate Conference", "Tech Summit", "Academic Conference", "Workshop", "Seminar", "Hybrid Conference"],
  vendorCategories: ["AV Equipment", "Catering", "Venues", "Signage", "Livestream", "Security", "Registration Services"],
  defaultSections: ["agenda", "speakers", "registration"],
  analyticsWidgets: ["registrations", "attendance", "session_engagement", "qr_scans"],
  terminology: CONFERENCE_TERMINOLOGY,
  starterFeatures: [FeatureKey.OVERVIEW, FeatureKey.REGISTRATION, FeatureKey.TICKETING, FeatureKey.GUEST_LIST, FeatureKey.QR_ADMISSION],
  premiumFeatures: [FeatureKey.AGENDA, FeatureKey.COMMUNICATIONS, FeatureKey.ANALYTICS],
  eliteFeatures: [FeatureKey.CERTIFICATES, FeatureKey.SPONSORS, FeatureKey.EXHIBITORS, FeatureKey.EVENT_WALLET, FeatureKey.COLLABORATORS],
};

const CONCERT_BLUEPRINT: EventBlueprint = {
  eventType: "CONCERT",
  label: "Concert",
  navigation: nav([
    { id: "overview", featureKey: FeatureKey.OVERVIEW, href: (id) => `/dashboard/events/${id}`, icon: "Music", labelKey: "overview", sortOrder: 0 },
    { id: "ticketing", featureKey: FeatureKey.TICKETING, href: (id) => `/dashboard/tickets?eventId=${id}`, icon: "Ticket", labelKey: "ticketing", sortOrder: 1 },
    { id: "tiers", featureKey: FeatureKey.TICKET_TIERS, href: (id) => `/dashboard/tickets?eventId=${id}`, icon: "Layers", labelKey: "ticket_tiers", sortOrder: 2 },
    { id: "artists", featureKey: FeatureKey.ARTISTS, href: (id) => `/dashboard/events/${id}/workspace?tab=tasks`, icon: "Mic", labelKey: "artists", sortOrder: 3 },
    { id: "timeline", featureKey: FeatureKey.TIMELINE, href: (id) => `/dashboard/events/${id}/workspace?tab=activity`, icon: "Clock", labelKey: "timeline", sortOrder: 4 },
    { id: "qr", featureKey: FeatureKey.QR_ADMISSION, href: (id) => `/dashboard/qr-admission?eventId=${id}`, icon: "QrCode", labelKey: "qr_admission", sortOrder: 5 },
    { id: "staff", featureKey: FeatureKey.STAFF_PASSES, href: (id) => `/dashboard/qr-admission?eventId=${id}`, icon: "BadgeCheck", labelKey: "staff_passes", sortOrder: 6 },
    { id: "vip", featureKey: FeatureKey.VIP_ACCESS, href: (id) => `/dashboard/tickets?eventId=${id}`, icon: "Star", labelKey: "vip_access", sortOrder: 7 },
    { id: "communications", featureKey: FeatureKey.COMMUNICATIONS, href: (id) => `/dashboard/campaigns?eventId=${id}`, icon: "MessageSquare", labelKey: "communications", sortOrder: 8 },
    { id: "analytics", featureKey: FeatureKey.ANALYTICS, href: (id) => `/dashboard/events/${id}/workspace?tab=activity`, icon: "BarChart3", labelKey: "analytics", sortOrder: 9 },
    { id: "vendors", featureKey: FeatureKey.VENDORS, href: (id) => `/dashboard/vendors?eventId=${id}`, icon: "Store", labelKey: "vendors", sortOrder: 10 },
    { id: "memory", featureKey: FeatureKey.MEMORY_VAULT, href: (id) => `/dashboard/events/${id}/memories`, icon: "Heart", labelKey: "memory_vault", sortOrder: 11 },
  ]),
  requiredFields: ["title", "hostName", "startDate", "eventType"],
  defaultModules: [FeatureKey.OVERVIEW, FeatureKey.TICKETING, FeatureKey.QR_ADMISSION, FeatureKey.COLLABORATORS],
  optionalModules: [FeatureKey.TICKET_TIERS, FeatureKey.ARTISTS, FeatureKey.STAGES, FeatureKey.STAFF_PASSES, FeatureKey.VIP_ACCESS, FeatureKey.ANALYTICS, FeatureKey.MEMORY_VAULT, FeatureKey.EVENT_WALLET],
  hiddenModules: [FeatureKey.OBITUARY, FeatureKey.WEDDING_PARTY, FeatureKey.REGISTRY, FeatureKey.CERTIFICATES, FeatureKey.SPEAKERS, FeatureKey.GAMES],
  templateCategories: ["Stadium Concert", "Club Show", "Festival Stage", "Acoustic Session", "Arena Tour"],
  vendorCategories: ["Sound Engineers", "Lighting", "Security", "Staging", "Merchandise", "Catering", "Transport"],
  defaultSections: ["lineup", "schedule", "tickets"],
  analyticsWidgets: ["tickets_sold", "revenue", "qr_scans", "attendance"],
  terminology: CONCERT_TERMINOLOGY,
  starterFeatures: [FeatureKey.OVERVIEW, FeatureKey.TICKETING, FeatureKey.QR_ADMISSION],
  premiumFeatures: [FeatureKey.TICKET_TIERS, FeatureKey.ARTISTS, FeatureKey.COMMUNICATIONS],
  eliteFeatures: [FeatureKey.STAFF_PASSES, FeatureKey.VIP_ACCESS, FeatureKey.ANALYTICS, FeatureKey.MEMORY_VAULT, FeatureKey.EVENT_WALLET],
};

const FESTIVAL_BLUEPRINT: EventBlueprint = {
  ...CONCERT_BLUEPRINT,
  eventType: "FESTIVAL",
  label: "Festival",
  navigation: nav([
    { id: "overview", featureKey: FeatureKey.OVERVIEW, href: (id) => `/dashboard/events/${id}`, icon: "Tent", labelKey: "overview", sortOrder: 0 },
    { id: "ticketing", featureKey: FeatureKey.TICKETING, href: (id) => `/dashboard/tickets?eventId=${id}`, icon: "Ticket", labelKey: "ticketing", sortOrder: 1 },
    { id: "stages", featureKey: FeatureKey.STAGES, href: (id) => `/dashboard/events/${id}/workspace?tab=tasks`, icon: "Map", labelKey: "stages", sortOrder: 2 },
    { id: "artists", featureKey: FeatureKey.ARTISTS, href: (id) => `/dashboard/events/${id}/workspace?tab=tasks`, icon: "Mic", labelKey: "artists", sortOrder: 3 },
    { id: "qr", featureKey: FeatureKey.QR_ADMISSION, href: (id) => `/dashboard/qr-admission?eventId=${id}`, icon: "QrCode", labelKey: "qr_admission", sortOrder: 4 },
    { id: "vendors", featureKey: FeatureKey.VENDORS, href: (id) => `/dashboard/vendors?eventId=${id}`, icon: "Store", labelKey: "vendors", sortOrder: 5 },
    { id: "memory", featureKey: FeatureKey.MEMORY_VAULT, href: (id) => `/dashboard/events/${id}/memories`, icon: "Heart", labelKey: "memory_vault", sortOrder: 6 },
  ]),
  templateCategories: ["Music Festival", "Food Festival", "Cultural Festival", "Arts Festival"],
  vendorCategories: ["Food Vendors", "Merchandise", "Security", "Staging", "Sanitation", "Medical"],
};

const GENERIC_BLUEPRINT: EventBlueprint = {
  eventType: "CUSTOM",
  label: "Event",
  navigation: nav([
    { id: "overview", featureKey: FeatureKey.OVERVIEW, href: (id) => `/dashboard/events/${id}`, icon: "Calendar", labelKey: "overview", sortOrder: 0 },
    { id: "invitations", featureKey: FeatureKey.INVITATIONS, href: (id) => `/dashboard/invitations?eventId=${id}`, icon: "Mail", labelKey: "invitations", sortOrder: 1 },
    { id: "guests", featureKey: FeatureKey.GUEST_LIST, href: (id) => `/dashboard/guests?eventId=${id}`, icon: "Users", labelKey: "guest_list", sortOrder: 2 },
    { id: "ticketing", featureKey: FeatureKey.TICKETING, href: (id) => `/dashboard/tickets?eventId=${id}`, icon: "Ticket", labelKey: "ticketing", sortOrder: 3 },
    { id: "qr", featureKey: FeatureKey.QR_ADMISSION, href: (id) => `/dashboard/qr-admission?eventId=${id}`, icon: "QrCode", labelKey: "qr_admission", sortOrder: 4 },
    { id: "communications", featureKey: FeatureKey.COMMUNICATIONS, href: (id) => `/dashboard/campaigns?eventId=${id}`, icon: "MessageSquare", labelKey: "communications", sortOrder: 5 },
    { id: "vendors", featureKey: FeatureKey.VENDORS, href: (id) => `/dashboard/vendors?eventId=${id}`, icon: "Store", labelKey: "vendors", sortOrder: 6 },
    { id: "memory", featureKey: FeatureKey.MEMORY_VAULT, href: (id) => `/dashboard/events/${id}/memories`, icon: "Heart", labelKey: "memory_vault", sortOrder: 7 },
  ]),
  requiredFields: ["title", "hostName", "startDate", "eventType"],
  defaultModules: [FeatureKey.OVERVIEW, FeatureKey.INVITATIONS, FeatureKey.GUEST_LIST, FeatureKey.QR_ADMISSION, FeatureKey.COLLABORATORS, FeatureKey.SETTINGS],
  optionalModules: [FeatureKey.TICKETING, FeatureKey.SEATING, FeatureKey.MEMORY_VAULT, FeatureKey.EVENT_WALLET, FeatureKey.VENDORS, FeatureKey.ANALYTICS],
  hiddenModules: [],
  templateCategories: ["General", "Universal"],
  vendorCategories: ["Catering", "Photography", "Decoration", "Venue", "Transport", "Security"],
  defaultSections: ["details", "rsvp"],
  analyticsWidgets: ["guest_count", "qr_scans"],
  terminology: {
    overview: "Event Overview",
    host: "Host",
    guests: "Guests",
    guest_list: "Guest List",
    invitations: "Invitations",
    ticketing: "Tickets",
    collaborators: "Collaborators",
    event_wallet: "Event Wallet",
    settings: "Settings",
    qr_admission: "QR Admission",
    memory_vault: "Memory Vault",
    vendors: "Vendors",
    communications: "Communications",
  },
  starterFeatures: [FeatureKey.OVERVIEW, FeatureKey.INVITATIONS, FeatureKey.GUEST_LIST, FeatureKey.QR_ADMISSION],
  premiumFeatures: [FeatureKey.TICKETING, FeatureKey.SEATING, FeatureKey.COMMUNICATIONS],
  eliteFeatures: [FeatureKey.MEMORY_VAULT, FeatureKey.EVENT_WALLET, FeatureKey.ANALYTICS],
};

const REGISTRY: Record<string, EventBlueprint> = {
  WEDDING: WEDDING_BLUEPRINT,
  FUNERAL: FUNERAL_BLUEPRINT,
  BIRTHDAY: BIRTHDAY_BLUEPRINT,
  CONFERENCE: CONFERENCE_BLUEPRINT,
  CONCERT: CONCERT_BLUEPRINT,
  FESTIVAL: FESTIVAL_BLUEPRINT,
  CORPORATE_EVENT: { ...CONFERENCE_BLUEPRINT, eventType: "CORPORATE_EVENT", label: "Corporate Event" },
  CHURCH_PROGRAM: { ...GENERIC_BLUEPRINT, eventType: "CHURCH_PROGRAM", label: "Church Event" },
  SCHOOL_EVENT: { ...GENERIC_BLUEPRINT, eventType: "SCHOOL_EVENT", label: "School Event" },
  PRODUCT_LAUNCH: { ...CONFERENCE_BLUEPRINT, eventType: "PRODUCT_LAUNCH", label: "Product Launch" },
  PRIVATE_EVENT: { ...GENERIC_BLUEPRINT, eventType: "PRIVATE_EVENT", label: "Private Party" },
  CUSTOM: GENERIC_BLUEPRINT,
};

export function getBlueprint(eventType: EventType | string): EventBlueprint {
  return REGISTRY[eventType] ?? GENERIC_BLUEPRINT;
}

export function getAllBlueprints(): EventBlueprint[] {
  return Object.values(REGISTRY);
}

export function isModuleHidden(eventType: EventType | string, featureKey: string): boolean {
  const bp = getBlueprint(eventType);
  return bp.hiddenModules.includes(featureKey as never);
}

export function getTemplateCategoriesForEventType(eventType: EventType | string): string[] {
  return getBlueprint(eventType).templateCategories;
}

export function getVendorCategoriesForEventType(eventType: EventType | string): string[] {
  return getBlueprint(eventType).vendorCategories;
}

export function getTerminology(eventType: EventType | string, key: string): string {
  const bp = getBlueprint(eventType);
  return bp.terminology[key] ?? key.replace(/_/g, " ");
}
