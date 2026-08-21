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
    canvas: { width: 800, height: 400, background: "linear-gradient(135deg, #0B8A83 0%, #0f766e 55%, #115e59 100%)" },
    colorPalette: { primary: "#FFFFFF", secondary: "#FBBF24", background: "#0B8A83", text: "#FFFFFF" },
    fontPairing: { heading: "Inter", body: "Inter" },
    variables: ["{{event_title}}", "{{ticket_type}}", "{{guest_name}}", "{{event_date}}", "{{venue}}", "{{qr_code}}"],
    blocks: [
      { id: "b0", type: "frame", key: "edge", x: 16, y: 16, width: 768, height: 368, color: "rgba(255,255,255,0.35)", zIndex: 0 },
      { id: "b1", type: "text", key: "label", x: 48, y: 48, font: "Inter", fontSize: 12, color: "#99F6E4", align: "left", content: "CELEVENTIC PASS", zIndex: 1 },
      { id: "b2", type: "text", key: "event_title", x: 48, y: 100, font: "Inter", fontSize: 28, color: "#FFFFFF", align: "left", variable: "{{event_title}}", zIndex: 1 },
      { id: "b3", type: "text", key: "ticket_type", x: 48, y: 150, font: "Inter", fontSize: 18, color: "#FBBF24", align: "left", variable: "{{ticket_type}}", zIndex: 1 },
      { id: "b4", type: "text", key: "guest_name", x: 48, y: 220, font: "Inter", fontSize: 20, color: "#FFFFFF", align: "left", variable: "{{guest_name}}", zIndex: 1 },
      { id: "b5", type: "text", key: "event_date", x: 48, y: 270, font: "Inter", fontSize: 14, color: "#CCFBF1", align: "left", variable: "{{event_date}} · {{event_time}}", zIndex: 1 },
      { id: "b6", type: "text", key: "venue", x: 48, y: 310, font: "Inter", fontSize: 13, color: "#99F6E4", align: "left", variable: "{{venue}}", zIndex: 1 },
      { id: "b7", type: "divider", key: "stub", x: 560, y: 40, width: 2, height: 320, color: "rgba(255,255,255,0.35)", zIndex: 1 },
      { id: "b8", type: "qr", key: "guest_qr", x: 600, y: 120, size: 140, zIndex: 2 },
      { id: "b9", type: "text", key: "scan", x: 670, y: 290, font: "Inter", fontSize: 11, color: "#CCFBF1", align: "center", content: "SCAN AT GATE", zIndex: 2 },
    ],
  };
}

export function createConcertNightTicketTemplate(): TemplateSchema {
  return {
    name: "Concert Night Ticket",
    category: "Ticket",
    style: "Concert",
    productType: "TICKET",
    canvas: { width: 800, height: 400, background: "linear-gradient(145deg, #1e0533 0%, #4c1d95 45%, #7c3aed 100%)" },
    colorPalette: { primary: "#F5D0FE", secondary: "#FBBF24", background: "#4c1d95", text: "#FFFFFF" },
    fontPairing: { heading: "Inter", body: "Inter" },
    variables: ["{{event_title}}", "{{ticket_type}}", "{{guest_name}}", "{{event_date}}", "{{venue}}", "{{qr_code}}"],
    blocks: [
      { id: "b0", type: "pattern_overlay", key: "band", x: 0, y: 0, width: 800, height: 56, color: "#FBBF24", zIndex: 0 },
      { id: "b1", type: "text", key: "label", x: 400, y: 28, font: "Inter", fontSize: 14, color: "#1e0533", align: "center", content: "LIVE SHOW · ADMIT ONE", zIndex: 1 },
      { id: "b2", type: "text", key: "event_title", x: 40, y: 110, font: "Inter", fontSize: 30, color: "#FAE8FF", align: "left", variable: "{{event_title}}", zIndex: 1 },
      { id: "b3", type: "text", key: "ticket_type", x: 40, y: 165, font: "Inter", fontSize: 16, color: "#FBBF24", align: "left", variable: "{{ticket_type}}", zIndex: 1 },
      { id: "b4", type: "text", key: "guest_name", x: 40, y: 230, font: "Inter", fontSize: 18, color: "#FFFFFF", align: "left", variable: "{{guest_name}}", zIndex: 1 },
      { id: "b5", type: "text", key: "meta", x: 40, y: 280, font: "Inter", fontSize: 13, color: "#E9D5FF", align: "left", variable: "{{event_date}} · {{event_time}}", zIndex: 1 },
      { id: "b6", type: "text", key: "venue", x: 40, y: 320, font: "Inter", fontSize: 13, color: "#C4B5FD", align: "left", variable: "{{venue}}", zIndex: 1 },
      { id: "b7", type: "qr", key: "guest_qr", x: 600, y: 130, size: 140, zIndex: 2 },
    ],
  };
}

