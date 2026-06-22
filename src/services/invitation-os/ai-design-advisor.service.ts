import { CATALOG_TEMPLATES } from "@/lib/invitation-mvp/catalogue";
import { catalogService } from "@/services/commerce/catalog.service";

export interface DesignAdvisorInput {
  eventType: string;
  guestCount?: number;
  style?: string;
  budgetGhs?: number;
  colors?: string[];
}

export interface DesignAdvisorOutput {
  recommendedTemplates: { slug: string; name: string; score: number; reason: string }[];
  recommendedPackage: { slug: string; name: string; reason: string };
  fontPairing: { heading: string; body: string };
  colorPalette: { primary: string; accent: string; background: string };
  suggestedBlockOrder: string[];
  suggestedAddons: { slug: string; name: string; reason: string }[];
}

const STYLE_PALETTES: Record<string, DesignAdvisorOutput["colorPalette"]> = {
  luxury: { primary: "#0F172A", accent: "#D4A63A", background: "#FAF8F4" },
  kente: { primary: "#0B8A83", accent: "#D4A63A", background: "#FFF8E7" },
  modern: { primary: "#1E293B", accent: "#0B8A83", background: "#F8FAFC" },
  romantic: { primary: "#4A1942", accent: "#E8B4B8", background: "#FFF5F5" },
  corporate: { primary: "#0F172A", accent: "#0B8A83", background: "#FFFFFF" },
};

export class AiDesignAdvisorService {
  async suggest(input: DesignAdvisorInput): Promise<DesignAdvisorOutput> {
    const packages = await catalogService.getActivePackages();
    const addons = await catalogService.getActiveAddons();

    const styleKey = this.inferStyleKey(input.style, input.eventType);
    const palette = STYLE_PALETTES[styleKey] ?? STYLE_PALETTES.luxury;

    const templates = CATALOG_TEMPLATES.map((t) => {
      let score = 50;
      if (t.category.toUpperCase().includes(input.eventType.split("_")[0])) score += 25;
      if (input.style && t.style.toLowerCase().includes(input.style.toLowerCase())) score += 20;
      if (t.isPremium && (input.budgetGhs ?? 0) > 400) score += 15;
      if (!t.isPremium && (input.budgetGhs ?? 0) < 200) score += 10;
      return {
        slug: t.slug,
        name: t.name,
        score,
        reason: `${t.style} template for ${t.category} — ${t.description.slice(0, 60)}`,
      };
    })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    let pkgSlug = "celebration";
    if (input.eventType === "FUNERAL" || input.guestCount && input.guestCount > 300) pkgSlug = "signature";
    if ((input.budgetGhs ?? 0) > 1500) pkgSlug = "bespoke";
    if ((input.budgetGhs ?? 0) < 100) pkgSlug = "starter";
    const pkg = packages.find((p: { slug: string }) => p.slug === pkgSlug) ?? packages[0];

    const suggestedAddons = addons
      .filter((a: { slug: string }) => {
        if (input.guestCount && input.guestCount > 100 && a.slug.includes("whatsapp")) return true;
        if (input.eventType === "WEDDING" && a.slug.includes("gallery")) return true;
        if (input.eventType === "CORPORATE_EVENT" && a.slug.includes("qr")) return true;
        if (styleKey === "luxury" && a.slug.includes("monogram")) return true;
        return false;
      })
      .slice(0, 5)
      .map((a: { slug: string; name: string; description: string | null }) => ({
        slug: a.slug,
        name: a.name,
        reason: a.description ?? "Enhances your celebration experience",
      }));

    return {
      recommendedTemplates: templates,
      recommendedPackage: {
        slug: pkg.slug,
        name: pkg.name,
        reason: pkg.description ?? "Best match for your event",
      },
      fontPairing: {
        heading: styleKey === "corporate" ? "Inter" : "Playfair Display",
        body: "Source Sans 3",
      },
      colorPalette: palette,
      suggestedBlockOrder: [
        "HERO", "COUNTDOWN", "STORY", "SCHEDULE", "VENUE_MAP", "GALLERY", "RSVP", "QR_GUEST_PASS", "FOOTER",
      ],
      suggestedAddons,
    };
  }

  private inferStyleKey(style?: string, eventType?: string): string {
    const s = (style ?? "").toLowerCase();
    if (s.includes("kente") || s.includes("ghana")) return "kente";
    if (s.includes("modern") || s.includes("minimal")) return "modern";
    if (s.includes("romantic") || s.includes("floral")) return "romantic";
    if (eventType?.includes("CORPORATE")) return "corporate";
    if (s.includes("luxury") || s.includes("gold")) return "luxury";
    return "luxury";
  }
}

export const aiDesignAdvisorService = new AiDesignAdvisorService();
