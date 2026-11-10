/**
 * Admin catalog of CeleYou services. Status is filled at runtime.
 * Copy is for administrators, not guest-facing pages.
 */

export type CeleYouAdminServiceStatus = "ready" | "attention" | "blocked";

export type CeleYouAdminServiceId =
  | "unique-share"
  | "smart-qr"
  | "nfc-tap"
  | "tap-to-connect"
  | "public-profile"
  | "save-contact"
  | "paid-activation"
  | "multi-card"
  | "complimentary"
  | "lifecycle"
  | "concierge"
  | "connections"
  | "privacy"
  | "templates"
  | "analytics";

export type CeleYouAdminServiceDef = {
  id: CeleYouAdminServiceId;
  title: string;
  summary: string;
  requires: string[];
  adminNeeds: string[];
  href: string;
  hrefLabel: string;
};

export const CELEYOU_ADMIN_SERVICES: readonly CeleYouAdminServiceDef[] = [
  {
    id: "unique-share",
    title: "Unique share identity",
    summary: "Every card has its own public URL, Smart QR token, and NFC token. Recipients never share one link across plates.",
    requires: ["Live share origin", "Unique slug", "Unique public token"],
    adminNeeds: ["Inspect URL and tokens on the card record", "Create extra cards for a paid holder"],
    href: "/admin/celecard",
    hrefLabel: "Open directory",
  },
  {
    id: "smart-qr",
    title: "Smart QR",
    summary: "Camera-safe QR encodes the live /c/{token} URL with the official CeleYou mark in the centre.",
    requires: ["QR image API", "Live share origin", "Official mark artwork"],
    adminNeeds: ["Preview the QR from the directory", "Confirm the payload uses celeventic.com"],
    href: "/admin/celecard",
    hrefLabel: "Preview QR",
  },
  {
    id: "nfc-tap",
    title: "NFC tap",
    summary: "Physical cards open /n/{token}. Each plate has its own device token, never the QR token.",
    requires: ["NFC device registry", "Unique tap token"],
    adminNeeds: ["Mint or replace a device from the card record", "Coverage of cards missing a tap token"],
    href: "/admin/celecard",
    hrefLabel: "Card records",
  },
  {
    id: "tap-to-connect",
    title: "Tap to Connect",
    summary: "Owner pairing uses a session QR on the current host. Recipients still land on the public CeleYou.",
    requires: ["Proximity sessions", "Current app host"],
    adminNeeds: ["Support owners from studio Tap to Connect", "Do not encode localhost into guest QR"],
    href: "/dashboard/business-card",
    hrefLabel: "Open studio",
  },
  {
    id: "public-profile",
    title: "Public profile",
    summary: "Guests open the plate in any browser with no app and no account. Suspended or deleted cards stay unavailable.",
    requires: ["Published flag", "Not suspended", "Shareable lifecycle"],
    adminNeeds: ["Activate, deactivate, or suspend with a written reason"],
    href: "/admin/celecard",
    hrefLabel: "Manage cards",
  },
  {
    id: "save-contact",
    title: "Save contact",
    summary: "Guests download a vCard from the public plate. Contact details follow privacy and reach settings.",
    requires: ["Guest-shareable card", "vCard export"],
    adminNeeds: ["Confirm the public plate exposes only intended reach"],
    href: "/admin/celecard",
    hrefLabel: "Open a card",
  },
  {
    id: "paid-activation",
    title: "Paid activation",
    summary: "Live users pay through Paystack. A paid term cannot be cancelled or renewed until it ends.",
    requires: ["Paystack secret", "Paystack public key", "Plan catalog"],
    adminNeeds: ["Confirm Paystack is connected", "Edit plan prices as super admin", "Never rewrite payment history"],
    href: "/dashboard/business-card/billing",
    hrefLabel: "Holder billing",
  },
  {
    id: "multi-card",
    title: "Multiple cards, one term",
    summary: "Extra cards on the same account inherit the current paid window. Each keeps unique QR, URL, and NFC.",
    requires: ["Account entitlement", "Unique identity per card"],
    adminNeeds: ["Create another plate for a paid holder without a second charge"],
    href: "/admin/celecard/new",
    hrefLabel: "Create CeleYou",
  },
  {
    id: "complimentary",
    title: "Admin complimentary",
    summary: "Only platform admins can activate a card for any user without Paystack. Organizers cannot.",
    requires: ["ADMIN or SUPER_ADMIN", "Written reason of at least 8 characters"],
    adminNeeds: ["Grant complimentary, promotional, or manual terms from the card record"],
    href: "/admin/celecard/new",
    hrefLabel: "Assign activation",
  },
  {
    id: "lifecycle",
    title: "Lifecycle and reminders",
    summary: "Trial, live, expiring, grace, then courtesy. Expiry is written by the renewal job, not by the owner.",
    requires: ["Lifecycle policy", "Reminder offsets", "Timezone Africa/Accra"],
    adminNeeds: ["Adjust grace and reminder windows", "Watch the expiring queue"],
    href: "#celeyou-policy",
    hrefLabel: "Edit policy",
  },
  {
    id: "concierge",
    title: "Concierge",
    summary: "Assisted design and handover for customers who should not enter the studio themselves.",
    requires: ["Concierge queue", "Optional bundled plan"],
    adminNeeds: ["Intake, fulfill, and deliver from the concierge queue"],
    href: "/admin/celecard/concierge",
    hrefLabel: "Concierge queue",
  },
  {
    id: "connections",
    title: "Connect Back",
    summary: "Visitors leave a name and a way to reach them. The owner keeps the intro without a shared address book.",
    requires: ["connectBackEnabled", "Connection inbox"],
    adminNeeds: ["Clear a stuck request from the card record"],
    href: "/admin/celecard",
    hrefLabel: "Pending requests",
  },
  {
    id: "privacy",
    title: "Privacy and access",
    summary: "Access codes and reach visibility stay on the card. Ordinary administrators cannot retrieve private codes in the create wizard.",
    requires: ["Access codes", "Reach visibility"],
    adminNeeds: ["Support privacy from the card record without exposing secrets in audits"],
    href: "/admin/celecard",
    hrefLabel: "Card privacy",
  },
  {
    id: "templates",
    title: "House templates",
    summary: "Every plate uses the same design desk: layout, atmosphere, ornament, and paper.",
    requires: ["Theme catalog", "Official CeleYou mark"],
    adminNeeds: ["Assign a theme when creating a card"],
    href: "/dashboard/business-card",
    hrefLabel: "Theme desk",
  },
  {
    id: "analytics",
    title: "Activity",
    summary: "Arrive, save contact, reach, and pass-on counts. These are not the recipient’s identity.",
    requires: ["Interaction ledger"],
    adminNeeds: ["Read owner analytics from the card record"],
    href: "/admin/analytics",
    hrefLabel: "Platform analytics",
  },
] as const;

export function celeYouAdminServiceById(id: CeleYouAdminServiceId) {
  return CELEYOU_ADMIN_SERVICES.find((service) => service.id === id) ?? null;
}
