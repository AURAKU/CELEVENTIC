import { prisma } from "@/lib/prisma";
import { dispatchJob } from "@/lib/queue";
import type { InspirationType, UpgradeStyle, Prisma } from "@prisma/client";

export interface UploadInspirationInput {
  userId: string;
  eventId?: string;
  type: InspirationType;
  url: string;
}

/**
 * Inspiration Upload Engine
 * MVP: stores uploads and queues AI analysis job.
 * Real AI vision API plugs into the analyze handler.
 */
export class InspirationService {
  async upload(input: UploadInspirationInput) {
    const record = await prisma.inspirationUpload.create({
      data: {
        userId: input.userId,
        eventId: input.eventId,
        type: input.type,
        url: input.url,
        status: "UPLOADED",
      },
    });

    await dispatchJob("inspiration-analyze", { uploadId: record.id });
    return record;
  }

  async analyze(uploadId: string) {
    const upload = await prisma.inspirationUpload.findUnique({ where: { id: uploadId } });
    if (!upload) throw new Error("Upload not found");

    await prisma.inspirationUpload.update({
      where: { id: uploadId },
      data: { status: "ANALYZING" },
    });

    // Mock AI analysis — replace with vision API in production
    const analysis = {
      colors: ["#0D9488", "#D4AF37", "#FFFFFF"],
      layout: "centered-elegant",
      fonts: ["Playfair Display", "Inter"],
      style: "premium-modern",
      motion: upload.type === "VIDEO" ? "smooth-fade" : null,
      theme: "celebration",
      mood: "elegant-festive",
    };

    return prisma.inspirationUpload.update({
      where: { id: uploadId },
      data: { analysis: analysis as Prisma.InputJsonValue, status: "READY" },
    });
  }

  async getUpload(uploadId: string) {
    return prisma.inspirationUpload.findUnique({ where: { id: uploadId } });
  }

  async generate(uploadId: string, upgradeStyle: UpgradeStyle) {
    const upload = await prisma.inspirationUpload.findUnique({ where: { id: uploadId } });
    if (!upload || upload.status !== "READY") {
      throw new Error("Upload not ready for generation");
    }

    // Mock generated design URL
    const generatedUrl = `${upload.url}?style=${upgradeStyle.toLowerCase()}`;

    return prisma.inspirationUpload.update({
      where: { id: uploadId },
      data: { upgradeStyle, generatedUrl, status: "GENERATED" },
    });
  }

  async getUserUploads(userId: string) {
    return prisma.inspirationUpload.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const inspirationService = new InspirationService();
