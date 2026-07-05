import { prisma } from "@/lib/prisma";
import type { EventMemoryUploadStatus } from "@prisma/client";
import { paginatedResult, parsePaginationInput } from "@/lib/pagination";
import { eventMemorySettingsService } from "@/services/memory/event-memory-settings.service";

export interface CreateGuestUploadInput {
  eventId: string;
  guestId?: string;
  uploaderName?: string;
  uploaderPhone?: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  thumbnailUrl?: string | null;
  caption?: string;
  consentGiven: boolean;
}

export class EventMemoryUploadService {
  async getById(id: string) {
    return prisma.eventMemoryUpload.findUnique({ where: { id } });
  }

  async createGuestUpload(input: CreateGuestUploadInput) {
    const settings = await eventMemorySettingsService.getOrCreate(input.eventId);
    if (!settings.isEnabled) throw new Error("Memory uploads are disabled for this event");
    if (!eventMemorySettingsService.isUploadWindowOpen(settings)) {
      throw new Error("Upload window is not open");
    }

    const guestKey = input.guestId ?? input.uploaderPhone ?? input.uploaderName ?? "anonymous";
    const counts = await this.getGuestUploadCounts(input.eventId, guestKey);

    if (input.mediaType === "image" && counts.photos >= settings.maxPhotosPerGuest) {
      throw new Error(`Photo limit reached (${settings.maxPhotosPerGuest} per guest)`);
    }
    if (input.mediaType === "video" && counts.videos >= settings.maxVideosPerGuest) {
      throw new Error(`Video limit reached (${settings.maxVideosPerGuest} per guest)`);
    }

    if (settings.guestOnlyMode && !input.guestId && !input.uploaderPhone) {
      throw new Error("Guest verification required for uploads");
    }
    if (!settings.allowAnonymousUploads && !input.uploaderName) {
      throw new Error("Name is required for uploads");
    }

    const status: EventMemoryUploadStatus = settings.approvalRequired ? "PENDING" : "APPROVED";

    return prisma.eventMemoryUpload.create({
      data: {
        eventId: input.eventId,
        guestId: input.guestId,
        uploaderName: input.uploaderName,
        uploaderPhone: input.uploaderPhone,
        mediaType: input.mediaType,
        mediaUrl: input.mediaUrl,
        thumbnailUrl: input.thumbnailUrl,
        caption: input.caption,
        consentGiven: input.consentGiven,
        status,
        approvedAt: status === "APPROVED" ? new Date() : undefined,
      },
    });
  }

  private async getGuestUploadCounts(eventId: string, guestKey: string) {
    const uploads = await prisma.eventMemoryUpload.findMany({
      where: {
        eventId,
        status: { not: "REJECTED" },
        OR: [
          { uploaderPhone: guestKey },
          { uploaderName: guestKey },
          { guestId: guestKey },
        ],
      },
      select: { mediaType: true },
    });
    return {
      photos: uploads.filter((u) => u.mediaType === "image").length,
      videos: uploads.filter((u) => u.mediaType === "video").length,
    };
  }

  async listForEvent(
    eventId: string,
    options?: { status?: EventMemoryUploadStatus; page?: number; limit?: number }
  ) {
    const { page, limit, skip } = parsePaginationInput({
      page: options?.page,
      limit: options?.limit ?? 20,
    });
    const where = {
      eventId,
      ...(options?.status ? { status: options.status } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.eventMemoryUpload.findMany({
        where,
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.eventMemoryUpload.count({ where }),
    ]);

    return paginatedResult(items, total, page, limit);
  }

  async listApprovedPublic(eventId: string, page = 1, limit = 20, mediaType?: "image" | "video") {
    const { page: p, limit: l, skip } = parsePaginationInput({ page, limit });
    const where = {
      eventId,
      status: "APPROVED" as const,
      ...(mediaType ? { mediaType } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.eventMemoryUpload.findMany({
        where,
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        skip,
        take: l,
      }),
      prisma.eventMemoryUpload.count({ where }),
    ]);

    return paginatedResult(items, total, p, l);
  }

  async approve(id: string, approvedById: string) {
    return prisma.eventMemoryUpload.update({
      where: { id },
      data: { status: "APPROVED", approvedById, approvedAt: new Date(), rejectionReason: null },
    });
  }

  async reject(id: string, approvedById: string, reason?: string) {
    return prisma.eventMemoryUpload.update({
      where: { id },
      data: { status: "REJECTED", approvedById, approvedAt: new Date(), rejectionReason: reason ?? "Rejected by organizer" },
    });
  }

  async bulkApprove(ids: string[], approvedById: string) {
    return prisma.eventMemoryUpload.updateMany({
      where: { id: { in: ids } },
      data: { status: "APPROVED", approvedById, approvedAt: new Date(), rejectionReason: null },
    });
  }

  async approveAllPending(eventId: string, approvedById: string) {
    return prisma.eventMemoryUpload.updateMany({
      where: { eventId, status: "PENDING" },
      data: { status: "APPROVED", approvedById, approvedAt: new Date(), rejectionReason: null },
    });
  }

  async toggleFeatured(id: string, isFeatured: boolean) {
    return prisma.eventMemoryUpload.update({ where: { id }, data: { isFeatured } });
  }

  async delete(id: string) {
    return prisma.eventMemoryUpload.delete({ where: { id } });
  }

  async getAnalytics(eventId: string) {
    const [pending, approved, rejected, totalPhotos, totalVideos] = await Promise.all([
      prisma.eventMemoryUpload.count({ where: { eventId, status: "PENDING" } }),
      prisma.eventMemoryUpload.count({ where: { eventId, status: "APPROVED" } }),
      prisma.eventMemoryUpload.count({ where: { eventId, status: "REJECTED" } }),
      prisma.eventMemoryUpload.count({ where: { eventId, mediaType: "image", status: { not: "REJECTED" } } }),
      prisma.eventMemoryUpload.count({ where: { eventId, mediaType: "video", status: { not: "REJECTED" } } }),
    ]);
    return { pending, approved, rejected, totalPhotos, totalVideos };
  }
}

export const eventMemoryUploadService = new EventMemoryUploadService();
