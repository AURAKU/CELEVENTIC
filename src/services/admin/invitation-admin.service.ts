import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { paginatedResult, parsePaginationInput } from "@/lib/pagination";
import type { Prisma } from "@prisma/client";

export class InvitationAdminService {
  async getInvitationAnalytics() {
    const [
      totalOrders,
      paidOrders,
      pendingProduction,
      revenueAgg,
      ordersByPackage,
      ordersByStatus,
      templateCounts,
      paymentStats,
      addonUsage,
    ] = await Promise.all([
      prisma.invitationOrder.count({ where: { archivedAt: null } }),
      prisma.invitationOrder.count({
        where: { status: { in: ["PAID", "IN_PRODUCTION", "PUBLISHED", "APPROVED"] }, archivedAt: null },
      }),
      prisma.invitationOrder.count({
        where: {
          productionStatus: { in: ["ASSIGNED", "DESIGNING", "REVISION", "AWAITING_APPROVAL"] },
          archivedAt: null,
        },
      }),
      prisma.invitationOrder.aggregate({
        where: { status: { not: "DRAFT" }, archivedAt: null },
        _sum: { totalAmountGhs: true },
        _avg: { totalAmountGhs: true },
      }),
      prisma.invitationOrder.groupBy({
        by: ["packageSlug"],
        where: { archivedAt: null },
        _count: { id: true },
        _sum: { totalAmountGhs: true },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.invitationOrder.groupBy({
        by: ["status"],
        where: { archivedAt: null },
        _count: { id: true },
      }),
      prisma.invitationOrder.groupBy({
        by: ["templateSlug"],
        where: { archivedAt: null },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      prisma.payment.groupBy({
        by: ["status"],
        where: { purpose: "INVITATION_ORDER" },
        _count: { id: true },
      }),
      prisma.invitationOrder.findMany({
        where: { archivedAt: null },
        select: { addonSlugs: true, totalAmountGhs: true },
      }),
    ]);

    const addonMap: Record<string, { count: number; revenue: number }> = {};
    for (const o of addonUsage) {
      const slugs = (o.addonSlugs as string[] | null) ?? [];
      if (slugs.length === 0) continue;
      for (const slug of slugs) {
        if (!addonMap[slug]) addonMap[slug] = { count: 0, revenue: 0 };
        addonMap[slug].count += 1;
      }
    }

    const successfulPayments = paymentStats.find((p) => p.status === "SUCCESSFUL")?._count.id ?? 0;
    const totalPayments = paymentStats.reduce((s, p) => s + p._count.id, 0);
    const paymentSuccessRate = totalPayments > 0 ? Math.round((successfulPayments / totalPayments) * 100) : 0;

    const funnel = {
      draft: ordersByStatus.find((s) => s.status === "DRAFT")?._count.id ?? 0,
      pendingPayment: ordersByStatus.find((s) => s.status === "PENDING_PAYMENT")?._count.id ?? 0,
      paid: paidOrders,
      published: ordersByStatus.find((s) => s.status === "PUBLISHED")?._count.id ?? 0,
    };

    const bestPackage = ordersByPackage[0];

    const { invitationAnalyticsService } = await import("@/services/invitation-os/invitation-analytics.service");
    const godTier = await invitationAnalyticsService.getAdminGodTierAnalytics();

    return {
      totalOrders,
      paidOrders,
      pendingProduction,
      totalRevenue: Number(revenueAgg._sum.totalAmountGhs ?? 0),
      averageOrderValue: Number(revenueAgg._avg.totalAmountGhs ?? 0),
      paymentSuccessRate,
      godTier,
      bestPackage: bestPackage
        ? { slug: bestPackage.packageSlug, count: bestPackage._count.id, revenue: Number(bestPackage._sum.totalAmountGhs ?? 0) }
        : null,
      packageBreakdown: ordersByPackage.map((p) => ({
        slug: p.packageSlug,
        count: p._count.id,
        revenue: Number(p._sum.totalAmountGhs ?? 0),
      })),
      topTemplates: templateCounts.map((t) => ({ slug: t.templateSlug, orders: t._count.id })),
      addonPerformance: Object.entries(addonMap)
        .map(([slug, data]) => ({ slug, ...data }))
        .sort((a, b) => b.count - a.count),
      conversionFunnel: funnel,
    };
  }

  async listOrders(filters?: {
    status?: string;
    productionStatus?: string;
    search?: string;
    includeArchived?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { page, limit, skip } = parsePaginationInput(filters, { limit: 20 });
    const where: Prisma.InvitationOrderWhereInput = {};

    if (!filters?.includeArchived) where.archivedAt = null;
    if (filters?.status) where.status = filters.status as never;
    if (filters?.productionStatus) where.productionStatus = filters.productionStatus as never;
    if (filters?.search) {
      where.OR = [
        { eventTitle: { contains: filters.search } },
        { hostName: { contains: filters.search } },
        { contactEmail: { contains: filters.search } },
        { user: { name: { contains: filters.search } } },
        { user: { email: { contains: filters.search } } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.invitationOrder.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          package: true,
          template: true,
          payment: true,
          assignedDesigner: { select: { id: true, name: true, email: true } },
          revisions: { orderBy: { revisionNumber: "desc" }, take: 3 },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.invitationOrder.count({ where }),
    ]);

    return paginatedResult(orders, total, page, limit);
  }

  async updateOrder(
    orderId: string,
    adminUserId: string,
    data: {
      status?: string;
      productionStatus?: string;
      assignedDesignerId?: string | null;
      adminNotes?: string;
      missingInfoRequest?: string;
      revisionsUsed?: number;
      archive?: boolean;
    }
  ) {
    const update: Prisma.InvitationOrderUpdateInput = {};

    if (data.status) update.status = data.status as never;
    if (data.productionStatus) update.productionStatus = data.productionStatus as never;
    if (data.assignedDesignerId !== undefined) {
      update.assignedDesigner = data.assignedDesignerId
        ? { connect: { id: data.assignedDesignerId } }
        : { disconnect: true };
    }
    if (data.adminNotes !== undefined) update.adminNotes = data.adminNotes;
    if (data.missingInfoRequest !== undefined) {
      update.missingInfoRequest = data.missingInfoRequest;
      if (data.missingInfoRequest) update.productionStatus = "AWAITING_CUSTOMER_INFO";
    }
    if (data.revisionsUsed !== undefined) update.revisionsUsed = data.revisionsUsed;
    if (data.archive) {
      update.archivedAt = new Date();
      update.status = "ARCHIVED";
    }

    const order = await prisma.invitationOrder.update({
      where: { id: orderId },
      data: update,
      include: {
        user: { select: { name: true, email: true } },
        package: true,
        payment: true,
        assignedDesigner: { select: { name: true } },
      },
    });

    await createAuditLog({
      userId: adminUserId,
      action: "UPDATE",
      entity: "invitation_order",
      entityId: orderId,
      details: data,
    });

    return order;
  }

  async markDelivered(orderId: string, adminUserId: string) {
    return this.updateOrder(orderId, adminUserId, {
      productionStatus: "DELIVERED",
      status: "PUBLISHED",
    });
  }

  async getDesigners() {
    return prisma.user.findMany({
      where: {
        OR: [
          { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
          { designerProfile: { isNot: null } },
        ],
        status: "ACTIVE",
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
  }

  async listCatalogTemplates(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.invitationCatalogTemplate.findMany({ orderBy: { sortOrder: "asc" }, skip, take: limit }),
      prisma.invitationCatalogTemplate.count(),
    ]);
    return paginatedResult(items, total, page, limit);
  }

  async upsertCatalogTemplate(data: {
    id?: string;
    slug: string;
    name: string;
    description?: string;
    category: string;
    style: string;
    layoutSlug: string;
    previewGradient?: string;
    previewImageUrl?: string;
    previewVideoUrl?: string;
    backgroundImageUrl?: string;
    backgroundVideoUrl?: string;
    motionReferenceUrl?: string;
    inspirationMediaUrl?: string;
    defaultGalleryUrls?: string[];
    eventTypes?: string[];
    packageSlugs?: string[];
    priceGhs?: number;
    languages?: string[];
    isPremium?: boolean;
    isFeatured?: boolean;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    const payload = {
      name: data.name,
      description: data.description,
      category: data.category,
      style: data.style,
      layoutSlug: data.layoutSlug,
      previewGradient: data.previewGradient,
      previewImageUrl: data.previewImageUrl,
      previewVideoUrl: data.previewVideoUrl,
      backgroundImageUrl: data.backgroundImageUrl,
      backgroundVideoUrl: data.backgroundVideoUrl,
      motionReferenceUrl: data.motionReferenceUrl,
      inspirationMediaUrl: data.inspirationMediaUrl,
      defaultGalleryUrls: data.defaultGalleryUrls,
      eventTypes: data.eventTypes,
      packageSlugs: data.packageSlugs,
      priceGhs: data.priceGhs,
      languages: data.languages,
      isPremium: data.isPremium,
      isFeatured: data.isFeatured,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
    };

    if (data.id) {
      return prisma.invitationCatalogTemplate.update({ where: { id: data.id }, data: payload });
    }
    return prisma.invitationCatalogTemplate.upsert({
      where: { slug: data.slug },
      update: payload,
      create: { slug: data.slug, ...payload },
    });
  }

  async deleteCatalogTemplate(id: string) {
    return prisma.invitationCatalogTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async listReviews(status?: string, page = 1, limit = 20) {
    const where = status ? { status: status as never } : undefined;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.invitationReview.findMany({
        where,
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.invitationReview.count({ where }),
    ]);
    return paginatedResult(items, total, page, limit);
  }

  async updateReview(
    id: string,
    data: { status?: string; isVerified?: boolean; isFeatured?: boolean; isActive?: boolean }
  ) {
    return prisma.invitationReview.update({
      where: { id },
      data: {
        status: data.status as never,
        isVerified: data.isVerified,
        isFeatured: data.isFeatured,
        isActive: data.isActive,
      },
    });
  }

  async listRevisions(orderId?: string, page = 1, limit = 20) {
    const where = orderId ? { invitationOrderId: orderId } : undefined;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.invitationRevision.findMany({
        where,
        include: {
          invitationOrder: {
            select: {
              id: true,
              eventTitle: true,
              packageSlug: true,
              revisionsUsed: true,
              package: { select: { revisions: true, name: true } },
              user: { select: { name: true, email: true } },
            },
          },
        },
        orderBy: { requestedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.invitationRevision.count({ where }),
    ]);
    return paginatedResult(items, total, page, limit);
  }

  async createRevision(data: {
    invitationOrderId: string;
    notes?: string;
    isExtraPaid?: boolean;
    amountGhs?: number;
  }) {
    const order = await prisma.invitationOrder.findUnique({
      where: { id: data.invitationOrderId },
      include: { package: true },
    });
    if (!order) throw new Error("Order not found");

    const nextNum = order.revisionsUsed + 1;
    const included = order.package.revisions;
    const isExtra = nextNum > included;

    const revision = await prisma.invitationRevision.create({
      data: {
        invitationOrderId: data.invitationOrderId,
        revisionNumber: nextNum,
        notes: data.notes,
        isExtraPaid: isExtra || (data.isExtraPaid ?? false),
        amountGhs: isExtra ? (data.amountGhs ?? 79) : undefined,
        status: "REQUESTED",
      },
    });

    await prisma.invitationOrder.update({
      where: { id: data.invitationOrderId },
      data: {
        revisionsUsed: nextNum,
        productionStatus: "REVISION",
        status: "REVISION_REQUESTED",
      },
    });

    return revision;
  }

  async updateRevision(
    id: string,
    data: { status?: string; adminNotes?: string; completedAt?: Date }
  ) {
    const revision = await prisma.invitationRevision.update({
      where: { id },
      data: {
        status: data.status as never,
        adminNotes: data.adminNotes,
        completedAt: data.completedAt ?? (data.status === "COMPLETED" ? new Date() : undefined),
      },
    });

    if (data.status === "AWAITING_APPROVAL") {
      await prisma.invitationOrder.update({
        where: { id: revision.invitationOrderId },
        data: { productionStatus: "AWAITING_APPROVAL" },
      });
    }
    if (data.status === "COMPLETED") {
      await prisma.invitationOrder.update({
        where: { id: revision.invitationOrderId },
        data: { productionStatus: "APPROVED" },
      });
    }

    return revision;
  }

  async getContactSettings() {
    const keys = ["contact.phone", "contact.email", "contact.hours"];
    const settings = await prisma.adminSetting.findMany({ where: { key: { in: keys } } });
    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    return {
      phone: (map["contact.phone"] as { value?: string })?.value ?? "020 961 2770",
      email: (map["contact.email"] as { value?: string })?.value ?? "Celeventic@gmail.com",
      hours: (map["contact.hours"] as { value?: string })?.value ?? "Mon–Sat, 9am–6pm GMT",
    };
  }

  async saveContactSettings(data: { phone: string; email: string; hours?: string }) {
    for (const [key, value] of Object.entries({
      "contact.phone": data.phone,
      "contact.email": data.email,
      "contact.hours": data.hours ?? "Mon–Sat, 9am–6pm GMT",
    })) {
      await prisma.adminSetting.upsert({
        where: { key },
        update: { value: { value } },
        create: { key, value: { value }, category: "contact" },
      });
    }
  }

  async getPaymentLogs(limit = 50) {
    return prisma.paymentLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        payment: {
          select: {
            reference: true,
            status: true,
            purpose: true,
            baseAmount: true,
            displayCurrency: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    });
  }

  async exportPaymentsCsv() {
    const payments = await prisma.payment.findMany({
      where: { purpose: "INVITATION_ORDER" },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    const header = "Reference,Status,Amount,Currency,Display Currency,Display Amount,User,Email,Created\n";
    const rows = payments
      .map((p) =>
        [
          p.reference,
          p.status,
          p.baseAmount ?? p.amount,
          p.baseCurrency ?? p.currency,
          p.displayCurrency ?? "",
          p.displayAmount ?? "",
          p.user?.name ?? "",
          p.user?.email ?? "",
          p.createdAt.toISOString(),
        ].join(",")
      )
      .join("\n");

    return header + rows;
  }
}

export const invitationAdminService = new InvitationAdminService();
