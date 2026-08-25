import { prisma } from "@/lib/prisma";
import type { HelpGuide, GuideStep } from "@prisma/client";
import { parseJsonStringArray } from "@/lib/celeventic-guide/sanitize";

export type GuideSnapshot = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  role: string;
  category: string;
  status: string;
  sortOrder: number;
  featured: boolean;
  adminOnly: boolean;
  posterUrl: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  mp4Url: string | null;
  webmUrl: string | null;
  mobileVideoUrl: string | null;
  desktopVideoUrl: string | null;
  durationSec: number | null;
  captionsEnUrl: string | null;
  captionsFrUrl: string | null;
  storyboardKey: string | null;
  transcript: string;
  narrationScript: string;
  a11yDescription: string;
  videoProductionRequired: boolean;
  featureKey: string | null;
  lastVerifiedAt: string | null;
  verifiedAgainstBuild: string | null;
  verifiedAgainstFeatureVersion: string | null;
  reviewStatus: string;
  synonyms: string[];
  contextRoutes: string[];
  relatedSlugs: string[];
  analyticsEvents: string[];
  ogTitle: string | null;
  ogDescription: string | null;
  steps: Array<{
    sortOrder: number;
    title: string;
    body: string;
    stepType: string;
    mediaUrl: string | null;
    motionKey: string | null;
    durationMs: number | null;
  }>;
};

export function buildGuideSnapshot(guide: HelpGuide & { steps: GuideStep[] }): GuideSnapshot {
  return {
    slug: guide.slug,
    title: guide.title,
    summary: guide.summary,
    body: guide.body,
    role: guide.role,
    category: guide.category,
    status: guide.status,
    sortOrder: guide.sortOrder,
    featured: guide.featured,
    adminOnly: guide.adminOnly,
    posterUrl: guide.posterUrl,
    thumbnailUrl: guide.thumbnailUrl,
    videoUrl: guide.videoUrl,
    mp4Url: guide.mp4Url,
    webmUrl: guide.webmUrl,
    mobileVideoUrl: guide.mobileVideoUrl,
    desktopVideoUrl: guide.desktopVideoUrl,
    durationSec: guide.durationSec,
    captionsEnUrl: guide.captionsEnUrl,
    captionsFrUrl: guide.captionsFrUrl,
    storyboardKey: guide.storyboardKey,
    transcript: guide.transcript,
    narrationScript: guide.narrationScript,
    a11yDescription: guide.a11yDescription,
    videoProductionRequired: guide.videoProductionRequired,
    featureKey: guide.featureKey,
    lastVerifiedAt: guide.lastVerifiedAt?.toISOString() ?? null,
    verifiedAgainstBuild: guide.verifiedAgainstBuild,
    verifiedAgainstFeatureVersion: guide.verifiedAgainstFeatureVersion,
    reviewStatus: guide.reviewStatus,
    synonyms: parseJsonStringArray(guide.synonyms),
    contextRoutes: parseJsonStringArray(guide.contextRoutes),
    relatedSlugs: parseJsonStringArray(guide.relatedSlugs),
    analyticsEvents: parseJsonStringArray(guide.analyticsEvents),
    ogTitle: guide.ogTitle,
    ogDescription: guide.ogDescription,
    steps: guide.steps.map((s) => ({
      sortOrder: s.sortOrder,
      title: s.title,
      body: s.body,
      stepType: s.stepType,
      mediaUrl: s.mediaUrl,
      motionKey: s.motionKey,
      durationMs: s.durationMs,
    })),
  };
}

