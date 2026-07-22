export const TEMPLATE_CATEGORIES = [
  "Wedding", "Funeral", "Birthday", "Corporate", "Church", "Concert",
  "Festival", "School", "Product Launch", "Business Card", "Complimentary Card", "Ticket",
] as const;

export const TEMPLATE_STYLES = [
  "Luxury", "Classic", "Modern", "Minimal", "Royal", "Futuristic",
  "Traditional Ghanaian", "Kente-inspired", "Adinkra-inspired", "Floral",
  "Corporate", "Dark premium", "Clean white",
] as const;

export const THEME_PRESETS = [
  { id: "luxury-teal-gold", name: "Luxury Teal Gold", colors: { primary: "#0D9488", secondary: "#D4AF37", background: "#0F766E", text: "#FFFFFF" } },
  { id: "royal-black-gold", name: "Royal Black Gold", colors: { primary: "#D4AF37", secondary: "#1a1a1a", background: "#0a0a0a", text: "#F5F5F5" } },
  { id: "clean-white-gold", name: "Clean White Gold", colors: { primary: "#1a1a1a", secondary: "#D4AF37", background: "#FFFFFF", text: "#333333" } },
  { id: "traditional-kente", name: "Traditional Ghanaian Kente", colors: { primary: "#B45309", secondary: "#0D9488", background: "#FEF3C7", text: "#1a1a1a" } },
  { id: "funeral-classic", name: "Funeral Classic Black", colors: { primary: "#FFFFFF", secondary: "#374151", background: "#1F2937", text: "#F9FAFB" } },
  { id: "memorial-floral", name: "Memorial White Floral", colors: { primary: "#374151", secondary: "#9CA3AF", background: "#F9FAFB", text: "#1F2937" } },
  { id: "corporate-navy", name: "Corporate Navy Gold", colors: { primary: "#D4AF37", secondary: "#1E3A5F", background: "#0F2744", text: "#FFFFFF" } },
  { id: "church-purple", name: "Church Purple Gold", colors: { primary: "#D4AF37", secondary: "#6B21A8", background: "#581C87", text: "#FFFFFF" } },
  { id: "birthday-pop", name: "Birthday Color Pop", colors: { primary: "#EC4899", secondary: "#8B5CF6", background: "#FDF2F8", text: "#831843" } },
  { id: "futuristic-neon", name: "Futuristic Neon", colors: { primary: "#22D3EE", secondary: "#A855F7", background: "#0F172A", text: "#E2E8F0" } },
  { id: "minimal-cream", name: "Minimal Cream", colors: { primary: "#44403C", secondary: "#A8A29E", background: "#FAF7F2", text: "#292524" } },
  { id: "romantic-floral", name: "Romantic Floral", colors: { primary: "#9D174D", secondary: "#D4A5A5", background: "#FFF1F2", text: "#4A4A4A" } },
] as const;

export const EVENT_TYPE_TO_CATEGORY: Record<string, string> = {
  WEDDING: "Wedding",
  ENGAGEMENT: "Engagement",
  FUNERAL: "Funeral",
  BIRTHDAY: "Birthday",
  CORPORATE: "Corporate",
  CORPORATE_EVENT: "Corporate",
  CHURCH: "Church",
  CONCERT: "Concert",
  FESTIVAL: "Festival",
  SCHOOL: "School",
  PRODUCT_LAUNCH: "Product Launch",
  PRIVATE: "Wedding",
  OTHER: "Corporate",
};
