import type { TemplateSchema } from "@/types/template-engine";

export function createWeddingLuxuryTemplate(): TemplateSchema {
  return {
    name: "Luxury Wedding Invitation",
    category: "Wedding",
    style: "Luxury",
    productType: "INVITATION",
    canvas: { width: 1080, height: 1350, background: "linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%)" },
    colorPalette: { primary: "#D4AF37", secondary: "#FFFFFF", background: "#0a0a0a", text: "#F5F5F5" },
    fontPairing: { heading: "Cinzel", body: "Cormorant Garamond", script: "Great Vibes" },
    variables: ["{{guest_name}}", "{{event_title}}", "{{event_date}}", "{{venue}}", "{{qr_code}}"],
    blocks: [
      { id: "b1", type: "pattern_overlay", key: "gold_frame", x: 40, y: 40, width: 1000, height: 1270, zIndex: 1 },
      { id: "b2", type: "text", key: "intro", x: 540, y: 120, font: "Cormorant Garamond", fontSize: 24, color: "#D4AF37", align: "center", content: "together with their families", zIndex: 2 },
      { id: "b3", type: "text", key: "event_title", x: 540, y: 280, font: "Cinzel", fontSize: 56, color: "#FFFFFF", align: "center", variable: "{{event_title}}", zIndex: 2 },
      { id: "b4", type: "text", key: "host_name", x: 540, y: 380, font: "Great Vibes", fontSize: 42, color: "#D4AF37", align: "center", variable: "{{host_name}}", zIndex: 2 },
      { id: "b5", type: "text", key: "event_date", x: 540, y: 520, font: "Cinzel", fontSize: 32, color: "#FFFFFF", align: "center", variable: "{{event_date}}", zIndex: 2 },
      { id: "b6", type: "text", key: "venue", x: 540, y: 600, font: "Cormorant Garamond", fontSize: 28, color: "#CCCCCC", align: "center", variable: "{{venue}}", zIndex: 2 },
      { id: "b7", type: "qr", key: "guest_qr", x: 820, y: 1080, size: 160, zIndex: 3 },
      { id: "b8", type: "rsvp_button", key: "rsvp", x: 540, y: 900, width: 280, height: 56, zIndex: 3 },
      { id: "b9", type: "text", key: "guest_name", x: 540, y: 780, font: "Cormorant Garamond", fontSize: 22, color: "#D4AF37", align: "center", variable: "Dear {{guest_name}}", zIndex: 2 },
    ],
  };
}

export function createFuneralClassicTemplate(): TemplateSchema {
  return {
    name: "Funeral Classic Memorial",
    category: "Funeral",
    style: "Classic",
    productType: "INVITATION",
    canvas: { width: 1080, height: 1350, background: "#1F2937" },
    colorPalette: { primary: "#FFFFFF", secondary: "#9CA3AF", background: "#1F2937", text: "#F9FAFB" },
    fontPairing: { heading: "Playfair Display", body: "Cormorant Garamond" },
    blocks: [
      { id: "b1", type: "text", key: "intro", x: 540, y: 150, font: "Cormorant Garamond", fontSize: 22, color: "#9CA3AF", align: "center", content: "In loving memory", zIndex: 1 },
      { id: "b2", type: "text", key: "event_title", x: 540, y: 300, font: "Playfair Display", fontSize: 48, color: "#FFFFFF", align: "center", variable: "{{event_title}}", zIndex: 1 },
      { id: "b3", type: "divider", key: "divider", x: 440, y: 400, width: 200, height: 2, zIndex: 1 },
      { id: "b4", type: "text", key: "event_date", x: 540, y: 480, font: "Cormorant Garamond", fontSize: 28, color: "#D1D5DB", align: "center", variable: "{{event_date}}", zIndex: 1 },
      { id: "b5", type: "text", key: "venue", x: 540, y: 560, font: "Cormorant Garamond", fontSize: 24, color: "#9CA3AF", align: "center", variable: "{{venue}}", zIndex: 1 },
    ],
  };
}

