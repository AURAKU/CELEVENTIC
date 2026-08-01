/**
 * Celeventic Seating Studio — shared types.
 *
 * Layout lives in SeatingPlan.layout (JSON). Assignments stay in SeatingAssignment
 * (guestId → table/seat). Guest-facing surfaces read published visibility settings
 * + live assignments without requiring invitation republish.
 */

import type { TableShape } from "@/lib/seating/seating-types";

export type StudioTableKind =
  | "round"
  | "round_small"
  | "round_large"
  | "oval"
  | "rectangle"
  | "banquet"
  | "square"
  | "sweetheart"
  | "head"
  | "family"
  | "vip"
  | "cocktail"
  | "hightop"
  | "conference"
  | "custom";

export type SeatState =
  | "AVAILABLE"
  | "RESERVED"
  | "ASSIGNED"
  | "ADMITTED"
  | "OCCUPIED"
  | "LOCKED"
  | "UNAVAILABLE"
  | "ACCESSIBLE"
  | "VIP"
  | "CONFLICT"
  | "PENDING_ASSIGNMENT";

export type SeatingRevealMode =
  | "immediate"
  | "after_rsvp"
  | "hours_before"
  | "after_admission"
  | "portal_only"
  | "manual";

export type PlanPublicationStatus = "draft" | "published";

export type SeatingPlanKind = "RECEPTION" | "CEREMONY";

export type ReceptionAssignmentMode = "TABLE_ONLY" | "TABLE_AND_CHAIR";

export type ConflictSeverity = "CRITICAL" | "WARNING" | "SUGGESTION" | "RESOLVED";

export type VenueElementKind =
  | "stage"
  | "dance_floor"
  | "dj"
  | "buffet"
  | "bar"
  | "cake"
  | "gift"
  | "photo_booth"
  | "entrance"
  | "exit"
  | "restroom"
  | "vip_lounge"
  | "registration"
  | "pillar"
  | "label"
  | "custom";

export interface StudioZone {
  id: string;
  name: string;
  color: string;
  description?: string;
  capacity?: number;
  priority?: number;
}

export interface StudioVenueElement {
  id: string;
  kind: VenueElementKind;
  label: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  locked?: boolean;
  notes?: string;
}

export interface StudioTableConfig {
  id: string;
  label: string;
  kind?: StudioTableKind;
  shape?: TableShape;
  zone?: string;
  zoneId?: string;
  capacity?: number;
  seatCount?: number;
  x?: number;
  y?: number;
  rotation?: number;
  locked?: boolean;
  vip?: boolean;
  category?: string;
  color?: string;
  notes?: string;
  seatsAtEnds?: boolean;
  numberingClockwise?: boolean;
}

export interface StudioSettings {
  revealMode: SeatingRevealMode;
  revealHoursBefore?: number;
  showMapToGuests: boolean;
  showFindMySeat: boolean;
  showNeighborNames: boolean;
  keepGroupsTogether: boolean;
  preferAdjacentSeats: boolean;
  gridSize: number;
  snapToGrid: boolean;
  showGrid: boolean;
  directionsFromEntrance?: string[];
  /** Reception only — TABLE_ONLY reserves capacity without chair labels. */
  receptionMode?: ReceptionAssignmentMode;
  guestCountSource?: "MAXIMUM_INVITED" | "RSVP_CONFIRMED" | "CUSTOM";
  customExpectedPeople?: number;
  ceremonyDirections?: string[];
  receptionDirections?: string[];
}

export interface StudioLayout {
  tables: StudioTableConfig[];
  /** Ceremony chairs-only layout. Ignored for reception plans. */
  ceremonyRows?: import("./ceremony-engine").CeremonyRow[];
  ceremonySections?: import("./ceremony-engine").CeremonySection[];
  zones?: StudioZone[];
  elements?: StudioVenueElement[];
  notes?: string;
  expectedGuests?: number;
  status?: PlanPublicationStatus;
  publishedAt?: string | null;
  revision?: number;
  settings?: Partial<StudioSettings>;
  planKind?: SeatingPlanKind;
}

