export type TemplateBlockType =
  | "text"
  | "image"
  | "qr"
  | "rsvp_button"
  | "pattern_overlay"
  | "frame"
  | "logo"
  | "divider";

export interface TemplateCanvas {
  width: number;
  height: number;
  background: string;
  backgroundImage?: string;
}

export interface TemplateBlock {
  id: string;
  type: TemplateBlockType;
  key: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  size?: number;
  font?: string;
  fontSize?: number;
  color?: string;
  align?: "left" | "center" | "right";
  content?: string;
  variable?: string;
  visible?: boolean;
  zIndex?: number;
}

export interface TemplateSchema {
  template_id?: string;
  name: string;
  category: string;
  style: string;
  productType: string;
  canvas: TemplateCanvas;
  blocks: TemplateBlock[];
  colorPalette?: Record<string, string>;
  fontPairing?: { heading: string; body: string; script?: string };
  variables?: string[];
}

export interface TemplateRenderContext {
  event_title?: string;
  host_name?: string;
  event_date?: string;
  event_time?: string;
  venue?: string;
  landmark?: string;
  dress_code?: string;
  guest_name?: string;
  qr_code?: string;
  rsvp_link?: string;
  ticket_type?: string;
  maps_link?: string;
  [key: string]: string | undefined;
}

export const TEMPLATE_VARIABLES = [
  "{{guest_name}}",
  "{{event_title}}",
  "{{event_date}}",
  "{{event_time}}",
  "{{venue}}",
  "{{landmark}}",
  "{{host_name}}",
  "{{dress_code}}",
  "{{qr_code}}",
  "{{rsvp_link}}",
  "{{ticket_type}}",
] as const;

export const EXPORT_DIMENSIONS = {
  SQUARE_POST: { width: 1080, height: 1080, label: "Square Post" },
  PORTRAIT_POST: { width: 1080, height: 1350, label: "Portrait Post" },
  STORY: { width: 1080, height: 1920, label: "Story / Reel" },
  A5_INVITE: { width: 1748, height: 2480, label: "A5 Invitation" },
  A4_FLYER: { width: 2480, height: 3508, label: "A4 Flyer" },
  TICKET_PASS: { width: 800, height: 400, label: "Ticket Pass" },
  BUSINESS_CARD: { width: 1050, height: 600, label: "Business Card" },
} as const;
