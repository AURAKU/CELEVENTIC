import { prisma } from "@/lib/prisma";

export class TemplateMarketplaceService {
  async getMarketplace(filters?: { category?: string; premium?: boolean }) {
    return prisma.designTemplate.findMany({
      where: {
        isActive: true,
        approvalStatus: "APPROVED",
        ...(filters?.category ? { category: filters.category } : {}),
        ...(filters?.premium !== undefined ? { isPremium: filters.premium } : {}),
      },
      orderBy: [{ isFeatured: "desc" }, { popularity: "desc" }],
      include: {
        designer: { select: { id: true, name: true } },
        _count: { select: { purchases: true, favorites: true } },
      },
    });
  }

  async purchaseTemplate(userId: string, templateId: string) {
    const template = await prisma.designTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new Error("Template not found");
    if (!template.isPremium) return { purchased: true, free: true };

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

  async getFavorites(userId: string) {
    return prisma.templateFavorite.findMany({
      where: { userId },
      include: { template: true },
      orderBy: { createdAt: "desc" },
    });
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

  async hasAccess(userId: string, templateId: string) {
    const template = await prisma.designTemplate.findUnique({ where: { id: templateId } });
    if (!template) return false;
    if (!template.isPremium) return true;
    if (template.createdById === userId) return true;

    const purchase = await prisma.templatePurchase.findFirst({ where: { userId, templateId } });
    return !!purchase;
  }
}

export const templateMarketplaceService = new TemplateMarketplaceService();
