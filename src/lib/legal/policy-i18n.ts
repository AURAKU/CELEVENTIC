import type { LegalPolicySlug } from "./constants";

/** Translation keys (namespace.key) for policy titles in default-translations */
export const POLICY_TITLE_KEYS: Record<LegalPolicySlug, string> = {
  privacy: "legal.privacy_title",
  cookie: "legal.cookie_title_page",
  terms: "legal.terms_title",
  refund: "legal.refund_title",
  "revision-policy": "legal.revision-policy_title",
  "intellectual-property": "legal.intellectual-property_title",
  "data-rights": "legal.data-rights_title",
};

export const POLICY_DESC_KEYS: Record<LegalPolicySlug, string> = {
  privacy: "legal.policy_desc_privacy",
  cookie: "legal.policy_desc_cookie",
  terms: "legal.policy_desc_terms",
  refund: "legal.policy_desc_refund",
  "revision-policy": "legal.policy_desc_revision",
  "intellectual-property": "legal.policy_desc_ip",
  "data-rights": "legal.policy_desc_data_rights",
};

export const LEGAL_POLICY_SLUGS_ORDERED: LegalPolicySlug[] = [
  "terms",
  "privacy",
  "refund",
  "cookie",
  "revision-policy",
  "intellectual-property",
  "data-rights",
];