export async function retainGuideVersion(
  guideId: string,
  opts?: { editorId?: string | null; editorLabel?: string | null; note?: string }
) {
  const guide = await prisma.helpGuide.findUnique({
    where: { id: guideId },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
  });
  if (!guide) return null;

  const last = await prisma.helpGuideVersion.findFirst({
    where: { guideId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (last?.version ?? 0) + 1;
  const snapshot = JSON.stringify(buildGuideSnapshot(guide));

  return prisma.helpGuideVersion.create({
    data: {
      guideId,
      version,
      snapshot,
      editorId: opts?.editorId ?? null,
      editorLabel: opts?.editorLabel ?? null,
      note: opts?.note ?? "",
    },
  });
}

export async function listGuideVersions(guideId: string) {
  return prisma.helpGuideVersion.findMany({
    where: { guideId },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      editorId: true,
      editorLabel: true,
      note: true,
      createdAt: true,
    },
  });
}

export async function getGuideVersion(guideId: string, versionId: string) {
  return prisma.helpGuideVersion.findFirst({
    where: { id: versionId, guideId },
  });
}

/**
 * Rollback restores content fields + steps from a snapshot.
 * Preserves slug and analytics counters (viewCount / helpfulYes / helpfulNo).
 */
export async function rollbackGuideToVersion(
  guideId: string,
  versionId: string,
  opts?: { editorId?: string | null; editorLabel?: string | null }
) {
  const current = await prisma.helpGuide.findUnique({
    where: { id: guideId },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
  });
  if (!current) return null;

  const ver = await getGuideVersion(guideId, versionId);
  if (!ver) return null;

  // Retain current state before rollback
  await retainGuideVersion(guideId, {
    editorId: opts?.editorId,
    editorLabel: opts?.editorLabel,
    note: `pre-rollback-to-v${ver.version}`,
  });

  let snap: GuideSnapshot;
  try {
    snap = JSON.parse(ver.snapshot) as GuideSnapshot;
  } catch {
    throw new Error("Corrupt version snapshot");
  }

  // Preserve slug + analytics
  await prisma.helpGuide.update({
    where: { id: guideId },
    data: {
      title: snap.title,
      summary: snap.summary,
      body: snap.body,
      role: snap.role as never,
      category: snap.category as never,
      status: snap.status as never,
      sortOrder: snap.sortOrder,
      featured: snap.featured,
      adminOnly: snap.adminOnly,
      posterUrl: snap.posterUrl,
      thumbnailUrl: snap.thumbnailUrl ?? null,
      videoUrl: snap.videoUrl,
      mp4Url: snap.mp4Url ?? null,
      webmUrl: snap.webmUrl ?? null,
      mobileVideoUrl: snap.mobileVideoUrl ?? null,
      desktopVideoUrl: snap.desktopVideoUrl ?? null,
      durationSec: snap.durationSec ?? null,
      captionsEnUrl: snap.captionsEnUrl,
      captionsFrUrl: snap.captionsFrUrl,
      storyboardKey: snap.storyboardKey,
      transcript: snap.transcript,
      narrationScript: snap.narrationScript ?? "",
      a11yDescription: snap.a11yDescription ?? "",
      videoProductionRequired: snap.videoProductionRequired ?? true,
      featureKey: snap.featureKey ?? null,
      reviewStatus: (snap.reviewStatus as never) ?? "REVIEW_REQUIRED",
      synonyms: JSON.stringify(snap.synonyms ?? []),
      contextRoutes: JSON.stringify(snap.contextRoutes ?? []),
      relatedSlugs: JSON.stringify(snap.relatedSlugs ?? []),
      analyticsEvents: JSON.stringify(snap.analyticsEvents ?? []),
      ogTitle: snap.ogTitle,
      ogDescription: snap.ogDescription,
    },
  });

  await prisma.guideStep.deleteMany({ where: { guideId } });
  for (const step of snap.steps ?? []) {
    await prisma.guideStep.create({
      data: {
        guideId,
        sortOrder: step.sortOrder,
        title: step.title,
        body: step.body,
        stepType: step.stepType,
        mediaUrl: step.mediaUrl,
        motionKey: step.motionKey,
        durationMs: step.durationMs,
      },
    });
  }

  return prisma.helpGuide.findUnique({
    where: { id: guideId },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
  });
}
