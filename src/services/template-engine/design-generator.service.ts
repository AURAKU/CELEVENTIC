import { prisma } from "@/lib/prisma";
import type { Prisma, TemplateProductType } from "@prisma/client";
import { templateEngineService } from "./template-engine.service";
import { buildRenderContextFromEvent } from "@/lib/template-variables";
import { personalizeText } from "@/lib/template-variables";
import type { TemplateBlock, TemplateSchema } from "@/types/template-engine";
import { EXPORT_DIMENSIONS } from "@/types/template-engine";
import { parsePaginationInput, paginatedResult } from "@/lib/pagination";

export interface GenerateEventDesignsInput {
  userId: string;
  eventId: string;
  templateId: string;
  outputs?: TemplateProductType[];
}

const DEFAULT_OUTPUTS: TemplateProductType[] = [
  "INVITATION", "FLYER", "TICKET", "SOCIAL_POST", "SOCIAL_STORY", "WHATSAPP_SHARE",
];

export class DesignGeneratorService {
  async generateFromEvent(input: GenerateEventDesignsInput) {
    const [event, template, sampleGuest] = await Promise.all([
      prisma.event.findUnique({
        where: { id: input.eventId },
        include: { package: true },
      }),
      templateEngineService.getById(input.templateId),
      prisma.guest.findFirst({ where: { eventId: input.eventId }, orderBy: { createdAt: "asc" } }),
    ]);

    if (!event) throw new Error("Event not found");
    if (!template) throw new Error("Template not found");

    const ctx = buildRenderContextFromEvent(
      event,
      sampleGuest ? { name: sampleGuest.name, qrToken: sampleGuest.qrToken ?? undefined } : undefined
    );
    const baseBlocks = template.blocks as unknown as TemplateBlock[];
    const personalizedBlocks = baseBlocks.map((b) => ({
      ...b,
      content: b.content ? personalizeText(b.content, ctx) : b.content,
      variable: b.variable ? personalizeText(b.variable, ctx) : b.variable,
    }));

    const outputs = input.outputs ?? DEFAULT_OUTPUTS;
    const designs = [];

    for (const productType of outputs) {
      const dims = this.dimensionsFor(productType);
      const config: TemplateSchema = {
        name: `${event.title} — ${productType}`,
        category: template.category,
        style: template.style,
        productType,
        canvas: {
          ...(template.canvas as unknown as TemplateSchema["canvas"]),
          width: dims.width,
          height: dims.height,
        },
        blocks: personalizedBlocks,
        colorPalette: template.colorPalette as Record<string, string>,
        fontPairing: template.fontPairing as TemplateSchema["fontPairing"],
      };

      const design = await prisma.generatedDesign.create({
        data: {
          userId: input.userId,
          eventId: input.eventId,
          templateId: template.id,
          productType,
          name: config.name,
          config: config as unknown as Prisma.InputJsonValue,
          status: "DRAFT",
        },
      });

      await prisma.designVersion.create({
        data: { generatedDesignId: design.id, version: 1, config: config as unknown as Prisma.InputJsonValue },
      });

      designs.push(design);
    }

    await templateEngineService.incrementPopularity(template.id);
    return designs;
  }

  private dimensionsFor(productType: TemplateProductType) {
    switch (productType) {
      case "SOCIAL_POST":
      case "WHATSAPP_SHARE":
        return EXPORT_DIMENSIONS.SQUARE_POST;
      case "SOCIAL_STORY":
        return EXPORT_DIMENSIONS.STORY;
      case "TICKET":
        return EXPORT_DIMENSIONS.TICKET_PASS;
      case "BUSINESS_CARD":
      case "COMPLIMENTARY_CARD":
        return EXPORT_DIMENSIONS.BUSINESS_CARD;
      case "FLYER":
        return EXPORT_DIMENSIONS.A4_FLYER;
      default:
        return EXPORT_DIMENSIONS.PORTRAIT_POST;
    }
  }

  async getUserDesigns(userId: string, eventId?: string, page = 1, limit = 12) {
    const { page: p, limit: take, skip } = parsePaginationInput(
      { page, limit },
      { limit: 12, maxLimit: 100 }
    );
    const where = { userId, ...(eventId ? { eventId } : {}) };
    const [items, total] = await Promise.all([
      prisma.generatedDesign.findMany({
        where,
        include: { template: { select: { name: true, thumbnailUrl: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.generatedDesign.count({ where }),
    ]);
    return paginatedResult(items, total, p, take);
  }
}

export const designGeneratorService = new DesignGeneratorService();
