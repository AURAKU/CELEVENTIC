import { prisma } from "@/lib/prisma";
import { EVENT_TYPE_TO_CATEGORY } from "@/lib/template-constants";

export interface RecommendInput {
  eventType: string;
  guestCount?: number;
  packageSlug?: string;
  preferredColors?: string[];
  culturalTheme?: string;
  productType?: string;
  freeOnly?: boolean;
}

export class TemplateRecommendationService {
  async recommend(input: RecommendInput, limit = 6) {
    const category = EVENT_TYPE_TO_CATEGORY[input.eventType] ?? input.eventType;
    const isPremiumPackage = ["premium", "enterprise", "growth"].includes(input.packageSlug ?? "");

    const templates = await prisma.designTemplate.findMany({
      where: {
        isActive: true,
        approvalStatus: "APPROVED",
        ...(input.freeOnly ? { isPremium: false } : {}),
        ...(input.productType ? { productType: input.productType as never } : {}),
        OR: [
          { category },
          { eventType: input.eventType },
          ...(input.culturalTheme ? [{ style: { contains: input.culturalTheme } }] : []),
        ],
      },
      orderBy: [{ isFeatured: "desc" }, { conversionRate: "desc" }, { popularity: "desc" }],
      take: limit * 2,
    });

    const scored = templates.map((t) => {
      let score = t.popularity + t.conversionRate * 100;
      if (t.category === category) score += 50;
      if (t.isFeatured) score += 30;
      if (isPremiumPackage && t.isPremium) score += 20;
      if (!isPremiumPackage && !t.isPremium) score += 25;
      if (input.guestCount && input.guestCount > 200 && t.style === "Luxury") score += 15;
      if (input.guestCount && input.guestCount > 200 && t.style === "Royal") score += 15;
      if (input.guestCount && input.guestCount > 200 && t.style === "Traditional Ghanaian") score += 10;
      if (input.guestCount && input.guestCount > 200 && t.style === "Floral") score += 10;
      return { template: t, score, reason: this.buildReason(t, input) };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => ({ ...s.template, recommendReason: s.reason, matchScore: s.score }));
  }

  private buildReason(template: { category: string; style: string; isPremium: boolean }, input: RecommendInput) {
    const parts: string[] = [];
    parts.push(`Matches ${template.category} events`);
    if (input.guestCount && input.guestCount >= 500) parts.push("ideal for large celebrations");
    else if (input.guestCount && input.guestCount >= 150) parts.push("great for medium-sized events");
    if (template.isPremium) parts.push("premium design");
    parts.push(`${template.style} style`);
    return parts.join(" · ");
  }
}

export const templateRecommendationService = new TemplateRecommendationService();
