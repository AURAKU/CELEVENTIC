export const LEGAL_CONTACT = {
  phone: "020 961 2770",
  email: "Celeventic@gmail.com",
  company: "Celeventic",
  jurisdiction: "Republic of Ghana",
} as const;

export const LEGAL_POLICY_SLUGS = [
  "privacy",
  "cookie",
  "terms",
  "refund",
  "revision-policy",
  "intellectual-property",
  "data-rights",
] as const;

export type LegalPolicySlug = (typeof LEGAL_POLICY_SLUGS)[number];

export const CURRENT_LEGAL_VERSION = "1.0.0";
