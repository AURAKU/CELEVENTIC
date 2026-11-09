import type { TicketStatus } from "@prisma/client";
import { EVENT_TIME_ZONE } from "@/lib/constants";

const PUBLIC_TICKET_STATUS_EXCLUDE: TicketStatus[] = ["CANCELLED", "REFUNDED", "EXPIRED"];

export type PublicDiscoverEvent = {
  id: string;
  slug: string;
  title: string;
  eventType: string;
  hostName: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  venueName: string | null;
  landmark: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  coverImageUrl: string | null;
  pricingType: "FREE" | "PAID";
  isFeatured: boolean;
  status: string;
  hasTickets: boolean;
  ticketsOpen: boolean;
  fromPrice: number | null;
  currency: string;
};

export const PUBLIC_EVENT_SELECT = {
  id: true,
  slug: true,
  title: true,
  eventType: true,
  hostName: true,
  description: true,
  startDate: true,
  endDate: true,
  venueName: true,
  landmark: true,
  city: true,
  region: true,
  country: true,
  coverImageUrl: true,
  pricingType: true,
  isFeatured: true,
  status: true,
  tickets: {
    where: {
      guestId: null,
      status: { notIn: PUBLIC_TICKET_STATUS_EXCLUDE },
    },
    select: {
      price: true,
      type: true,
      soldCount: true,
      maxQuantity: true,
      currency: true,
    },
  },
};

type TicketRow = {
  price: { toString(): string } | number | string;
  type: string;
  soldCount: number;
  maxQuantity: number | null;
  currency: string;
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  eventType: string;
  hostName: string;
  description: string | null;
  startDate: Date | string;
  endDate: Date | string | null;
  venueName: string | null;
  landmark: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  coverImageUrl: string | null;
  pricingType: "FREE" | "PAID";
  isFeatured: boolean;
  status: string;
  tickets?: TicketRow[];
};

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function money(value: TicketRow["price"]): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clipDescription(value: string | null): string | null {
  if (!value) return null;
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return null;
  if (compact.length <= 160) return compact;
  const cut = compact.slice(0, 157);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > 80 ? cut.slice(0, lastSpace) : cut.trimEnd();
  return `${base}...`;
}

export function toPublicDiscoverEvent(row: EventRow): PublicDiscoverEvent {
  const tickets = row.tickets ?? [];
  const prices = tickets.map(money);
  const fromPrice = prices.length ? Math.min(...prices) : null;
  const ticketsOpen = tickets.some((ticket) => ticket.maxQuantity == null || ticket.soldCount < ticket.maxQuantity);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    eventType: row.eventType,
    hostName: row.hostName,
    description: clipDescription(row.description),
    startDate: toIso(row.startDate) ?? new Date(0).toISOString(),
    endDate: toIso(row.endDate),
    venueName: row.venueName,
    landmark: row.landmark,
    city: row.city,
    region: row.region,
    country: row.country,
    coverImageUrl: row.coverImageUrl,
    pricingType: row.pricingType,
    isFeatured: row.isFeatured,
    status: row.status,
    hasTickets: tickets.length > 0,
    ticketsOpen,
    fromPrice,
    currency: tickets[0]?.currency || "GHS",
  };
}

export function discoverEventHref(event: PublicDiscoverEvent): string {
  return event.hasTickets ? `/events/${event.slug}` : `/e/${event.slug}`;
}

export function discoverEventCta(event: PublicDiscoverEvent): string {
  if (event.hasTickets && !event.ticketsOpen) return "Sold out";
  if (event.hasTickets && (event.fromPrice ?? 0) > 0) return "Get tickets";
  if (event.hasTickets) return "Get free tickets";
  return "Open event";
}

/** Price copy only when the host set tickets. Never infer Free entry from the default pricing type. */
export function discoverPriceLabel(event: PublicDiscoverEvent): string | null {
  if (!event.hasTickets) return null;
  if (!event.ticketsOpen) return "Sold out";
  if ((event.fromPrice ?? 0) > 0) {
    return `From ${new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: event.currency || "GHS",
      maximumFractionDigits: 0,
    }).format(event.fromPrice ?? 0)}`;
  }
  return "Free entry";
}

function inEventZone(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: EVENT_TIME_ZONE, ...options }).format(date);
}

export function discoverDateParts(startIso: string, endIso?: string | null) {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : null;
  const sameDay =
    !end ||
    inEventZone(start, { year: "numeric", month: "short", day: "numeric" }) ===
      inEventZone(end, { year: "numeric", month: "short", day: "numeric" });

  return {
    weekday: inEventZone(start, { weekday: "short" }),
    day: inEventZone(start, { day: "2-digit" }),
    month: inEventZone(start, { month: "short" }).toUpperCase(),
    year: inEventZone(start, { year: "numeric" }),
    time: inEventZone(start, { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase(),
    rangeLabel: sameDay
      ? null
      : `${inEventZone(start, { day: "numeric", month: "short" })} to ${inEventZone(end!, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`,
  };
}

export function discoverPlaceLabel(event: PublicDiscoverEvent): string | null {
  const parts: string[] = [];
  if (event.venueName) parts.push(event.venueName);
  const area = event.landmark || event.city;
  if (area && area !== event.venueName) parts.push(area);
  if (event.city && event.city !== area && event.city !== event.venueName) parts.push(event.city);
  return parts.length ? parts.join(" · ") : null;
}

export const DISCOVER_TYPE_VISUAL: Record<
  string,
  { from: string; via: string; to: string; accent: string }
> = {
  WEDDING: { from: "#3d2a22", via: "#8b5a3c", to: "#d4a63a", accent: "#f3e0c2" },
  FUNERAL: { from: "#14261c", via: "#1f4a38", to: "#c5a35a", accent: "#e7d7a8" },
  BIRTHDAY: { from: "#3b1d3a", via: "#b44a7a", to: "#f0b429", accent: "#ffe7c2" },
  CONFERENCE: { from: "#0f2744", via: "#1d4e89", to: "#38bdf8", accent: "#dbeafe" },
  CHURCH_PROGRAM: { from: "#241c12", via: "#6b4f2a", to: "#d4a63a", accent: "#f5e6c8" },
  CORPORATE_EVENT: { from: "#111827", via: "#1e3a5f", to: "#0B8A83", accent: "#d1fae5" },
  CONCERT: { from: "#1a1030", via: "#6d28d9", to: "#fb7185", accent: "#fde68a" },
  FESTIVAL: { from: "#3f1d0f", via: "#c2410c", to: "#f59e0b", accent: "#fef3c7" },
  SCHOOL_EVENT: { from: "#0f3b3a", via: "#0B8A83", to: "#38bdf8", accent: "#ccfbf1" },
  PRODUCT_LAUNCH: { from: "#111827", via: "#334155", to: "#e2e8f0", accent: "#f8fafc" },
  PRIVATE_EVENT: { from: "#1f2937", via: "#0B8A83", to: "#d4a63a", accent: "#fef3c7" },
  CUSTOM: { from: "#0f172a", via: "#0B8A83", to: "#FF6B57", accent: "#ffe4e6" },
};
