import { prisma } from "@/lib/prisma";
import { hasFullPackageAccess } from "@/lib/access/package-access";
import { parsePaginationInput, paginatedResult } from "@/lib/pagination";
import type { UserRole } from "@prisma/client";

export class TemplateMarketplaceService {
  async getMarketplace(filters?: {
    category?: string;
    premium?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { page, limit, skip } = parsePaginationInput(
      { page: filters?.page, limit: filters?.limit },
      { limit: 12, maxLimit: 100 }
    );
    const where = {
      isActive: true,
      approvalStatus: "APPROVED" as const,
      ...(filters?.category ? { category: filters.category } : {}),
      ...(filters?.premium !== undefined ? { isPremium: filters.premium } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.designTemplate.findMany({
        where,
        orderBy: [{ isFeatured: "desc" }, { popularity: "desc" }],
        skip,
        take: limit,
        include: {
          designer: { select: { id: true, name: true } },
          _count: { select: { purchases: true, favorites: true } },
        },
      }),
      prisma.designTemplate.count({ where }),
    ]);
    return paginatedResult(items, total, page, limit);
  }

  async purchaseTemplate(userId: string, templateId: string) {
    const template = await prisma.designTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new Error("Template not found");
    if (!template.isPremium) return { purchased: true, free: true };

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (hasFullPackageAccess(user?.role)) {
      return { purchased: true, free: true, adminBypass: true };
    }

    const existing = await prisma.templatePurchase.findFirst({ where: { userId, templateId } });
    if (existing) return { purchased: true, alreadyOwned: true };

    const purchase = await prisma.templatePurchase.create({
      data: { userId, templateId, amount: template.price },
    });

    return { purchased: true, purchase };
  }

  async toggleFavorite(userId: string, templateId: string) {
    const existing = await prisma.templateFavorite.findUnique({
      where: { userId_templateId: { userId, templateId } },
    });

    if (existing) {
      await prisma.templateFavorite.delete({ where: { id: existing.id } });
      return { favorited: false };
    }

    await prisma.templateFavorite.create({ data: { userId, templateId } });
    return { favorited: true };
  }

  async getFavorites(userId: string, page = 1, limit = 24) {
    const { page: p, limit: take, skip } = parsePaginationInput(
      { page, limit },
      { limit: 24, maxLimit: 100 }
    );
    const where = { userId };
    const [items, total] = await Promise.all([
      prisma.templateFavorite.findMany({
        where,
        include: { template: true },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.templateFavorite.count({ where }),
    ]);
    return paginatedResult(items, total, p, take);
  }

  async submitDesignerTemplate(userId: string, templateId: string) {
    return prisma.designTemplate.update({
      where: { id: templateId, createdById: userId },
      data: { approvalStatus: "PENDING", designerId: userId },
    });
  }

  async approveTemplate(templateId: string, featured = false) {
    return prisma.designTemplate.update({
      where: { id: templateId },
      data: { approvalStatus: "APPROVED", isFeatured: featured },
    });
  }

  async rejectTemplate(templateId: string) {
    return prisma.designTemplate.update({
      where: { id: templateId },
      data: { approvalStatus: "REJECTED" },
    });
  }

  async hasAccess(userId: string, templateId: string, role?: UserRole | null) {
    const template = await prisma.designTemplate.findUnique({ where: { id: templateId } });
    if (!template) return false;
    if (!template.isPremium) return true;
    if (template.createdById === userId) return true;

    let resolvedRole = role;
    if (resolvedRole === undefined) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      resolvedRole = user?.role;
    }
    if (hasFullPackageAccess(resolvedRole)) return true;

    const purchase = await prisma.templatePurchase.findFirst({ where: { userId, templateId } });
    return !!purchase;
  }
}

export const templateMarketplaceService = new TemplateMarketplaceService();
