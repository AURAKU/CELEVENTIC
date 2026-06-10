import type { InvitationDesignConfig, InvitationLayoutSlug, MediaType } from "@/types/invitation-design";

export interface InvitationTemplatePreset {
  slug: InvitationLayoutSlug;
  name: string;
  description: string;
  category: string;
  preview: {
    gradient: string;
    accent: string;
  };
  config: InvitationDesignConfig;
}

export const INVITATION_TEMPLATE_PRESETS: InvitationTemplatePreset[] = [
  {
    slug: "classic-gold",
    name: "Classic Gold Frame",
    description: "Photo hero with elegant gold border — timeless wedding style",
    category: "wedding",
    preview: { gradient: "from-stone-100 to-white", accent: "#B89E67" },
    config: {
      layout: "classic-gold",
      colors: { primary: "#1a1a1a", secondary: "#B89E67", accent: "#D4AF37", background: "#FFFFFF", text: "#333333" },
      fonts: { heading: "Playfair Display", script: "Cormorant Garamond", body: "Inter" },
      animation: "fade",
      ornament: "gold-frame",
      introText: "together with their families",
    },
  },
  {
    slug: "arch-green",
    name: "Arch & Vine",
    description: "Forest green arched card with delicate vine illustrations",
    category: "wedding",
    preview: { gradient: "from-emerald-900 to-emerald-950", accent: "#F5F0E6" },
    config: {
      layout: "arch-green",
      colors: { primary: "#F5F0E6", secondary: "#1B3022", accent: "#C9B896", background: "#1B3022", text: "#F5F0E6" },
      fonts: { heading: "Cinzel", script: "Great Vibes", body: "Cormorant Garamond" },
      animation: "fade",
      ornament: "vine",
      introText: "request the pleasure of your company",
    },
  },
  {
    slug: "rustic-lace",
    name: "Rustic Lace",
    description: "Warm wood texture with ornate lace borders",
    category: "wedding",
    preview: { gradient: "from-amber-900 to-amber-950", accent: "#FFFFFF" },
    config: {
      layout: "rustic-lace",
      colors: { primary: "#FFFFFF", secondary: "#3D2314", accent: "#F8F4EF", background: "#3D2314", text: "#FFFFFF" },
      fonts: { heading: "Playfair Display", script: "Great Vibes", body: "Cormorant Garamond" },
      animation: "parallax",
      ornament: "lace",
      introText: "together with our parents, we invite you to share in our happiness",
    },
  },
  {
    slug: "boho-hexagon",
    name: "Boho Hexagon",
    description: "Soft florals with gold hexagonal frame — modern romantic",
    category: "wedding",
    preview: { gradient: "from-rose-50 to-amber-50", accent: "#B89E67" },
    config: {
      layout: "boho-hexagon",
      colors: { primary: "#4A4A4A", secondary: "#B89E67", accent: "#D4A5A5", background: "#F9F7F2", text: "#4A4A4A" },
      fonts: { heading: "Great Vibes", script: "Great Vibes", body: "Cormorant Garamond" },
      animation: "ken-burns",
      ornament: "hexagon",
      introText: "join us for the wedding of",
    },
  },
  {
    slug: "luxury-rings",
    name: "Luxury Rings",
    description: "High-contrast luxury with interlocking rings motif",
    category: "wedding",
    preview: { gradient: "from-neutral-900 to-black", accent: "#D4AF37" },
    config: {
      layout: "luxury-rings",
      colors: { primary: "#FFFFFF", secondary: "#D4AF37", accent: "#C9A227", background: "#0a0a0a", text: "#F5F5F5" },
      fonts: { heading: "Cinzel", script: "Great Vibes", body: "Inter" },
      animation: "fade",
      ornament: "gold-frame",
      introText: "invite you to share this magical moment",
    },
  },
  {
    slug: "custom-media",
    name: "Build From Your Sample",
    description: "Upload your image, PDF, or video — we frame it beautifully",
    category: "custom",
    preview: { gradient: "from-teal-600 to-teal-800", accent: "#FFFFFF" },
    config: {
      layout: "custom-media",
      colors: { primary: "#0D9488", secondary: "#D4AF37", accent: "#14B8A6", background: "#F0FDFA", text: "#134E4A" },
      fonts: { heading: "Playfair Display", script: "Great Vibes", body: "Inter" },
      animation: "ken-burns",
      ornament: "floral",
      buildMode: "inspired",
      introText: "you are cordially invited",
    },
  },
];

export function getTemplatePreset(slug: string): InvitationTemplatePreset | undefined {
  return INVITATION_TEMPLATE_PRESETS.find((t) => t.slug === slug);
}

export function getDefaultDesignConfig(templateSlug?: string): InvitationDesignConfig {
  const preset = templateSlug ? getTemplatePreset(templateSlug) : INVITATION_TEMPLATE_PRESETS[0];
  return preset?.config ?? INVITATION_TEMPLATE_PRESETS[0].config;
}

export function mergeDesignConfig(
  base: InvitationDesignConfig,
  overrides?: Partial<InvitationDesignConfig>
): InvitationDesignConfig {
  if (!overrides) return base;
  return {
    ...base,
    ...overrides,
    colors: { ...base.colors, ...overrides.colors },
    fonts: { ...base.fonts, ...overrides.fonts },
    media: overrides.media ?? base.media,
  };
}

export function parseCoupleNames(title: string, hostName: string) {
  const cleaned = title
    .replace(/the\s+wedding\s+(and\s+reception\s+)?of\s+/i, "")
    .replace(/wedding\s+of\s+/i, "")
    .trim();
  const match = cleaned.match(/^(.+?)\s*[&+]\s*(.+)$/i);
  if (match) return { name1: match[1].trim(), name2: match[2].trim() };
  const hostParts = hostName.split(/\s*[&+]\s*/);
  if (hostParts.length >= 2) return { name1: hostParts[0].trim(), name2: hostParts[1].trim() };
  return { name1: cleaned || hostName, name2: "" };
}

export function formatInvitationDateParts(dateStr: string) {
  const d = new Date(dateStr);
  return {
    day: d.getDate(),
    month: d.toLocaleString("en", { month: "long" }),
    monthShort: d.toLocaleString("en", { month: "short" }),
    year: d.getFullYear(),
    time: d.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit", hour12: true }),
    weekday: d.toLocaleString("en", { weekday: "long" }),
    formatted: new Intl.DateTimeFormat("en-GH", { dateStyle: "medium", timeStyle: "short" }).format(d),
  };
}

export function suggestLayoutFromUpload(type: MediaType): InvitationLayoutSlug {
  if (type === "video") return "custom-media";
  if (type === "pdf") return "classic-gold";
  return "custom-media";
}
