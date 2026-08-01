import type { VenueElementKind } from "@/lib/seating/studio-types";

export type VenueFeaturePreset = {
  kind: VenueElementKind;
  label: string;
  /** Default map footprint in studio units. */
  width: number;
  height: number;
  /** Brand-safe accent for the glyph. */
  color: string;
  hint: string;
};

export const VENUE_FEATURE_PRESETS: VenueFeaturePreset[] = [
  {
    kind: "stage",
    label: "Stage",
    width: 200,
    height: 96,
    color: "#0B8A83",
    hint: "Raised performance / altar platform",
  },
  {
    kind: "dance_floor",
    label: "Dance floor",
    width: 180,
    height: 140,
    color: "#6366F1",
    hint: "Open dance area",
  },
  {
    kind: "dj",
    label: "DJ booth",
    width: 120,
    height: 72,
    color: "#7C3AED",
    hint: "DJ / media booth",
  },
  {
    kind: "buffet",
    label: "Buffet",
    width: 160,
    height: 64,
    color: "#D97706",
    hint: "Serving table",
  },
  {
    kind: "bar",
    label: "Bar",
    width: 140,
    height: 64,
    color: "#0F766E",
    hint: "Drinks station",
  },
  {
    kind: "cake",
    label: "Cake table",
    width: 96,
    height: 88,
    color: "#DB2777",
    hint: "Cake display",
  },
  {
    kind: "gift",
    label: "Gift table",
    width: 110,
    height: 72,
    color: "#CA8A04",
    hint: "Gifts & cards",
  },
  {
    kind: "photo_booth",
    label: "Photo booth",
    width: 110,
    height: 88,
    color: "#0284C7",
    hint: "Photo moment",
  },
  {
    kind: "entrance",
    label: "Entrance",
    width: 100,
    height: 64,
    color: "#059669",
    hint: "Guest entry",
  },
  {
    kind: "exit",
    label: "Exit",
    width: 100,
    height: 64,
    color: "#DC2626",
    hint: "Exit route",
  },
  {
    kind: "restroom",
    label: "Restroom",
    width: 96,
    height: 72,
    color: "#475569",
    hint: "Washrooms",
  },
  {
    kind: "vip_lounge",
    label: "VIP lounge",
    width: 150,
    height: 90,
    color: "#B45309",
    hint: "VIP seating lounge",
  },
  {
    kind: "registration",
    label: "Registration",
    width: 130,
    height: 72,
    color: "#0B8A83",
    hint: "Check-in desk",
  },
];

export const VENUE_FEATURE_COLOR_PRESETS = [
  "#0B8A83",
  "#0F766E",
  "#0284C7",
  "#6366F1",
  "#7C3AED",
  "#DB2777",
  "#D97706",
  "#CA8A04",
  "#B45309",
  "#059669",
  "#DC2626",
  "#475569",
] as const;

export function venueFeaturePreset(kind: VenueElementKind): VenueFeaturePreset {
  return (
    VENUE_FEATURE_PRESETS.find((preset) => preset.kind === kind) ?? {
      kind,
      label: kind.replace(/_/g, " "),
      width: 110,
      height: 72,
      color: "#0B8A83",
      hint: "Custom venue marker",
    }
  );
}

export function clampVenueFeatureSize(width: number, height: number): { width: number; height: number } {
  return {
    width: Math.round(Math.min(520, Math.max(56, width))),
    height: Math.round(Math.min(420, Math.max(44, height))),
  };
}
