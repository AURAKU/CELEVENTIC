import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type {
  InspirationOutputType,
  InspirationPlatform,
  InspirationSourceType,
} from "@prisma/client";
import { paginatedResult, parsePaginationInput } from "@/lib/pagination";
import { slugify } from "@/lib/utils";
import { detectPlatform, extractDomain, inferTitleFromUrl } from "@/lib/inspiration/platform-detector";
import { generateOriginalTemplate } from "@/lib/inspiration/template-generator";
import { DEFAULT_BANNED_DOMAINS, DAILY_ANALYSIS_LIMIT } from "@/lib/inspiration/inspiration-constants";
import { templateEngineService } from "@/services/template-engine/template-engine.service";
import { invitationInspirationService } from "@/services/invitations/invitation-inspiration.service";
import type { TemplateSchema } from "@/types/template-engine";

export interface AnalyzeUrlInput {
  userId: string;
  eventId?: string;
  url: string;
  consentConfirmed: boolean;
}

export interface AnalyzeUploadInput {
  userId: string;
  eventId?: string;
  sourceType: "UPLOAD_IMAGE" | "UPLOAD_VIDEO" | "UPLOAD_AUDIO";
  mediaUrl: string;
  mimeType?: string;
  sizeBytes?: number;
  durationSec?: number;
  consentConfirmed: boolean;
  clientColors?: { hex: string; weight: number }[];
  brightness?: number;
  aspectRatio?: number;
  fileName?: string;
}