export function createCorporateFlyerTemplate(): TemplateSchema {
  return {
    name: "Corporate Conference Flyer",
    category: "Corporate",
    style: "Corporate",
    productType: "FLYER",
    canvas: { width: 1080, height: 1350, background: "#0F2744" },
    colorPalette: { primary: "#D4AF37", secondary: "#FFFFFF", background: "#0F2744", text: "#FFFFFF" },
    fontPairing: { heading: "Inter", body: "Inter" },
    blocks: [
      { id: "b1", type: "logo", key: "logo", x: 80, y: 80, width: 120, height: 120, zIndex: 1 },
      { id: "b2", type: "text", key: "event_title", x: 540, y: 350, font: "Inter", fontSize: 64, color: "#FFFFFF", align: "center", variable: "{{event_title}}", zIndex: 1 },
      { id: "b3", type: "text", key: "host_name", x: 540, y: 450, font: "Inter", fontSize: 28, color: "#D4AF37", align: "center", variable: "Hosted by {{host_name}}", zIndex: 1 },
      { id: "b4", type: "text", key: "event_date", x: 540, y: 550, font: "Inter", fontSize: 32, color: "#FFFFFF", align: "center", variable: "{{event_date}} · {{event_time}}", zIndex: 1 },
      { id: "b5", type: "text", key: "venue", x: 540, y: 620, font: "Inter", fontSize: 24, color: "#94A3B8", align: "center", variable: "{{venue}}", zIndex: 1 },
      { id: "b6", type: "qr", key: "guest_qr", x: 460, y: 1000, size: 160, zIndex: 2 },
    ],
  };
}

export function createTicketPassTemplate(): TemplateSchema {
  return {
    name: "Premium Event Ticket",
    category: "Ticket",
    style: "Modern",
    productType: "TICKET",
    canvas: { width: 800, height: 400, background: "linear-gradient(135deg, #0D9488, #0F766E)" },
    colorPalette: { primary: "#FFFFFF", secondary: "#D4AF37", background: "#0D9488", text: "#FFFFFF" },
    fontPairing: { heading: "Inter", body: "Inter" },
    blocks: [
      { id: "b1", type: "text", key: "event_title", x: 400, y: 80, font: "Inter", fontSize: 32, color: "#FFFFFF", align: "center", variable: "{{event_title}}", zIndex: 1 },
      { id: "b2", type: "text", key: "ticket_type", x: 400, y: 140, font: "Inter", fontSize: 20, color: "#D4AF37", align: "center", variable: "{{ticket_type}}", zIndex: 1 },
      { id: "b3", type: "text", key: "guest_name", x: 400, y: 200, font: "Inter", fontSize: 24, color: "#FFFFFF", align: "center", variable: "{{guest_name}}", zIndex: 1 },
      { id: "b4", type: "qr", key: "guest_qr", x: 620, y: 120, size: 140, zIndex: 2 },
      { id: "b5", type: "text", key: "event_date", x: 400, y: 280, font: "Inter", fontSize: 16, color: "#CCFBF1", align: "center", variable: "{{event_date}}", zIndex: 1 },
    ],
  };
}

export function createBusinessCardTemplate(): TemplateSchema {
  return {
    name: "Elegant Business Card",
    category: "Business Card",
    style: "Minimal",
    productType: "BUSINESS_CARD",
    canvas: { width: 1050, height: 600, background: "#FFFFFF" },
    colorPalette: { primary: "#0D9488", secondary: "#1a1a1a", background: "#FFFFFF", text: "#333333" },
    fontPairing: { heading: "Playfair Display", body: "Inter" },
    blocks: [
      { id: "b1", type: "frame", key: "border", x: 20, y: 20, width: 1010, height: 560, zIndex: 0 },
      { id: "b2", type: "text", key: "host_name", x: 525, y: 200, font: "Playfair Display", fontSize: 42, color: "#0D9488", align: "center", variable: "{{host_name}}", zIndex: 1 },
      { id: "b3", type: "text", key: "event_title", x: 525, y: 280, font: "Inter", fontSize: 18, color: "#666666", align: "center", variable: "{{event_title}}", zIndex: 1 },
      { id: "b4", type: "qr", key: "qr", x: 850, y: 380, size: 100, zIndex: 2 },
    ],
  };
}