export const DEFAULT_STUDIO_SETTINGS: StudioSettings = {
  revealMode: "after_admission",
  revealHoursBefore: 24,
  showMapToGuests: true,
  showFindMySeat: true,
  showNeighborNames: false,
  keepGroupsTogether: true,
  preferAdjacentSeats: true,
  gridSize: 24,
  snapToGrid: true,
  showGrid: true,
  receptionMode: "TABLE_AND_CHAIR",
  guestCountSource: "MAXIMUM_INVITED",
  directionsFromEntrance: [
    "Enter through the main entrance",
    "Continue into the main hall",
    "Look for your seating zone signs",
    "Your table number is marked on the centerpiece",
  ],
  ceremonyDirections: [
    "Enter through the Main Entrance",
    "Use the centre aisle",
    "Proceed to your section",
    "An usher can help you find your row",
  ],
  receptionDirections: [
    "Enter the Reception Hall",
    "Continue past the gift table",
    "Look for your table number",
    "An usher can guide you to your places",
  ],
};

export interface StudioGuest {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  qrToken?: string;
  status?: string;
  plusOnes: number;
  invitationId: string | null;
  invitationName?: string | null;
  partySize: number;
  tags?: { id: string; label: string }[];
  vip?: boolean;
  accessible?: boolean;
  admission: {
    allowance: number;
    admittedCount: number;
    remainingCount: number;
    state: string;
  } | null;
}

export interface StudioAssignment {
  guestId: string;
  tableNumber: string;
  seatLabel?: string;
  zone?: string;
  notes?: string;
  locked?: boolean;
}

export interface SeatingSuggestion {
  id: string;
  invitationId: string | null;
  guestIds: string[];
  tableId: string;
  tableLabel: string;
  seatLabels: string[];
  score: number;
  reason: string;
  alternatives?: Array<{ tableLabel: string; seatLabels: string[]; reason: string }>;
}

export interface SeatingConflict {
  id: string;
  severity: ConflictSeverity;
  code: string;
  message: string;
  tableLabel?: string;
  guestIds?: string[];
  actionHint?: string;
}

export interface CapacitySnapshot {
  tableCount: number;
  totalSeats: number;
  assignedSeats: number;
  availableSeats: number;
  guestCount: number;
  peopleRepresented: number;
  unassignedGuests: number;
  admittedHeads: number;
  remainingHeads: number;
  conflictCount: number;
  overCapacity: boolean;
}

export const TABLE_KIND_PRESETS: Record<
  StudioTableKind,
  { label: string; shape: TableShape; defaultSeats: number; vip?: boolean }
> = {
  round: { label: "Round", shape: "round", defaultSeats: 8 },
  round_small: { label: "Small round", shape: "round", defaultSeats: 4 },
  round_large: { label: "Large round", shape: "round", defaultSeats: 10 },
  oval: { label: "Oval", shape: "rectangle", defaultSeats: 8 },
  rectangle: { label: "Rectangular", shape: "rectangle", defaultSeats: 8 },
  banquet: { label: "Banquet", shape: "rectangle", defaultSeats: 12 },
  square: { label: "Square", shape: "square", defaultSeats: 4 },
  sweetheart: { label: "Sweetheart", shape: "round", defaultSeats: 2, vip: true },
  head: { label: "Head table", shape: "rectangle", defaultSeats: 8, vip: true },
  family: { label: "Family", shape: "round", defaultSeats: 10 },
  vip: { label: "VIP", shape: "round", defaultSeats: 8, vip: true },
  cocktail: { label: "Cocktail", shape: "round", defaultSeats: 2 },
  hightop: { label: "High-top", shape: "round", defaultSeats: 4 },
  conference: { label: "Conference", shape: "rectangle", defaultSeats: 10 },
  custom: { label: "Custom", shape: "round", defaultSeats: 8 },
};

export const ZONE_PRESETS: Array<Pick<StudioZone, "name" | "color">> = [
  { name: "VIP", color: "#D4A63A" },
  { name: "Family", color: "#0B8A83" },
  { name: "Friends", color: "#3B82F6" },
  { name: "Colleagues", color: "#6366F1" },
  { name: "Bridal Party", color: "#EC4899" },
  { name: "Groom's Party", color: "#0EA5E9" },
  { name: "Bride's Family", color: "#F472B6" },
  { name: "Groom's Family", color: "#38BDF8" },
  { name: "General Guests", color: "#64748B" },
  { name: "Accessibility", color: "#10B981" },
  { name: "Reserved", color: "#F59E0B" },
];
