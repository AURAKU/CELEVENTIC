import { getCatalogTemplate, type InvitationCategory } from "@/lib/invitation-mvp/catalogue";

export type SocialEventKind =
  | "wedding"
  | "engagement"
  | "birthday"
  | "funeral"
  | "church"
  | "corporate"
  | "conference"
  | "concert"
  | "lunch"
  | "private";

const CATEGORY_TO_KIND: Record<InvitationCategory, SocialEventKind> = {
  Wedding: "wedding",
  Engagement: "engagement",
  Birthday: "birthday",
  Funeral: "funeral",
  Church: "church",
  Corporate: "corporate",
  Lunch: "lunch",
  Conference: "conference",
  Concert: "concert",
  "Private Event": "private",
};

const EVENT_TYPE_TO_KIND: Record<string, SocialEventKind> = {
  WEDDING: "wedding",
  ENGAGEMENT: "engagement",
  BIRTHDAY: "birthday",
  FUNERAL: "funeral",
  CHURCH_PROGRAM: "church",
  CORPORATE_EVENT: "corporate",
  CONFERENCE: "conference",
  PRODUCT_LAUNCH: "corporate",
  SCHOOL_EVENT: "corporate",
  CONCERT: "concert",
  FESTIVAL: "concert",
  PRIVATE_EVENT: "private",
  CUSTOM: "private",
};

const LAYOUT_KIND_HINTS: Array<{ match: RegExp; kind: SocialEventKind }> = [
  { match: /memorial|funeral|vigil|homegoing|mourning/i, kind: "funeral" },
  { match: /birthday|balloon|neon-celebration|milestone|soiree/i, kind: "birthday" },
  { match: /corporate|boardroom|investor|keynote|summit|launch/i, kind: "corporate" },
  { match: /concert|festival/i, kind: "concert" },
  { match: /church|chapel|service/i, kind: "church" },
  { match: /fashion|femmora|lunch/i, kind: "lunch" },
  { match: /wedding|marriage|nikkah|vows|bridal/i, kind: "wedding" },
];

export function resolveSocialEventKind(input: {
  catalogSlug?: string | null;
  layoutSlug?: string | null;
  catalogCategory?: string | null;
  eventType?: string | null;
}): SocialEventKind {
  const catalog = getCatalogTemplate(input.catalogSlug?.trim() || input.layoutSlug?.trim() || "");
  if (catalog?.category && CATEGORY_TO_KIND[catalog.category]) {
    return CATEGORY_TO_KIND[catalog.category];
  }
  if (input.catalogCategory && input.catalogCategory in CATEGORY_TO_KIND) {
    return CATEGORY_TO_KIND[input.catalogCategory as InvitationCategory];
  }
  const eventType = input.eventType?.trim().toUpperCase() || "";
  if (eventType && EVENT_TYPE_TO_KIND[eventType]) return EVENT_TYPE_TO_KIND[eventType];
  const layout = input.layoutSlug?.trim() || input.catalogSlug?.trim() || "";
  for (const hint of LAYOUT_KIND_HINTS) {
    if (hint.match.test(layout)) return hint.kind;
  }
  return "private";
}

export function isMemorialSocialKind(kind: SocialEventKind): boolean {
  return kind === "funeral";
}
