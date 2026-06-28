import { invitationInspirationService } from "@/services/invitations/invitation-inspiration.service";
import type { UploadAnalysisInput } from "@/services/invitations/invitation-inspiration.service";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const ALLOWED_MEDIA = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"];
const MAX_URL_LENGTH = 2048;

export class InspirationOsService {
  validateUploadUrl(url: string): { valid: boolean; error?: string } {
    if (!url || url.length > MAX_URL_LENGTH) return { valid: false, error: "Invalid URL" };
    if (url.startsWith("/uploads/") || url.startsWith("/api/uploads/")) return { valid: true };
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) return { valid: false, error: "HTTPS required" };
      return { valid: true };
    } catch {
      return { valid: false, error: "Invalid URL format" };
    }
  }

  async analyzeAndStore(orderId: string, userId: string, input: UploadAnalysisInput) {
    const validation = this.validateUploadUrl(input.url);
    if (!validation.valid) throw new Error(validation.error);

    const analysis = invitationInspirationService.analyze(input);

    const order = await prisma.invitationOrder.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new Error("Order not found");

    const existing = (order.inspirationAssets as { items?: unknown[] } | null)?.items ?? [];
    const asset = {
      url: input.url,
      type: input.type,
      name: input.name,
      analyzedAt: new Date().toISOString(),
      concept: analysis.concept,
      suggestedLayout: analysis.suggestedLayout,
      colorPalette: analysis.designConfig.colors,
      confidence: analysis.confidence,
    };

    await prisma.invitationOrder.update({
      where: { id: orderId },
      data: {
        inspirationAssets: { items: [...existing, asset] } as Prisma.InputJsonValue,
        designConfig: analysis.designConfig as object,
      },
    });

    return { asset, analysis };
  }
}

export const inspirationOsService = new InspirationOsService();
