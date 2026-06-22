export const APP_NAME = "Celeventic";
export const APP_TAGLINE = "The Intelligent Event Operating System";
export const BRAND_TAGLINE = "THE INTELLIGENT EVENT OPERATING SYSTEM";
export const BRAND_MOTTO = "Celebrate • Event • Ticket";
export const BRAND_MESSAGE = "Celebrate every moment. Manage every event. Sell every ticket.";
export const COMPANY_NAME = "AGI";

export const BRAND = {
  primary: "#0B8A83",
  primaryLight: "#0FA8A0",
  secondary: "#D4A63A",
  primaryDark: "#097068",
  accent: "#FF6B57",
  ivory: "#FAF8F4",
  midnight: "#0F172A",
} as const;

export const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"] as const;

export const EVENT_TYPES = [
  { value: "WEDDING", label: "Wedding" },
  { value: "FUNERAL", label: "Funeral" },
  { value: "BIRTHDAY", label: "Birthday" },
  { value: "CONFERENCE", label: "Conference" },
  { value: "CHURCH_PROGRAM", label: "Church Program" },
  { value: "CORPORATE_EVENT", label: "Corporate Event" },
  { value: "CONCERT", label: "Concert" },
  { value: "FESTIVAL", label: "Festival" },
  { value: "SCHOOL_EVENT", label: "School Event" },
  { value: "PRODUCT_LAUNCH", label: "Product Launch" },
  { value: "PRIVATE_EVENT", label: "Private Event" },
  { value: "CUSTOM", label: "Custom" },
] as const;

export const TICKET_TYPES = [
  { value: "FREE", label: "Free" },
  { value: "PAID", label: "Paid" },
  { value: "VIP", label: "VIP" },
  { value: "VVIP", label: "VVIP" },
  { value: "GROUP", label: "Group" },
  { value: "TABLE", label: "Table" },
] as const;

export const GUEST_TIERS = [50, 100, 150, 200, 500, 1000, 5000] as const;

export const VENDOR_CATEGORIES = [
  "Catering",
  "DJ",
  "Photography",
  "Decoration",
  "Venue",
  "Transport",
  "Security",
  "MC",
] as const;

export const INSPIRATION_UPGRADES = [
  { value: "INSPIRED", label: "Inspired" },
  { value: "SIMILAR", label: "Similar Style" },
  { value: "LUXURY", label: "Luxury" },
  { value: "IMPROVED", label: "Improved" },
  { value: "MODERN", label: "Modern" },
  { value: "TRADITIONAL_GHANAIAN", label: "Traditional Ghanaian" },
] as const;
