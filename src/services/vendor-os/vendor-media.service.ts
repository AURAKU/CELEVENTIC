import { prisma } from "@/lib/prisma";
import { vendorPlanService } from "@/services/vendor-os/vendor-plan.service";

const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 25 * 1024 * 1024;

export class VendorMediaService {
  validateFile(type: string, sizeBytes: number) {
    const isImage = ALLOWED_IMAGE.includes(type);
    const isVideo = ALLOWED_VIDEO.includes(type);
    if (!isImage && !isVideo) return { valid: false, reason: "Unsupported file type" };
    if (isImage && sizeBytes > MAX_IMAGE) return { valid: false, reason: "Image max 10MB" };
    if (isVideo && sizeBytes > MAX_VIDEO) return { valid: false, reason: "Video max 25MB" };
    return { valid: true, mediaType: isImage ? "image" as const : "video" as const };
  }

  async addMedia(vendorId: string, data: { url: string; type: string; caption?: string; sizeBytes: number }) {
    const check = await vendorPlanService.canUpload(vendorId, data.type as "image" | "video", data.sizeBytes);
    if (!check.allowed) throw new Error(check.reason);

    const count = await prisma.vendorMedia.count({ where: { vendorId } });
    return prisma.vendorMedia.create({
      data: {
        vendorId,
        type: data.type,
        url: data.url,
        caption: data.caption,
        sizeBytes: data.sizeBytes,
        sortOrder: count,
        status: "active",
      },
    });
  }

  async deleteMedia(vendorId: string, mediaId: string) {
    return prisma.vendorMedia.updateMany({
      where: { id: mediaId, vendorId },
      data: { status: "removed" },
    });
  }

  async getUsage(vendorId: string) {
    const [limits, usage] = await Promise.all([
      vendorPlanService.getVendorLimits(vendorId),
      vendorPlanService.getVendorUsage(vendorId),
    ]);
    return { limits, usage };
  }
}

export const vendorMediaService = new VendorMediaService();