export function createSportsMatchTicketTemplate(): TemplateSchema {
  return {
    name: "Sports Match Ticket",
    category: "Ticket",
    style: "Sports",
    productType: "TICKET",
    canvas: { width: 800, height: 400, background: "linear-gradient(135deg, #052e16 0%, #14532d 50%, #166534 100%)" },
    colorPalette: { primary: "#FFFFFF", secondary: "#FACC15", background: "#14532d", text: "#FFFFFF" },
    fontPairing: { heading: "Inter", body: "Inter" },
    variables: ["{{event_title}}", "{{ticket_type}}", "{{guest_name}}", "{{event_date}}", "{{venue}}", "{{qr_code}}"],
    blocks: [
      { id: "b0", type: "pattern_overlay", key: "stripe", x: 0, y: 0, width: 18, height: 400, color: "#FACC15", zIndex: 0 },
      { id: "b1", type: "text", key: "label", x: 48, y: 40, font: "Inter", fontSize: 12, color: "#BBF7D0", align: "left", content: "MATCH DAY PASS", zIndex: 1 },
      { id: "b2", type: "text", key: "event_title", x: 48, y: 100, font: "Inter", fontSize: 28, color: "#FFFFFF", align: "left", variable: "{{event_title}}", zIndex: 1 },
      { id: "b3", type: "text", key: "ticket_type", x: 48, y: 155, font: "Inter", fontSize: 18, color: "#FACC15", align: "left", variable: "{{ticket_type}}", zIndex: 1 },
      { id: "b4", type: "text", key: "guest_name", x: 48, y: 230, font: "Inter", fontSize: 18, color: "#ECFDF5", align: "left", variable: "{{guest_name}}", zIndex: 1 },
      { id: "b5", type: "text", key: "meta", x: 48, y: 280, font: "Inter", fontSize: 13, color: "#86EFAC", align: "left", variable: "{{event_date}} · {{event_time}}", zIndex: 1 },
      { id: "b6", type: "text", key: "venue", x: 48, y: 320, font: "Inter", fontSize: 13, color: "#BBF7D0", align: "left", variable: "{{venue}}", zIndex: 1 },
      { id: "b7", type: "divider", key: "stub", x: 560, y: 36, width: 2, height: 328, color: "rgba(250,204,21,0.45)", zIndex: 1 },
      { id: "b8", type: "qr", key: "guest_qr", x: 600, y: 120, size: 140, zIndex: 2 },
    ],
  };
}

