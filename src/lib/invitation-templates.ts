import type { InvitationDesignConfig, InvitationLayoutSlug, MediaType } from "@/types/invitation-design";
import { CINEMATIC_THEMES, CINEMATIC_LAYOUT_SLUGS } from "@/lib/invitation/cinematic-themes";
import { enrichDesignWithExperienceDNA } from "@/lib/experience/experience-engine-v2";
import { CATALOG_TEMPLATES, getCatalogTemplate } from "@/lib/invitation-mvp/catalogue";

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
    name: "Gilded Opulence",
    description: "Ivory card with hand-finished gold frame and serif vows",
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
    name: "Vine Cathedral",
    description: "Forest arch illustration with cream calligraphy on emerald",
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
    name: "Timber & Lace",
    description: "Full-bleed photo under ornate lace with warm wood tones",
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
    name: "Hexagon Reverie",
    description: "Soft florals inside a floating gold hexagon frame",
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
    name: "Onyx & Gold Vows",
    description: "High-contrast black stage with interlocking rings spotlight",
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
    name: "Your Canvas",
    description: "Upload your image, PDF, or video — framed cinematically",
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
  {
    slug: "passport-luxe",
    name: "Stamped Romance",
    description: "Passport booklet reveal with visa stamps for destination love",
    category: "wedding",
    preview: { gradient: "from-teal-900 to-slate-900", accent: "#D4A63A" },
    config: {
      layout: "passport-luxe",
      colors: { primary: "#0F172A", secondary: "#D4A63A", accent: "#0B8A83", background: "#F8FAFC", text: "#1e293b" },
      fonts: { heading: "Cinzel", script: "Cormorant Garamond", body: "Inter" },
      animation: "fade",
      ornament: "gold-frame",
      introText: "Official invitation",
      studio: { revealMode: "passport", buttonStyle: "gold", fullScreen: true },
    },
  },
  {
    slug: "glass-acrylic",
    name: "Frostlight Dreamscape",
    description: "Frosted acrylic layers with luminous depth",
    category: "wedding",
    preview: { gradient: "from-sky-900 to-teal-800", accent: "#7dd3fc" },
    config: {
      layout: "glass-acrylic",
      colors: { primary: "#f8fafc", secondary: "#7dd3fc", accent: "#38bdf8", background: "rgba(255,255,255,0.08)", text: "#f1f5f9" },
      fonts: { heading: "Inter", script: "Great Vibes", body: "Inter" },
      animation: "ken-burns",
      ornament: "none",
      introText: "You are invited",
      studio: { revealMode: "glass", buttonStyle: "glass", fullScreen: true },
    },
  },
  {
    slug: "floral-garden",
    name: "Secret Garden",
    description: "Botanical borders with blush typography and petal motion",
    category: "wedding",
    preview: { gradient: "from-rose-100 to-pink-50", accent: "#be185d" },
    config: {
      layout: "floral-garden",
      colors: { primary: "#881337", secondary: "#be185d", accent: "#fda4af", background: "#fff1f2", text: "#4c0519" },
      fonts: { heading: "Great Vibes", script: "Great Vibes", body: "Cormorant Garamond" },
      animation: "fade",
      ornament: "floral",
      introText: "Together with their families",
      studio: { revealMode: "scratch", buttonStyle: "pill", fullScreen: true },
    },
  },
  ...CINEMATIC_LAYOUT_SLUGS.map((slug) => {
    const t = CINEMATIC_THEMES[slug];
    return {
      slug,
      name: t.name,
      description: t.tagline,
      category: t.category.toLowerCase(),
      preview: { gradient: t.previewGradient, accent: t.config.colors.secondary },
      config: t.config,
    } satisfies InvitationTemplatePreset;
  }),
];

export function getTemplatePreset(slug: string): InvitationTemplatePreset | undefined {
  const resolved = getCatalogTemplate(slug)?.layoutSlug ?? slug;
  return INVITATION_TEMPLATE_PRESETS.find((t) => t.slug === resolved);
}

/** One picker entry per catalogue template — no duplicate layouts or titles */
export function getUniqueTemplatePresets(): InvitationTemplatePreset[] {
  return CATALOG_TEMPLATES.map((catalog) => {
    const preset = getTemplatePreset(catalog.layoutSlug);
    const gradient = catalog.previewGradient.includes("from-")
      ? catalog.previewGradient
      : `from-slate-100 ${catalog.previewGradient}`;
    if (preset) {
      return {
        ...preset,
        slug: catalog.layoutSlug as InvitationLayoutSlug,
        name: catalog.name,
        description: catalog.description,
        category: catalog.category.toLowerCase(),
        preview: { ...preset.preview, gradient },
      };
    }
    return {
      slug: catalog.layoutSlug as InvitationLayoutSlug,
      name: catalog.name,
      description: catalog.description,
      category: catalog.category.toLowerCase(),
      preview: { gradient, accent: "#0B8A83" },
      config: getDefaultDesignConfig(catalog.layoutSlug),
    };
  });
}

export function getDefaultDesignConfig(templateSlug?: string): InvitationDesignConfig {
  const catalog = templateSlug ? getCatalogTemplate(templateSlug) : undefined;
  const layoutSlug = catalog?.layoutSlug ?? templateSlug;
  const preset = layoutSlug ? getTemplatePreset(layoutSlug) : INVITATION_TEMPLATE_PRESETS[0];
  const base = preset?.config ?? INVITATION_TEMPLATE_PRESETS[0].config;
  const { experience: _strip, ...baseWithoutStaleExperience } = base;
  return enrichDesignWithExperienceDNA({
    ...baseWithoutStaleExperience,
    studio: { fullScreen: true, ...base.studio },
  });
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
