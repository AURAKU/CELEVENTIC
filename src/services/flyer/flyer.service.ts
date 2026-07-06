import { prisma } from "@/lib/prisma";
import { paginatedResult } from "@/lib/pagination";
import { templateEngineService } from "@/services/template-engine/template-engine.service";
import { FLYER_TEMPLATE_DEFS, getFlyerTemplateDef } from "@/lib/flyer/flyer-template-schemas";
import { createCorporateFlyerTemplate } from "@/lib/default-template-schemas";
import type { TemplateSchema } from "@/types/template-engine";
import type { DesignType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { formatDate } from "@/lib/utils";

export interface CreateFlyerInput {
  userId: string;
  eventId?: string;
  name: string;
  type: DesignType;
  config?: Record<string, unknown>;
}

export class FlyerService {
  async create(input: CreateFlyerInput) {
    return prisma.flyerDesign.create({
      data: {
        userId: input.userId,
        eventId: input.eventId,
        name: input.name,
        type: input.type,
        config: input.config as Prisma.InputJsonValue,
        status: "DRAFT",
      },
    });
  }

  async getById(id: string, userId: string) {
    return prisma.flyerDesign.findFirst({ where: { id, userId } });
  }

  async getUserDesigns(userId: string, eventId?: string, page = 1, limit = 12) {
    const where = { userId, ...(eventId ? { eventId } : {}) };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.flyerDesign.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
      prisma.flyerDesign.count({ where }),
    ]);
    return paginatedResult(items, total, page, limit);
  }

  async update(id: string, userId: string, data: { name?: string; config?: Record<string, unknown>; status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" }) {
    return prisma.flyerDesign.update({
      where: { id, userId },
      data: {
        ...data,
        config: data.config as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async delete(id: string, userId: string) {
    return prisma.flyerDesign.delete({ where: { id, userId } });
  }

  async duplicate(id: string, userId: string) {
    const source = await this.getById(id, userId);
    if (!source) throw new Error("Design not found");
    return prisma.flyerDesign.create({
      data: {
        userId,
        eventId: source.eventId,
        name: `${source.name} (copy)`,
        type: source.type,
        config: source.config as Prisma.InputJsonValue,
        status: "DRAFT",
      },
    });
  }

  async publish(id: string, userId: string) {
    return prisma.flyerDesign.update({
      where: { id, userId },
      data: { status: "PUBLISHED" },
    });
  }

  async createFromTemplate(input: {
    userId: string;
    templateId: string;
    eventId?: string;
    name?: string;
  }) {
    const def = getFlyerTemplateDef(input.templateId);
    if (!def) throw new Error("Template not found");

    let schema = def.schema();
    const event = await this.eventContext(input.eventId);
    if (event) schema = this.applyEventToSchema(schema, event);
    const template = await templateEngineService.create({
      createdById: input.userId,
      schema: schema as never,
      isPremium: false,
    });

    const design = await this.create({
      userId: input.userId,
      eventId: input.eventId,
      name: input.name ?? `${def.name} Flyer`,
      type: def.type,
      config: {
        templateId: def.id,
        designTemplateId: template.id,
        schema,
      },
    });

    return { design, designTemplateId: template.id };
  }

  getTemplates() {
    return FLYER_TEMPLATE_DEFS.map((t) => ({
      id: t.id,
      name: t.name,
      type: t.type,
      description: t.description,
      gradient: t.gradient,
    }));
  }

  private blankSchemaForType(type: DesignType, name: string): TemplateSchema {
    const base = createCorporateFlyerTemplate();
    const canvasByType: Record<string, { width: number; height: number }> = {
      FLYER: { width: 1080, height: 1350 },
      POSTER: { width: 1080, height: 1920 },
      BANNER: { width: 1920, height: 640 },
      SOCIAL_MEDIA: { width: 1080, height: 1080 },
    };
    const size = canvasByType[type] ?? canvasByType.FLYER;
    return {
      ...base,
      name,
      productType: type === "SOCIAL_MEDIA" ? "SOCIAL_MEDIA" : type,
      canvas: { ...base.canvas, width: size.width, height: size.height },
    };
  }

  private async eventContext(eventId?: string) {
    if (!eventId) return null;
    return prisma.event.findUnique({
      where: { id: eventId },
      select: {
        title: true,
        hostName: true,
        startDate: true,
        venueName: true,
        city: true,
        landmark: true,
        slug: true,
      },
    });
  }

  private applyEventToSchema(schema: TemplateSchema, event: NonNullable<Awaited<ReturnType<FlyerService["eventContext"]>>>) {
    const venue = [event.venueName, event.city ?? event.landmark].filter(Boolean).join(", ");
    const dateStr = formatDate(event.startDate);
    const timeStr = new Date(event.startDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const vars: Record<string, string> = {
      "{{event_title}}": event.title,
      "{{host_name}}": event.hostName,
      "{{event_date}}": dateStr,
      "{{event_time}}": timeStr,
      "{{venue}}": venue || "Venue TBA",
    };
    return {
      ...schema,
      blocks: schema.blocks.map((b) => {
        if (!b.variable) return b;
        let content = b.variable;
        Object.entries(vars).forEach(([k, v]) => {
          content = content.replace(k, v);
        });
        return { ...b, content, variable: undefined };
      }),
    };
  }

  async createBlank(input: { userId: string; eventId?: string; name: string; type: DesignType }) {
    let schema = this.blankSchemaForType(input.type, input.name);
    const event = await this.eventContext(input.eventId);
    if (event) schema = this.applyEventToSchema(schema, event);

    const template = await templateEngineService.create({
      createdById: input.userId,
      schema: schema as never,
      isPremium: false,
    });

    const design = await this.create({
      userId: input.userId,
      eventId: input.eventId,
      name: input.name,
      type: input.type,
      config: {
        designTemplateId: template.id,
        schema,
        eventLinked: Boolean(input.eventId),
      },
    });

    return { design, designTemplateId: template.id };
  }
}

export const flyerService = new FlyerService();