export function createKenteWeddingTemplate(): TemplateSchema {
  return {
    name: "Traditional Kente Wedding",
    category: "Wedding",
    style: "Traditional Ghanaian",
    productType: "INVITATION",
    canvas: { width: 1080, height: 1350, background: "linear-gradient(180deg, #1a1a1a 0%, #2d1810 50%, #1a1a1a 100%)" },
    colorPalette: { primary: "#B45309", secondary: "#0D9488", background: "#1a1a1a", text: "#FEF3C7" },
    fontPairing: { heading: "Cinzel", body: "Cormorant Garamond", script: "Great Vibes" },
    variables: ["{{guest_name}}", "{{event_title}}", "{{event_date}}", "{{venue}}", "{{qr_code}}"],
    blocks: [
      { id: "b1", type: "pattern_overlay", key: "kente_band_top", x: 0, y: 0, width: 1080, height: 80, color: "#B45309", zIndex: 1 },
      { id: "b2", type: "pattern_overlay", key: "kente_band_bottom", x: 0, y: 1270, width: 1080, height: 80, color: "#0D9488", zIndex: 1 },
      { id: "b3", type: "text", key: "intro", x: 540, y: 140, font: "Cormorant Garamond", fontSize: 22, color: "#FEF3C7", align: "center", content: "Traditional Marriage Ceremony", zIndex: 2 },
      { id: "b4", type: "text", key: "event_title", x: 540, y: 300, font: "Cinzel", fontSize: 52, color: "#FEF3C7", align: "center", variable: "{{event_title}}", zIndex: 2 },
      { id: "b5", type: "text", key: "host_name", x: 540, y: 400, font: "Great Vibes", fontSize: 40, color: "#B45309", align: "center", variable: "{{host_name}}", zIndex: 2 },
      { id: "b6", type: "divider", key: "divider", x: 390, y: 480, width: 300, height: 3, color: "#0D9488", zIndex: 2 },
      { id: "b7", type: "text", key: "event_date", x: 540, y: 540, font: "Cinzel", fontSize: 30, color: "#FFFFFF", align: "center", variable: "{{event_date}}", zIndex: 2 },
      { id: "b8", type: "text", key: "venue", x: 540, y: 620, font: "Cormorant Garamond", fontSize: 26, color: "#D1D5DB", align: "center", variable: "{{venue}}", zIndex: 2 },
      { id: "b9", type: "text", key: "guest_name", x: 540, y: 760, font: "Cormorant Garamond", fontSize: 22, color: "#B45309", align: "center", variable: "Dear {{guest_name}}", zIndex: 2 },
      { id: "b10", type: "rsvp_button", key: "rsvp", x: 540, y: 880, width: 260, height: 52, zIndex: 3 },
      { id: "b11", type: "qr", key: "guest_qr", x: 820, y: 1080, size: 150, zIndex: 3 },
    ],
  };
}

