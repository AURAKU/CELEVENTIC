/**
 * Maps catalogue categories → invitation order / form event types.
 * Source of truth so funeral (and other) templates never inherit wedding entry fields.
 */

import { parseCoupleNames } from "@/lib/invitation-templates";

/** Primary order `eventType` for each catalogue category. */
export const CATALOG_CATEGORY_PRIMARY_EVENT_TYPE: Record<string, string> = {
  Wedding: "WEDDING",
  Engagement: "WEDDING",
  Birthday: "BIRTHDAY",
  Funeral: "FUNERAL",
  Church: "CHURCH_PROGRAM",
  Corporate: "CORPORATE_EVENT",
  Lunch: "PRODUCT_LAUNCH",
  Conference: "CONFERENCE",
  Concert: "CONCERT",
  "Private Event": "PRIVATE_EVENT",
};

/**
 * Event types a host may select on a template detail page without leaving
 * that category's correct entry-field set.
 */
export const CATALOG_CATEGORY_EVENT_TYPES: Record<string, readonly string[]> = {
  Wedding: ["WEDDING"],
  Engagement: ["WEDDING"],
  Birthday: ["BIRTHDAY", "PRIVATE_EVENT"],
  Funeral: ["FUNERAL"],
  Church: ["CHURCH_PROGRAM", "CUSTOM"],
  Corporate: ["CORPORATE_EVENT", "CONFERENCE", "PRODUCT_LAUNCH"],
  Lunch: ["PRODUCT_LAUNCH", "CORPORATE_EVENT", "PRIVATE_EVENT"],
  Conference: ["CONFERENCE", "CORPORATE_EVENT"],
  Concert: ["CONCERT", "FESTIVAL"],
  "Private Event": ["PRIVATE_EVENT", "CUSTOM", "BIRTHDAY"],
};

const ALIAS_TO_EVENT_TYPE: Record<string, string> = {
  Engagement: "WEDDING",
  ENGAGEMENT: "WEDDING",
  Church: "CHURCH_PROGRAM",
  Corporate: "CORPORATE_EVENT",
  Lunch: "PRODUCT_LAUNCH",
  "Private Event": "PRIVATE_EVENT",
  PRIVATE_PARTY: "PRIVATE_EVENT",
};

export function normalizeEventTypeInput(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";
  const trimmed = raw.trim();
  return ALIAS_TO_EVENT_TYPE[trimmed] ?? trimmed.toUpperCase();
}

export function primaryEventTypeFromCatalogCategory(
  category: string | null | undefined
): string | null {
  if (!category) return null;
  return CATALOG_CATEGORY_PRIMARY_EVENT_TYPE[category] ?? null;
}

export function eventTypesForCatalogCategory(
  category: string | null | undefined
): readonly string[] {
  if (!category) return ["CUSTOM"];
  return CATALOG_CATEGORY_EVENT_TYPES[category] ?? ["CUSTOM"];
}

/**
 * Resolve the event type for a new (or healed) invitation order.
 * Catalogue category wins over a mismatched query param (e.g. funeral + WEDDING).
 */
export function resolveOrderEventType(
  templateCategory: string | null | undefined,
  requestedEventType?: string | null
): string {
  const primary = primaryEventTypeFromCatalogCategory(templateCategory) ?? "CUSTOM";
  const allowed = eventTypesForCatalogCategory(templateCategory);
  const requested = normalizeEventTypeInput(requestedEventType);
  if (requested && allowed.includes(requested)) return requested;
  return primary;
}

export function isCoupleNameEventType(eventType: string | null | undefined): boolean {
  const n = (eventType ?? "").toUpperCase();
  return n === "WEDDING" || n === "ENGAGEMENT";
}

export function isFuneralEventType(eventType: string | null | undefined): boolean {
  return (eventType ?? "").toUpperCase() === "FUNERAL";
}

export function isBirthdayEventType(eventType: string | null | undefined): boolean {
  return (eventType ?? "").toUpperCase() === "BIRTHDAY";
}

