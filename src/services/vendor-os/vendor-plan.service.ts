import { prisma } from "@/lib/prisma";

export class VendorPlanService {
  async getPlans() {
    return prisma.vendorPlan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  }

  async getVendorLimits(vendorId: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { plan: true },
    });
    const plan = vendor?.plan ?? await prisma.vendorPlan.findUnique({ where: { slug: "free" } });
    if (!plan) {
      return { imageLimit: 10, videoLimit: 2, storageLimitMb: 500, categoryLimit: 2, portfolioEventLimit: 5 };
    }
    return {
      imageLimit: plan.imageLimit,
      videoLimit: plan.videoLimit,
      storageLimitMb: plan.storageLimitMb,
      categoryLimit: plan.categoryLimit,
      portfolioEventLimit: plan.portfolioEventLimit,
    };
  }

  async getVendorUsage(vendorId: string) {
    const [images, videos, storage, categories, events] = await Promise.all([
      prisma.vendorMedia.count({ where: { vendorId, type: "image", status: "active" } }),
      prisma.vendorMedia.count({ where: { vendorId, type: "video", status: "active" } }),
      prisma.vendorMedia.aggregate({ where: { vendorId, status: "active" }, _sum: { sizeBytes: true } }),
      prisma.vendorCategoryAssignment.count({ where: { vendorId } }),
      prisma.vendorEventReference.count({ where: { vendorId, isPublished: true } }),
    ]);
    return {
      images,
      videos,
      storageMb: Math.round(Number(storage._sum.sizeBytes ?? 0) / 1024 / 1024),
      categories,
      portfolioEvents: events,
    };
  }

  async canUpload(vendorId: string, type: "image" | "video", sizeBytes: number) {
    const [limits, usage] = await Promise.all([
      this.getVendorLimits(vendorId),
      this.getVendorUsage(vendorId),
    ]);
    if (limits.storageLimitMb > 0 && usage.storageMb + sizeBytes / 1024 / 1024 > limits.storageLimitMb) {
      return { allowed: false, reason: "Storage limit reached. Upgrade your plan." };
    }
    if (type === "image" && limits.imageLimit > 0 && usage.images >= limits.imageLimit) {
      return { allowed: false, reason: "Image limit reached. Upgrade your plan." };
    }
    if (type === "video" && limits.videoLimit > 0 && usage.videos >= limits.videoLimit) {
      return { allowed: false, reason: "Video limit reached. Upgrade your plan." };
    }
    return { allowed: true };
  }
}

export const vendorPlanService = new VendorPlanService();
