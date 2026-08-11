import { prisma } from "@/lib/prisma";
import type { HelpGuideReviewStatus } from "@prisma/client";

/** Mark guides linked to a feature as needing review. Never deletes. */
export async function markGuidesReviewRequiredByFeatureKey(
  featureKey: string,
  opts?: { status?: HelpGuideReviewStatus; note?: string }
) {
  const key = String(featureKey || "").trim();
  if (!key) return { updated: 0 };
  const reviewStatus = opts?.status ?? "REVIEW_REQUIRED";
  const result = await prisma.helpGuide.updateMany({
    where: { featureKey: key },
    data: { reviewStatus },
  });
  return { updated: result.count, featureKey: key, reviewStatus, note: opts?.note ?? null };
}

export async function markGuideVerified(
  id: string,
  opts: { buildId?: string | null; featureVersion?: string | null }
) {
  return prisma.helpGuide.update({
    where: { id },
    data: {
      lastVerifiedAt: new Date(),
      verifiedAgainstBuild: opts.buildId ?? null,
      verifiedAgainstFeatureVersion: opts.featureVersion ?? null,
      reviewStatus: "CURRENT",
    },
  });
}

export async function setGuideReviewStatus(id: string, reviewStatus: HelpGuideReviewStatus) {
  return prisma.helpGuide.update({
    where: { id },
    data: { reviewStatus },
  });
}

export async function listGuidesNeedingReview() {
  return prisma.helpGuide.findMany({
    where: { reviewStatus: { in: ["REVIEW_REQUIRED", "OUTDATED"] } },
    orderBy: [{ reviewStatus: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      featureKey: true,
      reviewStatus: true,
      lastVerifiedAt: true,
      verifiedAgainstBuild: true,
      updatedAt: true,
    },
  });
}