export function isCorporateLikeEventType(eventType: string | null | undefined): boolean {
  const n = (eventType ?? "").toUpperCase();
  return (
    n === "CORPORATE_EVENT" ||
    n === "CONFERENCE" ||
    n === "PRODUCT_LAUNCH" ||
    n === "SCHOOL_EVENT"
  );
}

export function introLinePlaceholderForEventType(eventType?: string | null): string {
  const n = (eventType ?? "").toUpperCase();
  if (n === "FUNERAL") return "In loving memory";
  if (n === "BIRTHDAY") return "You're invited to celebrate";
  if (isCorporateLikeEventType(n)) return "You are cordially invited";
  if (n === "CONCERT" || n === "FESTIVAL") return "Join us for";
  if (n === "CHURCH_PROGRAM") return "You are warmly invited";
  if (isCoupleNameEventType(n)) return "Together with their families";
  return "You're invited";
}

/** Guest-facing / preview host line from an invitation order. */
export function displayHostNameFromOrder(order: {
  eventType?: string | null;
  hostName?: string | null;
  coupleName1?: string | null;
  coupleName2?: string | null;
  deceasedName?: string | null;
}): string {
  const et = (order.eventType ?? "").toUpperCase();
  if (et === "FUNERAL" && order.deceasedName?.trim()) return order.deceasedName.trim();
  if (et === "BIRTHDAY" && order.coupleName1?.trim()) return order.coupleName1.trim();
  if (order.coupleName1?.trim() && order.coupleName2?.trim()) {
    return `${order.coupleName1.trim()} & ${order.coupleName2.trim()}`;
  }
  return order.hostName?.trim() || "Host";
}

export function hostChecklistLabelForEventType(eventType?: string | null): string {
  if (isFuneralEventType(eventType)) return "Family / host name";
  if (isCoupleNameEventType(eventType)) return "Host / couple names";
  if (isBirthdayEventType(eventType)) return "Host / organizer name";
  if (isCorporateLikeEventType(eventType)) return "Organizer / company name";
  return "Host name";
}

/** Layouts that must never render as couple names. */
const SINGLE_HEADLINE_LAYOUTS = new Set([
  "memorial-candle-tribute",
  "neon-celebration-party",
  "corporate-prestige-summit",
  "luxury-fashion-flagship",
]);

export function resolveHeadlineNames(opts: {
  eventType?: string | null;
  layout?: string | null;
  title?: string | null;
  hostName?: string | null;
  coupleName1?: string | null;
  coupleName2?: string | null;
  deceasedName?: string | null;
}): { name1: string; name2: string } {
  const et = (opts.eventType ?? "").toUpperCase();
  const layout = opts.layout ?? "";
  const funeral =
    et === "FUNERAL" || layout === "memorial-candle-tribute";

  if (funeral) {
    const fromTitle = (opts.title ?? "")
      .replace(/^in\s+loving\s+memory\s+of\s+/i, "")
      .replace(/^celebration\s+of\s+life\s*[,–\-]\s*/i, "")
      .trim();
    const honouree =
      opts.deceasedName?.trim() ||
      fromTitle ||
      opts.hostName?.trim() ||
      "In Loving Memory";
    return { name1: honouree, name2: "" };
  }

  if (
    et === "BIRTHDAY" ||
    isCorporateLikeEventType(et) ||
    et === "CONCERT" ||
    et === "FESTIVAL" ||
    et === "CHURCH_PROGRAM" ||
    et === "PRIVATE_EVENT" ||
    et === "CUSTOM" ||
    SINGLE_HEADLINE_LAYOUTS.has(layout)
  ) {
    const primary =
      opts.title?.trim() ||
      opts.coupleName1?.trim() ||
      opts.hostName?.trim() ||
      "Celebration";
    return { name1: primary, name2: "" };
  }

  if (opts.coupleName1?.trim() && opts.coupleName2?.trim()) {
    return { name1: opts.coupleName1.trim(), name2: opts.coupleName2.trim() };
  }

  return parseCoupleNames(opts.title ?? "", opts.hostName ?? "");
}