export function createProductLaunchTicketTemplate(): TemplateSchema {
  return {
    name: "Product Launch Ticket",
    category: "Ticket",
    style: "Launch",
    productType: "TICKET",
    canvas: { width: 800, height: 400, background: "linear-gradient(140deg, #0c1222 0%, #1e293b 55%, #0f172a 100%)" },
    colorPalette: { primary: "#38BDF8", secondary: "#F8FAFC", background: "#0f172a", text: "#F8FAFC" },
    fontPairing: { heading: "Inter", body: "Inter" },
    variables: ["{{event_title}}", "{{ticket_type}}", "{{guest_name}}", "{{event_date}}", "{{venue}}", "{{qr_code}}"],
    blocks: [
      { id: "b0", type: "frame", key: "edge", x: 20, y: 20, width: 760, height: 360, color: "#38BDF8", zIndex: 0 },
      { id: "b1", type: "text", key: "label", x: 48, y: 52, font: "Inter", fontSize: 12, color: "#7DD3FC", align: "left", content: "INVITE-ONLY LAUNCH", zIndex: 1 },
      { id: "b2", type: "text", key: "event_title", x: 48, y: 110, font: "Inter", fontSize: 28, color: "#F8FAFC", align: "left", variable: "{{event_title}}", zIndex: 1 },
      { id: "b3", type: "text", key: "ticket_type", x: 48, y: 165, font: "Inter", fontSize: 16, color: "#38BDF8", align: "left", variable: "{{ticket_type}}", zIndex: 1 },
      { id: "b4", type: "text", key: "guest_name", x: 48, y: 235, font: "Inter", fontSize: 18, color: "#E2E8F0", align: "left", variable: "{{guest_name}}", zIndex: 1 },
      { id: "b5", type: "text", key: "meta", x: 48, y: 285, font: "Inter", fontSize: 13, color: "#94A3B8", align: "left", variable: "{{event_date}} · {{event_time}}", zIndex: 1 },
      { id: "b6", type: "text", key: "venue", x: 48, y: 325, font: "Inter", fontSize: 13, color: "#64748B", align: "left", variable: "{{venue}}", zIndex: 1 },
      { id: "b7", type: "qr", key: "guest_qr", x: 600, y: 130, size: 140, zIndex: 2 },
    ],
  };
}

export function createFestivalPassTicketTemplate(): TemplateSchema {
  return {
    name: "Festival Weekend Pass",
    category: "Ticket",
    style: "Festival",
    productType: "TICKET",
    canvas: { width: 800, height: 400, background: "linear-gradient(135deg, #9a3412 0%, #ea580c 40%, #f59e0b 100%)" },
    colorPalette: { primary: "#FFF7ED", secondary: "#1C1917", background: "#ea580c", text: "#FFFBEB" },
    fontPairing: { heading: "Inter", body: "Inter" },
    variables: ["{{event_title}}", "{{ticket_type}}", "{{guest_name}}", "{{event_date}}", "{{venue}}", "{{qr_code}}"],
    blocks: [
      { id: "b0", type: "pattern_overlay", key: "top", x: 0, y: 0, width: 800, height: 12, color: "#1C1917", zIndex: 0 },
      { id: "b1", type: "pattern_overlay", key: "bot", x: 0, y: 388, width: 800, height: 12, color: "#1C1917", zIndex: 0 },
      { id: "b2", type: "text", key: "label", x: 48, y: 48, font: "Inter", fontSize: 12, color: "#FFEDD5", align: "left", content: "WEEKEND ACCESS", zIndex: 1 },
      { id: "b3", type: "text", key: "event_title", x: 48, y: 105, font: "Inter", fontSize: 28, color: "#FFFBEB", align: "left", variable: "{{event_title}}", zIndex: 1 },
      { id: "b4", type: "text", key: "ticket_type", x: 48, y: 160, font: "Inter", fontSize: 18, color: "#1C1917", align: "left", variable: "{{ticket_type}}", zIndex: 1 },
      { id: "b5", type: "text", key: "guest_name", x: 48, y: 230, font: "Inter", fontSize: 18, color: "#FFF7ED", align: "left", variable: "{{guest_name}}", zIndex: 1 },
      { id: "b6", type: "text", key: "meta", x: 48, y: 285, font: "Inter", fontSize: 13, color: "#FFEDD5", align: "left", variable: "{{event_date}} · {{event_time}}", zIndex: 1 },
      { id: "b7", type: "text", key: "venue", x: 48, y: 325, font: "Inter", fontSize: 13, color: "#FED7AA", align: "left", variable: "{{venue}}", zIndex: 1 },
      { id: "b8", type: "qr", key: "guest_qr", x: 600, y: 120, size: 140, zIndex: 2 },
    ],
  };
}

