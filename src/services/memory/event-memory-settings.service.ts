import { prisma } from "@/lib/prisma";
import type { EventMemorySettings } from "@prisma/client";

export interface UpdateMemorySettingsInput {
  maxPhotosPerGuest?: number;
  maxVideosPerGuest?: number;
  maxImageSizeMb?: number;
  maxVideoSizeMb?: number;
  uploadWindowStart?: string | null;
  uploadWindowEnd?: string | null;
  approvalRequired?: boolean;
  guestOnlyMode?: boolean;
  allowAnonymousUploads?: boolean;
  allowDownloads?: boolean;
  isEnabled?: boolean;
}

const DEFAULTS = {
  maxPhotosPerGuest: 10,
  maxVideosPerGuest: 2,
  maxImageSizeMb: 50,
  maxVideoSizeMb: 200,
  approvalRequired: true,
  guestOnlyMode: false,
  allowAnonymousUploads: true,
  allowDownloads: true,
  isEnabled: true,
};

export class EventMemorySettingsService {
  async getOrCreate(eventId: string): Promise<EventMemorySettings> {
    const existing = await prisma.eventMemorySettings.findUnique({ where: { eventId } });
    if (existing) return existing;
    return prisma.eventMemorySettings.create({ data: { eventId, ...DEFAULTS } });
  }

  async get(eventId: string) {
    return this.getOrCreate(eventId);
  }

  async update(eventId: string, data: UpdateMemorySettingsInput) {
    await this.getOrCreate(eventId);
    return prisma.eventMemorySettings.update({
      where: { eventId },
      data: {
        ...data,
        uploadWindowStart: data.uploadWindowStart === null ? null : data.uploadWindowStart ? new Date(data.uploadWindowStart) : undefined,
        uploadWindowEnd: data.uploadWindowEnd === null ? null : data.uploadWindowEnd ? new Date(data.uploadWindowEnd) : undefined,
      },
    });
  }

  isUploadWindowOpen(settings: EventMemorySettings): boolean {
    if (!settings.isEnabled) return false;
    const now = new Date();
    if (settings.uploadWindowStart && now < settings.uploadWindowStart) return false;
    if (settings.uploadWindowEnd && now > settings.uploadWindowEnd) return false;
    return true;
  }
}

export const eventMemorySettingsService = new EventMemorySettingsService();
