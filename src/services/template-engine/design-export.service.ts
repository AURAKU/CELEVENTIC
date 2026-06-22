import { prisma } from "@/lib/prisma";
import type { ExportFormat } from "@prisma/client";
import type { TemplateBlock, TemplateCanvas, TemplateSchema } from "@/types/template-engine";
import { EXPORT_DIMENSIONS } from "@/types/template-engine";
import { renderTemplateToSvg } from "@/lib/template-render-svg";
import { buildRenderContextFromEvent } from "@/lib/template-variables";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export interface ExportDesignInput {
  userId: string;
  templateId?: string;
  designId?: string;
  eventId?: string;
  format: ExportFormat;
  dimensionKey?: keyof typeof EXPORT_DIMENSIONS;
  config?: TemplateSchema;
}

export class DesignExportService {
  private async assertExportAccess(input: ExportDesignInput) {
    if (input.designId) {
      const design = await prisma.generatedDesign.findUnique({ where: { id: input.designId } });
      if (!design || design.userId !== input.userId) throw new Error("Design not found");
      return;
    }

    if (input.templateId) {
      const template = await prisma.designTemplate.findUnique({ where: { id: input.templateId } });
      if (!template) throw new Error("Template not found");
      if (template.isPremium && template.createdById !== input.userId) {
        const owned = await prisma.templatePurchase.findFirst({
          where: { templateId: input.templateId, userId: input.userId },
        });
        if (!owned) throw new Error("Template not purchased");
      }
    }

    if (input.eventId) {
      const event = await prisma.event.findFirst({
        where: { id: input.eventId, organizerId: input.userId },
      });
      if (!event) throw new Error("Event not found or access denied");
    }
  }

  async createExport(input: ExportDesignInput) {
    await this.assertExportAccess(input);

    const dims = input.dimensionKey ? EXPORT_DIMENSIONS[input.dimensionKey] : EXPORT_DIMENSIONS.PORTRAIT_POST;

    let canvas: TemplateCanvas;
    let blocks: TemplateBlock[];
    let context = {};

    if (input.designId) {
      const design = await prisma.generatedDesign.findUnique({ where: { id: input.designId } });
      if (!design) throw new Error("Design not found");
      const config = design.config as unknown as TemplateSchema;
      canvas = config.canvas;
      blocks = config.blocks;
    } else if (input.config) {
      canvas = input.config.canvas;
      blocks = input.config.blocks;
    } else if (input.templateId) {
      const template = await prisma.designTemplate.findUnique({ where: { id: input.templateId } });
      if (!template) throw new Error("Template not found");
      canvas = template.canvas as unknown as TemplateCanvas;
      blocks = template.blocks as unknown as TemplateBlock[];
    } else {
      throw new Error("designId, config, or templateId required");
    }

    if (input.eventId) {
      const event = await prisma.event.findUnique({ where: { id: input.eventId } });
      if (event) context = buildRenderContextFromEvent(event);
    }

    const svg = renderTemplateToSvg(canvas, blocks, context);
    const exportDir = path.join(process.cwd(), "public", "exports");
    await mkdir(exportDir, { recursive: true });

    const filename = `export-${Date.now()}-${input.userId.slice(0, 6)}.svg`;
    const filePath = path.join(exportDir, filename);
    await writeFile(filePath, svg, "utf-8");

    const publicUrl = `/exports/${filename}`;

    const record = await prisma.designExport.create({
      data: {
        userId: input.userId,
        templateId: input.templateId,
        eventId: input.eventId,
        format: input.format,
        width: dims.width,
        height: dims.height,
        status: "ready",
        url: publicUrl,
      },
    });

    return {
      ...record,
      dimension: dims,
      downloadUrl: publicUrl,
      svg,
      message:
        input.format === "WEB"
          ? "Web invitation page ready"
          : `${input.format} export ready — download your design`,
    };
  }

  async getUserExports(userId: string) {
    return prisma.designExport.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }
}

export const designExportService = new DesignExportService();