export function createComedyShowTicketTemplate(): TemplateSchema {
  return {
    name: "Comedy Night Ticket",
    category: "Ticket",
    style: "Comedy",
    productType: "TICKET",
    canvas: { width: 800, height: 400, background: "linear-gradient(145deg, #422006 0%, #78350f 50%, #a16207 100%)" },
    colorPalette: { primary: "#FEF3C7", secondary: "#FDE68A", background: "#78350f", text: "#FFFBEB" },
    fontPairing: { heading: "Inter", body: "Inter" },
    variables: ["{{event_title}}", "{{ticket_type}}", "{{guest_name}}", "{{event_date}}", "{{venue}}", "{{qr_code}}"],
    blocks: [
      { id: "b1", type: "text", key: "label", x: 48, y: 48, font: "Inter", fontSize: 12, color: "#FDE68A", align: "left", content: "STAND-UP · DOORS OPEN", zIndex: 1 },
      { id: "b2", type: "text", key: "event_title", x: 48, y: 110, font: "Inter", fontSize: 28, color: "#FFFBEB", align: "left", variable: "{{event_title}}", zIndex: 1 },
      { id: "b3", type: "text", key: "ticket_type", x: 48, y: 165, font: "Inter", fontSize: 17, color: "#FBBF24", align: "left", variable: "{{ticket_type}}", zIndex: 1 },
      { id: "b4", type: "text", key: "guest_name", x: 48, y: 235, font: "Inter", fontSize: 18, color: "#FEF3C7", align: "left", variable: "{{guest_name}}", zIndex: 1 },
      { id: "b5", type: "text", key: "meta", x: 48, y: 285, font: "Inter", fontSize: 13, color: "#FDE68A", align: "left", variable: "{{event_date}} · {{event_time}}", zIndex: 1 },
      { id: "b6", type: "text", key: "venue", x: 48, y: 325, font: "Inter", fontSize: 13, color: "#FCD34D", align: "left", variable: "{{venue}}", zIndex: 1 },
      { id: "b7", type: "qr", key: "guest_qr", x: 600, y: 130, size: 140, zIndex: 2 },
    ],
  };
}

export function createConferenceBadgeTicketTemplate(): TemplateSchema {
  return {
    name: "Conference Badge Pass",
    category: "Ticket",
    style: "Conference",
    productType: "TICKET",
    canvas: { width: 800, height: 400, background: "linear-gradient(135deg, #1e3a5f 0%, #0F2744 60%, #0c1a2e 100%)" },
    colorPalette: { primary: "#D4AF37", secondary: "#FFFFFF", background: "#0F2744", text: "#FFFFFF" },
    fontPairing: { heading: "Inter", body: "Inter" },
    variables: ["{{event_title}}", "{{ticket_type}}", "{{guest_name}}", "{{event_date}}", "{{venue}}", "{{qr_code}}"],
    blocks: [
      { id: "b0", type: "pattern_overlay", key: "accent", x: 0, y: 0, width: 800, height: 8, color: "#D4AF37", zIndex: 0 },
      { id: "b1", type: "text", key: "label", x: 48, y: 48, font: "Inter", fontSize: 12, color: "#D4AF37", align: "left", content: "CONFERENCE CREDENTIAL", zIndex: 1 },
      { id: "b2", type: "text", key: "event_title", x: 48, y: 105, font: "Inter", fontSize: 26, color: "#FFFFFF", align: "left", variable: "{{event_title}}", zIndex: 1 },
      { id: "b3", type: "text", key: "ticket_type", x: 48, y: 160, font: "Inter", fontSize: 16, color: "#93C5FD", align: "left", variable: "{{ticket_type}}", zIndex: 1 },
      { id: "b4", type: "text", key: "guest_name", x: 48, y: 230, font: "Inter", fontSize: 20, color: "#F8FAFC", align: "left", variable: "{{guest_name}}", zIndex: 1 },
      { id: "b5", type: "text", key: "meta", x: 48, y: 285, font: "Inter", fontSize: 13, color: "#94A3B8", align: "left", variable: "{{event_date}} · {{event_time}}", zIndex: 1 },
      { id: "b6", type: "text", key: "venue", x: 48, y: 325, font: "Inter", fontSize: 13, color: "#64748B", align: "left", variable: "{{venue}}", zIndex: 1 },
      { id: "b7", type: "qr", key: "guest_qr", x: 600, y: 120, size: 140, zIndex: 2 },
    ],
  };
}

