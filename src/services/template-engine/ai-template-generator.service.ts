import { prisma } from "@/lib/prisma";
import type { Prisma, AiRequestStatus } from "@prisma/client";
import type { TemplateSchema } from "@/types/template-engine";
import { THEME_PRESETS } from "@/lib/template-constants";
/**
 * AI Template Generator — MVP mock with production-ready interface.
 * Connect OpenAI / Anthropic / Replicate / Stability via AI_PROVIDER env.
 */
export interface AiGenerateInput {
  userId: string;
  eventId?: string;
  prompt: string;
}

export interface AiGenerateResult {
  requestId: string;
  schema: TemplateSchema;
  suggestedColors: string[];
  suggestedFonts: { heading: string; body: string; script?: string };
  suggestedWording: string;
  decorativeElements: string[];
  previewDescription: string;
}

export class AiTemplateGeneratorService {
  private parsePrompt(prompt: string) {
    const lower = prompt.toLowerCase();
    const category = lower.includes("funeral") ? "Funeral"
      : lower.includes("birthday") ? "Birthday"
      : lower.includes("corporate") || lower.includes("conference") ? "Corporate"
      : lower.includes("church") ? "Church"
      : lower.includes("ticket") ? "Ticket"
      : lower.includes("business card") ? "Business Card"
      : "Wedding";

    const style = lower.includes("futuristic") ? "Futuristic"
      : lower.includes("kente") || lower.includes("ghanaian") ? "Traditional Ghanaian"
      : lower.includes("floral") ? "Floral"
      : lower.includes("minimal") ? "Minimal"
      : lower.includes("luxury") || lower.includes("premium") ? "Luxury"
      : lower.includes("royal") ? "Royal"
      : "Classic";

    const productType = lower.includes("flyer") ? "FLYER"
      : lower.includes("ticket") ? "TICKET"
      : lower.includes("business card") ? "BUSINESS_CARD"
      : lower.includes("story") ? "SOCIAL_STORY"
      : lower.includes("instagram") || lower.includes("social") ? "SOCIAL_POST"
      : "INVITATION";

    const theme = lower.includes("teal") ? THEME_PRESETS[0]
      : lower.includes("black") || lower.includes("royal") ? THEME_PRESETS[1]
      : lower.includes("kente") ? THEME_PRESETS[3]
      : lower.includes("funeral") ? THEME_PRESETS[4]
      : lower.includes("neon") || lower.includes("futuristic") ? THEME_PRESETS[9]
      : THEME_PRESETS[0];

    const hasQr = lower.includes("qr");
    const hasRsvp = lower.includes("rsvp");

    return { category, style, productType, theme, hasQr, hasRsvp };
  }

  async createRequest(input: AiGenerateInput) {
    return prisma.aiDesignRequest.create({
      data: { userId: input.userId, eventId: input.eventId, prompt: input.prompt, status: "PENDING" },
    });
  }

  async generate(input: AiGenerateInput): Promise<AiGenerateResult> {
    const request = await this.createRequest(input);

    await prisma.aiDesignRequest.update({
      where: { id: request.id },
      data: { status: "PROCESSING" },
    });

    try {
      const parsed = this.parsePrompt(input.prompt);
      const colors = parsed.theme.colors;

      const schema: TemplateSchema = {
        name: `AI: ${parsed.style} ${parsed.category}`,
        category: parsed.category,
        style: parsed.style,
        productType: parsed.productType,
        canvas: {
          width: parsed.productType === "TICKET" ? 800 : parsed.productType === "BUSINESS_CARD" ? 1050 : 1080,
          height: parsed.productType === "TICKET" ? 400 : parsed.productType === "BUSINESS_CARD" ? 600 : 1350,
          background: colors.background,
        },
        colorPalette: colors,
        fontPairing: parsed.style === "Luxury" || parsed.style === "Royal"
          ? { heading: "Cinzel", body: "Cormorant Garamond", script: "Great Vibes" }
          : parsed.style === "Futuristic"
          ? { heading: "Inter", body: "Inter" }
          : { heading: "Playfair Display", body: "Cormorant Garamond", script: "Great Vibes" },
        variables: ["{{guest_name}}", "{{event_title}}", "{{event_date}}", "{{venue}}", "{{host_name}}"],
        blocks: [
          { id: "ai-1", type: "text", key: "intro", x: 540, y: 120, font: "Cormorant Garamond", fontSize: 22, color: colors.secondary, align: "center", content: "You are cordially invited", zIndex: 1 },
          { id: "ai-2", type: "text", key: "event_title", x: 540, y: 300, font: "Cinzel", fontSize: 52, color: colors.text, align: "center", variable: "{{event_title}}", zIndex: 2 },
          { id: "ai-3", type: "text", key: "event_date", x: 540, y: 500, font: "Cormorant Garamond", fontSize: 28, color: colors.text, align: "center", variable: "{{event_date}}", zIndex: 2 },
          { id: "ai-4", type: "text", key: "venue", x: 540, y: 580, font: "Cormorant Garamond", fontSize: 24, color: colors.secondary, align: "center", variable: "{{venue}}", zIndex: 2 },
          ...(parsed.hasQr ? [{ id: "ai-5", type: "qr" as const, key: "guest_qr", x: 820, y: 1080, size: 160, zIndex: 3 }] : []),
          ...(parsed.hasRsvp ? [{ id: "ai-6", type: "rsvp_button" as const, key: "rsvp", x: 540, y: 900, width: 280, height: 56, zIndex: 3 }] : []),
        ],
      };

      const result: AiGenerateResult = {
        requestId: request.id,
        schema,
        suggestedColors: [colors.primary, colors.secondary, colors.background, colors.text],
        suggestedFonts: schema.fontPairing!,
        suggestedWording: `Join us for a ${parsed.style.toLowerCase()} ${parsed.category.toLowerCase()} celebration`,
        decorativeElements: parsed.style === "Floral" ? ["watercolor florals", "gold frame"]
          : parsed.style === "Traditional Ghanaian" ? ["kente border", "adinkra symbols"]
          : parsed.style === "Futuristic" ? ["neon glow", "geometric lines"]
          : ["elegant divider", "premium frame"],
        previewDescription: `${parsed.style} ${parsed.category} design with ${parsed.theme.name} palette`,
      };

      await prisma.aiDesignRequest.update({
        where: { id: request.id },
        data: { status: "COMPLETED", result: result as unknown as Prisma.InputJsonValue },
      });

      return result;
    } catch (error) {
      await prisma.aiDesignRequest.update({
        where: { id: request.id },
        data: { status: "FAILED", error: error instanceof Error ? error.message : "Generation failed" },
      });
      throw error;
    }
  }
}

export const aiTemplateGeneratorService = new AiTemplateGeneratorService();
