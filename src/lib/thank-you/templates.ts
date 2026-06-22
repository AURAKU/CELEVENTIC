export interface ThankYouTemplate {
  id: string;
  name: string;
  description: string;
  accentColor: string;
  background: string;
  fontFamily: string;
}

export const THANK_YOU_TEMPLATES: ThankYouTemplate[] = [
  { id: "luxury-wedding", name: "Luxury Wedding Thank You", description: "Gold and ivory elegance", accentColor: "#D4A63A", background: "linear-gradient(165deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", fontFamily: "serif" },
  { id: "ghanaian-traditional", name: "Traditional Ghanaian Thank You", description: "Kente-inspired warmth", accentColor: "#C41E3A", background: "linear-gradient(165deg, #1B4332 0%, #2D6A4F 50%, #40916C 100%)", fontFamily: "serif" },
  { id: "kente", name: "Kente Thank You", description: "Bold kente patterns", accentColor: "#E9C46A", background: "linear-gradient(135deg, #2C1810 0%, #5C4033 50%, #8B4513 100%)", fontFamily: "serif" },
  { id: "funeral-appreciation", name: "Funeral Appreciation", description: "Dignified remembrance", accentColor: "#D4A63A", background: "linear-gradient(165deg, #1a1a1a 0%, #2d2d2d 50%, #3d3d3d 100%)", fontFamily: "serif" },
  { id: "birthday", name: "Birthday Appreciation", description: "Celebratory and bright", accentColor: "#FF6B6B", background: "linear-gradient(165deg, #667eea 0%, #764ba2 100%)", fontFamily: "sans-serif" },
  { id: "corporate", name: "Corporate Appreciation", description: "Professional polish", accentColor: "#0B8A83", background: "linear-gradient(165deg, #0F172A 0%, #1E293B 50%, #334155 100%)", fontFamily: "sans-serif" },
  { id: "minimal-white-gold", name: "Minimal White/Gold", description: "Clean and refined", accentColor: "#D4A63A", background: "linear-gradient(165deg, #FAF8F4 0%, #FFFFFF 50%, #F1F5F9 100%)", fontFamily: "sans-serif" },
  { id: "floral", name: "Floral Thank You", description: "Soft botanical beauty", accentColor: "#E07A5F", background: "linear-gradient(165deg, #F4E4D4 0%, #FFE8D6 50%, #FFF8F0 100%)", fontFamily: "serif" },
  { id: "royal", name: "Royal Thank You", description: "Regal purple and gold", accentColor: "#D4A63A", background: "linear-gradient(165deg, #1a0a2e 0%, #3d1a6e 50%, #5c2d91 100%)", fontFamily: "serif" },
];

export function getThankYouTemplate(id: string): ThankYouTemplate {
  return THANK_YOU_TEMPLATES.find((t) => t.id === id) ?? THANK_YOU_TEMPLATES[0];
}
