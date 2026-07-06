import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { paginatedResult } from "@/lib/pagination";
import type { Prisma, TemplateProductType, TemplateApprovalStatus } from "@prisma/client";
import type { TemplateSchema } from "@/types/template-engine";

export interface ListTemplatesFilter {
  category?: string;
  style?: string;
  productType?: TemplateProductType;
  eventType?: string;
  isPremium?: boolean;
  isFeatured?: boolean;
  search?: string;
  userId?: string;
  page?: number;
  limit?: number;
}

export interface CreateTemplateInput {
  createdById: string;
  designerId?: string;
  schema: TemplateSchema;
  isPremium?: boolean;
  price?: number;
  previewUrl?: string;
}

export class TemplateEngineService {
  async list(filters: ListTemplatesFilter = {}) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 12;
    const skip = (page - 1) * limit;
    const where = {
      isActive: true,
      approvalStatus: "APPROVED" as const,
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.style ? { style: filters.style } : {}),
      ...(filters.productType ? { productType: filters.productType } : {}),
      ...(filters.eventType ? { eventType: filters.eventType } : {}),
      ...(filters.isPremium !== undefined ? { isPremium: filters.isPremium } : {}),
      ...(filters.isFeatured ? { isFeatured: true } : {}),
      ...(filters.search ? { name: { contains: filters.search } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.designTemplate.findMany({
        where,
        orderBy: [{ isFeatured: "desc" }, { popularity: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
        include: {
          createdBy: { select: { id: true, name: true } },
          designer: { select: { id: true, name: true } },
          _count: { select: { favorites: true, purchases: true } },
        },
      }),
      prisma.designTemplate.count({ where }),
    ]);
    return paginatedResult(items, total, page, limit);
  }

  async getById(id: string) {
    return prisma.designTemplate.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
        designer: { select: { id: true, name: true } },
      },
    });
  }

  async getBySlug(slug: string) {
    return prisma.designTemplate.findUnique({ where: { slug } });
  }

  async create(input: CreateTemplateInput) {
    const { schema } = input;
    const slug = `${slugify(schema.name)}-${Date.now().toString(36)}`;

    return prisma.designTemplate.create({
      data: {
        slug,
        name: schema.name,
        description: `${schema.style} ${schema.category} ${schema.productType}`,
        productType: schema.productType as TemplateProductType,
        category: schema.category,
        style: schema.style,
        colorPalette: (schema.colorPalette ?? {}) as Prisma.InputJsonValue,
        fontPairing: (schema.fontPairing ?? {}) as Prisma.InputJsonValue,
        layoutType: schema.style,
        canvas: schema.canvas as unknown as Prisma.InputJsonValue,
        blocks: schema.blocks as unknown as Prisma.InputJsonValue,
        variables: (schema.variables ?? []) as Prisma.InputJsonValue,
        isPremium: input.isPremium ?? false,
        price: input.price ?? 0,
        supportsAnimation: false,
        supportsQr: schema.blocks.some((b) => b.type === "qr"),
        supportsRsvp: schema.blocks.some((b) => b.type === "rsvp_button"),
        supportsTicket: schema.productType === "TICKET",
        supportsPersonalization: true,
        previewUrl: input.previewUrl,
        createdById: input.createdById,
        designerId: input.designerId,
        approvalStatus: input.designerId ? "PENDING" : "APPROVED",
      },
    });
  }

  async update(id: string, data: {
    name?: string;
    blocks?: unknown;
    canvas?: unknown;
    colorPalette?: unknown;
    fontPairing?: unknown;
    isActive?: boolean;
    isFeatured?: boolean;
    isPremium?: boolean;
    price?: number;
    approvalStatus?: TemplateApprovalStatus;
  }) {
    return prisma.designTemplate.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.blocks ? { blocks: data.blocks as Prisma.InputJsonValue } : {}),
        ...(data.canvas ? { canvas: data.canvas as Prisma.InputJsonValue } : {}),
        ...(data.colorPalette ? { colorPalette: data.colorPalette as Prisma.InputJsonValue } : {}),
        ...(data.fontPairing ? { fontPairing: data.fontPairing as Prisma.InputJsonValue } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.isFeatured !== undefined ? { isFeatured: data.isFeatured } : {}),
        ...(data.isPremium !== undefined ? { isPremium: data.isPremium } : {}),
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.approvalStatus ? { approvalStatus: data.approvalStatus } : {}),
      },
    });
  }

  async duplicate(id: string, userId: string) {
    const original = await this.getById(id);
    if (!original) throw new Error("Template not found");

    const schema: TemplateSchema = {
      name: `${original.name} (Copy)`,
      category: original.category,
      style: original.style,
      productType: original.productType,
      canvas: original.canvas as unknown as TemplateSchema["canvas"],
      blocks: original.blocks as unknown as TemplateSchema["blocks"],
      colorPalette: original.colorPalette as Record<string, string>,
      fontPairing: original.fontPairing as TemplateSchema["fontPairing"],
      variables: original.variables as string[],
    };

    return this.create({ createdById: userId, schema, isPremium: original.isPremium, price: original.price });
  }

  async delete(id: string) {
    return prisma.designTemplate.update({ where: { id }, data: { isActive: false } });
  }

  async incrementPopularity(id: string) {
    return prisma.designTemplate.update({
      where: { id },
      data: { popularity: { increment: 1 }, conversionRate: { increment: 0.01 } },
    });
  }

  async adminList() {
    return prisma.designTemplate.findMany({
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true } }, _count: { select: { purchases: true } } },
    });
  }
}

export const templateEngineService = new TemplateEngineService();
