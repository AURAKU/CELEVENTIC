import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { paginatedResult } from "@/lib/pagination";
import type { Prisma } from "@prisma/client";

export class VendorAdminService {
  async listVendors(filters?: {
    search?: string;
    status?: string;
    verification?: string;
    featured?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;
    const where: Prisma.VendorWhereInput = {};
    if (filters?.search) {
      where.OR = [
        { businessName: { contains: filters.search } },
        { email: { contains: filters.search } },
        { city: { contains: filters.search } },
      ];
    }
    if (filters?.status) where.status = filters.status as never;
    if (filters?.verification) where.verificationStatus = filters.verification as never;
    if (filters?.featured !== undefined) where.isFeatured = filters.featured;

    const [items, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
          plan: true,
          _count: { select: { leads: true, reviews: true, media: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.vendor.count({ where }),
    ]);
    return paginatedResult(items, total, page, limit);
  }

  async moderateVendor(
    vendorId: string,
    adminId: string,
    action: "approve" | "suspend" | "feature" | "unfeature" | "verify" | "revoke_verify",
    reason?: string
  ) {
    const updates: Prisma.VendorUpdateInput = {};
    if (action === "approve") updates.status = "ACTIVE";
    if (action === "suspend") updates.status = "SUSPENDED";
    if (action === "feature") updates.isFeatured = true;
    if (action === "unfeature") updates.isFeatured = false;
    if (action === "verify") {
      updates.isVerified = true;
      updates.verificationStatus = "APPROVED";
    }
    if (action === "revoke_verify") {
      updates.isVerified = false;
      updates.verificationStatus = "REVOKED";
    }

    const vendor = await prisma.vendor.update({ where: { id: vendorId }, data: updates });
    const auditAction = action === "suspend" ? "SUSPEND" as const : "UPDATE" as const;
    await createAuditLog({
      userId: adminId,
      action: auditAction,
      entity: "vendor",
      entityId: vendorId,
      details: { vendorAction: action, reason, businessName: vendor.businessName },
    });
    return vendor;
  }

  async reviewVerification(requestId: string, adminId: string, approved: boolean, rejectionReason?: string) {
    const req = await prisma.vendorVerificationRequest.update({
      where: { id: requestId },
      data: {
        status: approved ? "APPROVED" : "REJECTED",
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason,
      },
    });
    if (approved) {
      await prisma.vendor.update({
        where: { id: req.vendorId },
        data: { isVerified: true, verificationStatus: "APPROVED" },
      });
    }
    await createAuditLog({
      userId: adminId,
      action: "UPDATE",
      entity: "vendor_verification",
      entityId: requestId,
      details: { approved, rejectionReason },
    });
    return req;
  }

  async getStats() {
    const [total, verified, featured, pendingVerification, leads] = await Promise.all([
      prisma.vendor.count(),
      prisma.vendor.count({ where: { isVerified: true } }),
      prisma.vendor.count({ where: { isFeatured: true } }),
      prisma.vendorVerificationRequest.count({ where: { status: "PENDING" } }),
      prisma.vendorLead.count({ where: { status: "NEW" } }),
    ]);
    return { total, verified, featured, pendingVerification, newLeads: leads };
  }

  async upsertPlan(data: {
    slug: string;
    name: string;
    priceGhs: number;
    imageLimit: number;
    videoLimit: number;
    storageLimitMb: number;
    categoryLimit: number;
    portfolioEventLimit: number;
    verifiedBadge?: boolean;
    featuredSearch?: boolean;
  }) {
    return prisma.vendorPlan.upsert({
      where: { slug: data.slug },
      update: data,
      create: { ...data, durationDays: 365, isActive: true },
    });
  }
}

export const vendorAdminService = new VendorAdminService();
