/** Typography Engine — emotional font categories for invitations */
export type TypographyCategoryId =
  | "luxury"
  | "editorial"
  | "modern"
  | "classic"
  | "romantic"
  | "corporate"
  | "traditional"
  | "funeral"
  | "minimal"
  | "magazine"
  | "bold"
  | "elegant"
  | "calligraphy";

export interface TypographyPack {
  id: TypographyCategoryId;
  label: string;
  description: string;
  heading: string;
  script: string;
  body: string;
  weight: number;
  letterSpacing: string;
  entrance: string;
}

export const TYPOGRAPHY_PACKS: TypographyPack[] = [
  { id: "luxury", label: "Luxury", description: "Cinzel + Great Vibes — palace elegance", heading: "Cinzel", script: "Great Vibes", body: "Cormorant Garamond", weight: 600, letterSpacing: "0.08em", entrance: "Fade In Up" },
  { id: "editorial", label: "Editorial", description: "Playfair + Bodoni — magazine drama", heading: "Playfair Display", script: "Cormorant Garamond", body: "Inter", weight: 700, letterSpacing: "0.04em", entrance: "Slide In Left" },
  { id: "modern", label: "Modern", description: "Inter + clean sans — contemporary motion", heading: "Inter", script: "Inter", body: "Inter", weight: 600, letterSpacing: "0.02em", entrance: "Fade In" },
  { id: "classic", label: "Classic", description: "Times-inspired serif tradition", heading: "Cormorant Garamond", script: "Great Vibes", body: "Cormorant Garamond", weight: 500, letterSpacing: "0.06em", entrance: "Fade In" },
  { id: "romantic", label: "Romantic", description: "Script-first love story typography", heading: "Great Vibes", script: "Great Vibes", body: "Cormorant Garamond", weight: 400, letterSpacing: "0.1em", entrance: "Float Up" },
  { id: "corporate", label: "Corporate", description: "Sharp sans for summit invites", heading: "Inter", script: "Inter", body: "Inter", weight: 600, letterSpacing: "0.12em", entrance: "Fade In" },
  { id: "traditional", label: "Traditional", description: "Heritage ceremony letterforms", heading: "Cinzel", script: "Cormorant Garamond", body: "Cormorant Garamond", weight: 500, letterSpacing: "0.08em", entrance: "Fade In Up" },
  { id: "funeral", label: "Funeral", description: "Solemn, respectful spacing", heading: "Cinzel", script: "Cormorant Garamond", body: "Cormorant Garamond", weight: 400, letterSpacing: "0.14em", entrance: "Gentle Fade" },
  { id: "minimal", label: "Minimal", description: "Whitespace and light weights", heading: "Inter", script: "Inter", body: "Inter", weight: 300, letterSpacing: "0.2em", entrance: "Fade In" },
  { id: "magazine", label: "Magazine", description: "Bold cover-story headlines", heading: "Playfair Display", script: "Playfair Display", body: "Inter", weight: 800, letterSpacing: "-0.02em", entrance: "Zoom In" },
  { id: "bold", label: "Bold", description: "High-impact display type", heading: "Playfair Display", script: "Great Vibes", body: "Inter", weight: 800, letterSpacing: "0.05em", entrance: "Pop In" },
  { id: "elegant", label: "Elegant", description: "Refined thin serif grace", heading: "Cormorant Garamond", script: "Great Vibes", body: "Cormorant Garamond", weight: 300, letterSpacing: "0.1em", entrance: "Fade In Up" },
  { id: "calligraphy", label: "Calligraphy", description: "Handwritten script dominance", heading: "Great Vibes", script: "Great Vibes", body: "Cormorant Garamond", weight: 400, letterSpacing: "0.06em", entrance: "Write On" },
];

export function getTypographyPack(id: TypographyCategoryId): TypographyPack | undefined {
  return TYPOGRAPHY_PACKS.find((p) => p.id === id);
}