export function createChurchProgramTicketTemplate(): TemplateSchema {
  return {
    name: "Church Program Ticket",
    category: "Ticket",
    style: "Church",
    productType: "TICKET",
    canvas: { width: 800, height: 400, background: "linear-gradient(150deg, #3b0764 0%, #581c87 55%, #6b21a8 100%)" },
    colorPalette: { primary: "#D4AF37", secondary: "#E9D5FF", background: "#581c87", text: "#FFFFFF" },
    fontPairing: { heading: "Playfair Display", body: "Cormorant Garamond" },
    variables: ["{{event_title}}", "{{ticket_type}}", "{{guest_name}}", "{{event_date}}", "{{venue}}", "{{qr_code}}"],
    blocks: [
      { id: "b0", type: "frame", key: "edge", x: 18, y: 18, width: 764, height: 364, color: "#D4AF37", zIndex: 0 },
      { id: "b1", type: "text", key: "label", x: 48, y: 52, font: "Cormorant Garamond", fontSize: 14, color: "#D4AF37", align: "left", content: "SPECIAL SERVICE PASS", zIndex: 1 },
      { id: "b2", type: "text", key: "event_title", x: 48, y: 110, font: "Playfair Display", fontSize: 26, color: "#FFFFFF", align: "left", variable: "{{event_title}}", zIndex: 1 },
      { id: "b3", type: "text", key: "ticket_type", x: 48, y: 165, font: "Cormorant Garamond", fontSize: 18, color: "#E9D5FF", align: "left", variable: "{{ticket_type}}", zIndex: 1 },
      { id: "b4", type: "text", key: "guest_name", x: 48, y: 235, font: "Cormorant Garamond", fontSize: 20, color: "#F5F3FF", align: "left", variable: "{{guest_name}}", zIndex: 1 },
      { id: "b5", type: "text", key: "meta", x: 48, y: 285, font: "Cormorant Garamond", fontSize: 14, color: "#D8B4FE", align: "left", variable: "{{event_date}} · {{event_time}}", zIndex: 1 },
      { id: "b6", type: "text", key: "venue", x: 48, y: 325, font: "Cormorant Garamond", fontSize: 14, color: "#C4B5FD", align: "left", variable: "{{venue}}", zIndex: 1 },
      { id: "b7", type: "qr", key: "guest_qr", x: 600, y: 130, size: 140, zIndex: 2 },
    ],
  };
}

export function createBusinessCardTemplate(): TemplateSchema {
  return {
    name: "Elegant Business Card",
    category: "Business Card",
    style: "Minimal",
    productType: "BUSINESS_CARD",
    canvas: { width: 1050, height: 600, background: "linear-gradient(145deg, #f4f9fc 0%, #e8f0f6 100%)" },
    colorPalette: { primary: "#0B8A83", secondary: "#d4a63a", background: "#e8f0f6", text: "#0f172a" },
    fontPairing: { heading: "Playfair Display", body: "Inter" },
    variables: ["{{host_name}}", "{{event_title}}", "{{qr_code}}"],
    blocks: [
      { id: "b1", type: "frame", key: "border", x: 28, y: 28, width: 994, height: 544, color: "#d4a63a", zIndex: 0 },
      { id: "b2", type: "text", key: "host_name", x: 525, y: 200, font: "Playfair Display", fontSize: 42, color: "#0B8A83", align: "center", variable: "{{host_name}}", zIndex: 1 },
      { id: "b3", type: "text", key: "event_title", x: 525, y: 280, font: "Inter", fontSize: 18, color: "#64748b", align: "center", variable: "{{event_title}}", zIndex: 1 },
      { id: "b4", type: "qr", key: "qr", x: 850, y: 380, size: 100, zIndex: 2 },
    ],
  };
}