export class InspirationEngineService {
  async audit(action: string, userId?: string, sourceId?: string, metadata?: Record<string, unknown>) {
    await prisma.inspirationAuditLog.create({
      data: {
        action,
        userId,
        sourceId,
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async ensureDefaultPolicies() {
    for (const domain of DEFAULT_BANNED_DOMAINS) {
      await prisma.inspirationDomainPolicy.upsert({
        where: { domain },
        update: {},
        create: { domain, policyType: "BANNED", reason: "Copyright-protected marketplace" },
      });
    }
  }

  async checkDomainPolicy(url: string): Promise<{ allowed: boolean; reason?: string }> {
    await this.ensureDefaultPolicies();
    if (url.startsWith("/uploads/")) return { allowed: true };

    const domain = extractDomain(url);
    if (!domain) return { allowed: false, reason: "Invalid URL" };

    const policies = await prisma.inspirationDomainPolicy.findMany({
      where: { policyType: "BANNED" },
    });
    for (const p of policies) {
      if (domain === p.domain || domain.endsWith(`.${p.domain}`)) {
        return { allowed: false, reason: p.reason ?? `Blocked domain: ${p.domain}` };
      }
    }
    return { allowed: true };
  }

  async checkRateLimit(userId: string) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await prisma.inspirationSource.count({
      where: { userId, createdAt: { gte: since } },
    });
    if (count >= DAILY_ANALYSIS_LIMIT) {
      throw new Error(`Daily inspiration limit reached (${DAILY_ANALYSIS_LIMIT}). Try again tomorrow.`);
    }
  }

  async createFromUrl(input: AnalyzeUrlInput) {
    if (!input.consentConfirmed) throw new Error("You must confirm ownership or permission to use this inspiration.");
    await this.checkRateLimit(input.userId);

    const policy = await this.checkDomainPolicy(input.url);
    if (!policy.allowed) {
      const blocked = await prisma.inspirationSource.create({
        data: {
          userId: input.userId,
          eventId: input.eventId,
          sourceType: "URL",
          sourceUrl: input.url,
          platform: detectPlatform(input.url),
          consentConfirmed: true,
          status: "BLOCKED",
          blockedReason: policy.reason,
        },
      });
      await this.audit("source.blocked", input.userId, blocked.id, { url: input.url });
      throw new Error(policy.reason ?? "Source not allowed");
    }

    const platform = detectPlatform(input.url);
    const source = await prisma.inspirationSource.create({
      data: {
        userId: input.userId,
        eventId: input.eventId,
        sourceType: "URL",
        sourceUrl: input.url,
        platform,
        title: inferTitleFromUrl(input.url, platform),
        consentConfirmed: true,
        status: "PENDING",
      },
    });
    await this.audit("source.created", input.userId, source.id, { type: "URL", platform });
    await this.runAnalysis(source.id);
    return this.getSource(source.id, input.userId);
  }

  async createFromUpload(input: AnalyzeUploadInput) {
    if (!input.consentConfirmed) throw new Error("You must confirm ownership or permission to use this inspiration.");
    await this.checkRateLimit(input.userId);

    const sourceTypeMap = {
      UPLOAD_IMAGE: "UPLOAD_IMAGE",
      UPLOAD_VIDEO: "UPLOAD_VIDEO",
      UPLOAD_AUDIO: "UPLOAD_AUDIO",
    } as const;

    const source = await prisma.inspirationSource.create({
      data: {
        userId: input.userId,
        eventId: input.eventId,
        sourceType: sourceTypeMap[input.sourceType],
        sourceUrl: input.mediaUrl,
        platform: "UPLOAD",
        title: input.fileName ?? "Uploaded inspiration",
        consentConfirmed: true,
        status: "PENDING",
        media: {
          create: {
            mediaType: input.sourceType.replace("UPLOAD_", ""),
            url: input.mediaUrl,
            mimeType: input.mimeType,
            sizeBytes: input.sizeBytes,
            durationSec: input.durationSec,
          },
        },
      },
      include: { media: true },
    });

    await this.audit("source.uploaded", input.userId, source.id, { mediaType: input.sourceType });
    await this.runAnalysis(source.id, {
      clientColors: input.clientColors,
      brightness: input.brightness,
      aspectRatio: input.aspectRatio,
      fileName: input.fileName,
    });
    return this.getSource(source.id, input.userId);
  }

  private async setStatus(sourceId: string, status: import("@prisma/client").InspirationEngineStatus) {
    await prisma.inspirationSource.update({ where: { id: sourceId }, data: { status } });
  }

  async runAnalysis(
    sourceId: string,
    uploadMeta?: {
      clientColors?: { hex: string; weight: number }[];
      brightness?: number;
      aspectRatio?: number;
      fileName?: string;
    }
  ) {
    const source = await prisma.inspirationSource.findUnique({
      where: { id: sourceId },
      include: { media: true },
    });
    if (!source) throw new Error("Source not found");

    try {
      await this.setStatus(sourceId, "ANALYZING");
      await this.setStatus(sourceId, "EXTRACTING_COLORS");

      let colorPalette = ["#0B8A83", "#D4A63A", "#FAF8F4", "#0F172A"];
      let typographyMood = "elegant-modern";
      let animationStyle = "smooth-reveal";
      let revealType = "MEMORIAL_BOOK";
      let invitationCategory = "Celebration";
      let audioMood: string | undefined;
      let thumbnailUrl: string | undefined;

      if (source.sourceType.startsWith("UPLOAD_") && source.media[0]) {
        const media = source.media[0];
        thumbnailUrl = media.mediaType === "IMAGE" ? media.url : undefined;
        if (media.mediaType === "IMAGE") {
          const uploadAnalysis = invitationInspirationService.analyze({
            url: media.url,
            type: "image",
            name: uploadMeta?.fileName,
            colors: uploadMeta?.clientColors,
            brightness: uploadMeta?.brightness,
            aspectRatio: uploadMeta?.aspectRatio,
          });
          colorPalette = uploadAnalysis.designConfig.colors
            ? Object.values(uploadAnalysis.designConfig.colors).filter((c): c is string => typeof c === "string").slice(0, 5)
            : colorPalette;
          typographyMood = uploadAnalysis.concept.mood;
          animationStyle = uploadAnalysis.designConfig.animation ?? animationStyle;
          invitationCategory = uploadAnalysis.concept.style;
        } else if (media.mediaType === "VIDEO") {
          animationStyle = "cinematic-loop";
          revealType = "CINEMATIC";
          invitationCategory = "Video Experience";
        } else if (media.mediaType === "AUDIO") {
          audioMood = "celebratory-upbeat";
          animationStyle = "audio-synced";
        }
      } else if (source.sourceUrl) {
        const platform = source.platform;
        const platformPalettes: Record<InspirationPlatform, string[]> = {
          INSTAGRAM: ["#E1306C", "#F77737", "#FCAF45", "#FAF8F4"],
          TIKTOK: ["#00F2EA", "#FF0050", "#0F172A", "#FFFFFF"],
          YOUTUBE: ["#FF0000", "#0F172A", "#FFFFFF", "#CCCCCC"],
          PINTEREST: ["#E60023", "#FAF8F4", "#0B8A83", "#D4A63A"],
          WEBSITE: ["#0B8A83", "#D4A63A", "#FAF8F4", "#0F172A"],
          IMAGE_LINK: ["#0B8A83", "#D4A63A", "#FAF8F4"],
          VIDEO_LINK: ["#0F172A", "#0B8A83", "#D4A63A"],
          UPLOAD: colorPalette,
          UNKNOWN: colorPalette,
        };
        colorPalette = platformPalettes[platform] ?? colorPalette;
        typographyMood = "premium-social";
        if (platform === "YOUTUBE" || platform === "TIKTOK" || platform === "INSTAGRAM") {
          animationStyle = "reel-style-motion";
          revealType = "PASSPORT";
        }
        invitationCategory = `${platform} inspired concept`;
        audioMood = platform === "TIKTOK" || platform === "INSTAGRAM" ? "trending-upbeat" : undefined;
      }

      await this.setStatus(sourceId, "STUDYING_FLOW");
      await this.setStatus(sourceId, "GENERATING_CONCEPT");

      const analysisData = {
        thumbnailUrl,
        colorPalette: colorPalette as Prisma.InputJsonValue,
        typographyMood,
        layoutStructure: { type: "mobile-first-vertical", sections: ["hero", "details", "cta", "footer"] },
        sectionFlow: { order: ["intro", "event_title", "date_venue", "rsvp", "qr"] },
        animationStyle,
        revealType,
        invitationCategory,
        audioMood,
        ctaStructure: { primary: "RSVP Now", secondary: "Add to Calendar" },
        rsvpFlow: { steps: ["open", "confirm", "qr"] },
        qrPlacement: "bottom-right",
        seatingConcept: "table-cards",
        features: { menu: true, gallery: true, memory: true, livestream: false },
        conceptSummary:
          "Original Celeventic concept inspired by mood, layout flow, and color harmony. No copyrighted assets reproduced.",
        completedAt: new Date(),
      };

      await prisma.inspirationAnalysis.upsert({
        where: { sourceId },
        create: { sourceId, ...analysisData },
        update: analysisData,
      });

      await this.setStatus(sourceId, "READY");
      await this.audit("analysis.completed", source.userId, sourceId);
    } catch (err) {
      await this.setStatus(sourceId, "FAILED");
      await this.audit("analysis.failed", source.userId, sourceId, {
        error: err instanceof Error ? err.message : "Unknown",
      });
      throw err;
    }
  }

  async generateTemplate(sourceId: string, userId: string, outputType: InspirationOutputType) {
    const source = await prisma.inspirationSource.findFirst({
      where: { id: sourceId, userId },
      include: { analysis: true },
    });
    if (!source?.analysis) throw new Error("Analysis not ready");
    if (source.status !== "READY" && source.status !== "GENERATED") {
      throw new Error("Source is not ready for template generation");
    }
    if (source.reviewStatus === "REJECTED") throw new Error("This inspiration was rejected by admin");

    const colors = (source.analysis.colorPalette as string[]) ?? ["#0B8A83", "#D4A63A"];
    const schema = generateOriginalTemplate(outputType, {
      colorPalette: colors,
      typographyMood: source.analysis.typographyMood ?? undefined,
      animationStyle: source.analysis.animationStyle ?? undefined,
      invitationCategory: source.analysis.invitationCategory ?? undefined,
      audioMood: source.analysis.audioMood ?? undefined,
    });

    const designTemplate = await templateEngineService.create({
      createdById: userId,
      schema: schema as TemplateSchema,
      previewUrl: source.analysis.thumbnailUrl ?? undefined,
    });

    const studioProject = await prisma.studioProject.create({
      data: {
        userId,
        sourceId,
        name: schema.name,
        productType: schema.productType,
        designTemplateId: designTemplate.id,
        config: schema as unknown as Prisma.InputJsonValue,
        audioConfig: source.analysis.audioMood
          ? { mood: source.analysis.audioMood, trimStart: 0, trimEnd: 30, fadeIn: 1, fadeOut: 1, loop: true }
          : undefined,
        status: "DRAFT",
      },
    });

    const slug = `${slugify(schema.name)}-${Date.now().toString(36)}`;
    const generated = await prisma.inspirationGeneratedTemplate.create({
      data: {
        sourceId,
        userId,
        outputType,
        name: schema.name,
        slug,
        schema: schema as unknown as Prisma.InputJsonValue,
        thumbnailUrl: source.analysis.thumbnailUrl,
        designTemplateId: designTemplate.id,
        studioProjectId: studioProject.id,
      },
    });

    await prisma.inspirationSource.update({
      where: { id: sourceId },
      data: { status: "GENERATED", reviewStatus: "APPROVED" },
    });

    await this.audit("template.generated", userId, sourceId, { outputType, templateId: designTemplate.id });

    return {
      generated,
      designTemplateId: designTemplate.id,
      studioProjectId: studioProject.id,
      builderUrl: `/dashboard/design-studio/builder/${designTemplate.id}`,
    };
  }

  async getHistory(userId: string, page = 1, limit = 20) {
    const { skip, limit: lim } = parsePaginationInput({ page, limit });
    const [items, total] = await Promise.all([
      prisma.inspirationSource.findMany({
        where: { userId },
        include: {
          analysis: { select: { thumbnailUrl: true, conceptSummary: true, colorPalette: true } },
          generatedTemplates: { select: { id: true, name: true, outputType: true, designTemplateId: true }, take: 1, orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: lim,
      }),
      prisma.inspirationSource.count({ where: { userId } }),
    ]);
    return paginatedResult(items, total, page, lim);
  }

  async getSource(id: string, userId: string) {
    const source = await prisma.inspirationSource.findFirst({
      where: { id, userId },
      include: {
        analysis: true,
        media: true,
        generatedTemplates: { orderBy: { createdAt: "desc" }, take: 3 },
      },
    });
    if (!source) throw new Error("Not found");
    return source;
  }

  async deleteSource(id: string, userId: string) {
    const source = await prisma.inspirationSource.findFirst({ where: { id, userId } });
    if (!source) throw new Error("Not found");
    await prisma.inspirationSource.delete({ where: { id } });
    await this.audit("source.deleted", userId, id);
  }

  async adminListPending(page = 1, limit = 20) {
    const { skip, limit: lim } = parsePaginationInput({ page, limit });
    const [items, total] = await Promise.all([
      prisma.inspirationSource.findMany({
        where: { reviewStatus: "PENDING", status: { not: "BLOCKED" } },
        include: { user: { select: { name: true, email: true } }, analysis: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: lim,
      }),
      prisma.inspirationSource.count({ where: { reviewStatus: "PENDING", status: { not: "BLOCKED" } } }),
    ]);
    return paginatedResult(items, total, page, lim);
  }

  async adminReview(sourceId: string, reviewStatus: "APPROVED" | "REJECTED", adminId: string) {
    await prisma.inspirationSource.update({
      where: { id: sourceId },
      data: { reviewStatus },
    });
    await this.audit("admin.review", adminId, sourceId, { reviewStatus });
  }

  async listDomainPolicies() {
    return prisma.inspirationDomainPolicy.findMany({ orderBy: { domain: "asc" } });
  }

  async upsertDomainPolicy(domain: string, policyType: "ALLOWED" | "BANNED", reason?: string, createdById?: string) {
    return prisma.inspirationDomainPolicy.upsert({
      where: { domain },
      update: { policyType, reason },
      create: { domain, policyType, reason, createdById },
    });
  }
}

export const inspirationEngineService = new InspirationEngineService();
