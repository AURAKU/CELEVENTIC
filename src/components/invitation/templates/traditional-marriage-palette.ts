/** Exact palette from the Traditional Marriage Ceremony card art */
export const TM_PALETTE = {
  bronze: "#A18373",
  bronzeDeep: "#8B6F5C",
  ink: "#1C253A",
  dress: "#5C5346",
  peach: "#FAF8F4",
  peachDeep: "#F5EBE3",
  border: "#E8C9B8",
  mustard: "#B8963E",
  mustardSoft: "#D4B56A",
  linen: "#FFFBF7",
} as const;

export type TmPalette = typeof TM_PALETTE;