export function createMidnightExecutiveCardTemplate(): TemplateSchema {
  return {
    name: "Midnight Executive Card",
    category: "Business Card",
    style: "Executive",
    productType: "BUSINESS_CARD",
    canvas: { width: 1050, height: 600, background: "linear-gradient(150deg, #111827 0%, #0f172a 100%)" },
    colorPalette: { primary: "#38bdf8", secondary: "#94a3b8", background: "#0f172a", text: "#f8fafc" },
    fontPairing: { heading: "Cinzel", body: "Inter" },
    variables: ["{{host_name}}", "{{event_title}}", "{{qr_code}}"],
    blocks: [
      { id: "b1", type: "frame", key: "border", x: 24, y: 24, width: 1002, height: 552, color: "#334155", zIndex: 0 },
      { id: "b2", type: "text", key: "host_name", x: 80, y: 180, font: "Cinzel", fontSize: 40, color: "#f8fafc", align: "left", variable: "{{host_name}}", zIndex: 1 },
      { id: "b3", type: "text", key: "event_title", x: 80, y: 260, font: "Inter", fontSize: 18, color: "#94a3b8", align: "left", variable: "{{event_title}}", zIndex: 1 },
      { id: "b4", type: "text", key: "tag", x: 80, y: 340, font: "Inter", fontSize: 14, color: "#38bdf8", align: "left", content: "Scan to connect · Digital card", zIndex: 1 },
      { id: "b5", type: "qr", key: "qr", x: 820, y: 360, size: 120, zIndex: 2 },
    ],
  };
}

export function createGoldFolioCardTemplate(): TemplateSchema {
  return {
    name: "Gold Folio Card",
    category: "Business Card",
    style: "Luxury",
    productType: "BUSINESS_CARD",
    canvas: { width: 1050, height: 600, background: "linear-gradient(145deg, #f7f0e4 0%, #efe2cc 100%)" },
    colorPalette: { primary: "#b45309", secondary: "#d4a63a", background: "#efe2cc", text: "#1c1917" },
    fontPairing: { heading: "Playfair Display", body: "Cormorant Garamond" },
    variables: ["{{host_name}}", "{{event_title}}", "{{qr_code}}"],
    blocks: [
      { id: "b1", type: "frame", key: "border", x: 30, y: 30, width: 990, height: 540, color: "#d4a63a", zIndex: 0 },
      { id: "b2", type: "text", key: "host_name", x: 525, y: 190, font: "Playfair Display", fontSize: 44, color: "#1c1917", align: "center", variable: "{{host_name}}", zIndex: 1 },
      { id: "b3", type: "divider", key: "line", x: 375, y: 250, width: 300, height: 2, color: "#d4a63a", zIndex: 1 },
      { id: "b4", type: "text", key: "event_title", x: 525, y: 300, font: "Cormorant Garamond", fontSize: 22, color: "#78716c", align: "center", variable: "{{event_title}}", zIndex: 1 },
      { id: "b5", type: "qr", key: "qr", x: 860, y: 400, size: 100, zIndex: 2 },
    ],
  };
}

export function createTealPulseCardTemplate(): TemplateSchema {
  return {
    name: "Teal Pulse Card",
    category: "Business Card",
    style: "Modern",
    productType: "BUSINESS_CARD",
    canvas: { width: 1050, height: 600, background: "linear-gradient(140deg, #0B8A83 0%, #0f766e 100%)" },
    colorPalette: { primary: "#fbbf24", secondary: "#ccfbf1", background: "#0B8A83", text: "#ffffff" },
    fontPairing: { heading: "Inter", body: "Inter" },
    variables: ["{{host_name}}", "{{event_title}}", "{{qr_code}}"],
    blocks: [
      { id: "b1", type: "text", key: "host_name", x: 80, y: 200, font: "Inter", fontSize: 40, color: "#ffffff", align: "left", variable: "{{host_name}}", zIndex: 1 },
      { id: "b2", type: "text", key: "event_title", x: 80, y: 270, font: "Inter", fontSize: 18, color: "#ccfbf1", align: "left", variable: "{{event_title}}", zIndex: 1 },
      { id: "b3", type: "text", key: "cta", x: 80, y: 360, font: "Inter", fontSize: 14, color: "#fbbf24", align: "left", content: "One link · All contacts · NFC ready", zIndex: 1 },
      { id: "b4", type: "qr", key: "qr", x: 820, y: 360, size: 120, zIndex: 2 },
    ],
  };
}