export function createBirthdayPopTemplate(): TemplateSchema {
  return {
    name: "Birthday Celebration",
    category: "Birthday",
    style: "Modern",
    productType: "FLYER",
    canvas: { width: 1080, height: 1350, background: "linear-gradient(135deg, #FDF2F8 0%, #EDE9FE 100%)" },
    colorPalette: { primary: "#EC4899", secondary: "#8B5CF6", background: "#FDF2F8", text: "#831843" },
    fontPairing: { heading: "Inter", body: "Inter" },
    blocks: [
      { id: "b1", type: "text", key: "intro", x: 540, y: 120, font: "Inter", fontSize: 28, color: "#8B5CF6", align: "center", content: "You're Invited!", zIndex: 1 },
      { id: "b2", type: "text", key: "event_title", x: 540, y: 280, font: "Inter", fontSize: 64, color: "#EC4899", align: "center", variable: "{{event_title}}", zIndex: 1 },
      { id: "b3", type: "text", key: "host_name", x: 540, y: 380, font: "Inter", fontSize: 32, color: "#831843", align: "center", variable: "Hosted by {{host_name}}", zIndex: 1 },
      { id: "b4", type: "text", key: "event_date", x: 540, y: 500, font: "Inter", fontSize: 28, color: "#6B21A8", align: "center", variable: "{{event_date}} · {{event_time}}", zIndex: 1 },
      { id: "b5", type: "text", key: "venue", x: 540, y: 580, font: "Inter", fontSize: 24, color: "#9D174D", align: "center", variable: "{{venue}}", zIndex: 1 },
      { id: "b6", type: "qr", key: "guest_qr", x: 460, y: 1000, size: 160, zIndex: 2 },
    ],
  };
}

export function createChurchPurpleTemplate(): TemplateSchema {
  return {
    name: "Church Event Invitation",
    category: "Church",
    style: "Royal",
    productType: "INVITATION",
    canvas: { width: 1080, height: 1350, background: "linear-gradient(180deg, #581C87 0%, #3B0764 100%)" },
    colorPalette: { primary: "#D4AF37", secondary: "#6B21A8", background: "#581C87", text: "#FFFFFF" },
    fontPairing: { heading: "Playfair Display", body: "Cormorant Garamond" },
    blocks: [
      { id: "b1", type: "frame", key: "gold_frame", x: 50, y: 50, width: 980, height: 1250, color: "#D4AF37", zIndex: 1 },
      { id: "b2", type: "text", key: "intro", x: 540, y: 150, font: "Cormorant Garamond", fontSize: 24, color: "#D4AF37", align: "center", content: "You are cordially invited", zIndex: 2 },
      { id: "b3", type: "text", key: "event_title", x: 540, y: 320, font: "Playfair Display", fontSize: 52, color: "#FFFFFF", align: "center", variable: "{{event_title}}", zIndex: 2 },
      { id: "b4", type: "text", key: "host_name", x: 540, y: 420, font: "Cormorant Garamond", fontSize: 28, color: "#E9D5FF", align: "center", variable: "{{host_name}}", zIndex: 2 },
      { id: "b5", type: "text", key: "event_date", x: 540, y: 540, font: "Playfair Display", fontSize: 32, color: "#D4AF37", align: "center", variable: "{{event_date}}", zIndex: 2 },
      { id: "b6", type: "text", key: "venue", x: 540, y: 620, font: "Cormorant Garamond", fontSize: 26, color: "#E9D5FF", align: "center", variable: "{{venue}}", zIndex: 2 },
      { id: "b7", type: "rsvp_button", key: "rsvp", x: 540, y: 800, width: 240, height: 50, zIndex: 3 },
      { id: "b8", type: "qr", key: "guest_qr", x: 820, y: 1080, size: 140, zIndex: 3 },
    ],
  };
}

export const DEFAULT_TEMPLATE_SCHEMAS = [
  createWeddingLuxuryTemplate(),
  createFuneralClassicTemplate(),
  createCorporateFlyerTemplate(),
  createTicketPassTemplate(),
  createBusinessCardTemplate(),
  createKenteWeddingTemplate(),
  createBirthdayPopTemplate(),
  createChurchPurpleTemplate(),
];

export const SCHEMA_BY_NAME: Record<string, TemplateSchema> = Object.fromEntries(
  DEFAULT_TEMPLATE_SCHEMAS.map((s) => [s.name, s])
);