export function createCharcoalMinimalCardTemplate(): TemplateSchema {
  return {
    name: "Charcoal Minimal Card",
    category: "Business Card",
    style: "Minimal",
    productType: "BUSINESS_CARD",
    canvas: { width: 1050, height: 600, background: "#fafafa" },
    colorPalette: { primary: "#18181b", secondary: "#71717a", background: "#fafafa", text: "#18181b" },
    fontPairing: { heading: "Inter", body: "Inter" },
    variables: ["{{host_name}}", "{{event_title}}", "{{qr_code}}"],
    blocks: [
      { id: "b1", type: "frame", key: "border", x: 40, y: 40, width: 970, height: 520, color: "#e4e4e7", zIndex: 0 },
      { id: "b2", type: "text", key: "host_name", x: 100, y: 220, font: "Inter", fontSize: 36, color: "#18181b", align: "left", variable: "{{host_name}}", zIndex: 1 },
      { id: "b3", type: "text", key: "event_title", x: 100, y: 290, font: "Inter", fontSize: 16, color: "#71717a", align: "left", variable: "{{event_title}}", zIndex: 1 },
      { id: "b4", type: "qr", key: "qr", x: 840, y: 380, size: 100, zIndex: 2 },
    ],
  };
}

export function createSavannahWarmCardTemplate(): TemplateSchema {
  return {
    name: "Savannah Warm Card",
    category: "Business Card",
    style: "Warm",
    productType: "BUSINESS_CARD",
    canvas: { width: 1050, height: 600, background: "linear-gradient(145deg, #fffbeb 0%, #ffedd5 100%)" },
    colorPalette: { primary: "#c2410c", secondary: "#9a3412", background: "#ffedd5", text: "#431407" },
    fontPairing: { heading: "Playfair Display", body: "Inter" },
    variables: ["{{host_name}}", "{{event_title}}", "{{qr_code}}"],
    blocks: [
      { id: "b1", type: "frame", key: "border", x: 26, y: 26, width: 998, height: 548, color: "#fdba74", zIndex: 0 },
      { id: "b2", type: "text", key: "host_name", x: 525, y: 210, font: "Playfair Display", fontSize: 42, color: "#431407", align: "center", variable: "{{host_name}}", zIndex: 1 },
      { id: "b3", type: "text", key: "event_title", x: 525, y: 290, font: "Inter", fontSize: 18, color: "#9a3412", align: "center", variable: "{{event_title}}", zIndex: 1 },
      { id: "b4", type: "qr", key: "qr", x: 850, y: 390, size: 100, zIndex: 2 },
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
  createConcertNightTicketTemplate(),
  createSportsMatchTicketTemplate(),
  createProductLaunchTicketTemplate(),
  createFestivalPassTicketTemplate(),
  createComedyShowTicketTemplate(),
  createConferenceBadgeTicketTemplate(),
  createChurchProgramTicketTemplate(),
  createBusinessCardTemplate(),
  createMidnightExecutiveCardTemplate(),
  createGoldFolioCardTemplate(),
  createTealPulseCardTemplate(),
  createCharcoalMinimalCardTemplate(),
  createSavannahWarmCardTemplate(),
  createKenteWeddingTemplate(),
  createBirthdayPopTemplate(),
  createChurchPurpleTemplate(),
];

export const SCHEMA_BY_NAME: Record<string, TemplateSchema> = Object.fromEntries(
  DEFAULT_TEMPLATE_SCHEMAS.map((s) => [s.name, s])
);
