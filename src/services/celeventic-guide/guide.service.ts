import { prisma } from "@/lib/prisma";
import type { HelpGuide, GuideStep, HelpGuideRole, HelpGuideStatus, HelpGuideCategory } from "@prisma/client";
import { CELEVENTIC_GUIDE_CATALOG } from "@/lib/celeventic-guide/catalog";
import {
  parseJsonStringArray,
  sanitizeGuideSlug,
  sanitizeGuideText,
  toJsonStringArray,
} from "@/lib/celeventic-guide/sanitize";
import { isGuidePubliclyVisible, roleFromUserRole } from "@/lib/celeventic-guide/visibility";
import { searchGuides } from "@/lib/celeventic-guide/search";
import { resolveRelatedGuides } from "@/lib/celeventic-guide/related";
import type { GuideRole } from "@/lib/celeventic-guide/types";
import { isGuideMarkedNew } from "@/lib/celeventic-guide/guide-new";
import { retainGuideVersion } from "@/services/celeventic-guide/versioning.service";
import { resolveGuidePlayback } from "@/lib/celeventic-guide/media";

export type HelpGuideWithSteps = HelpGuide & { steps: GuideStep[] };

/** Auto-publish guides whose scheduledPublishAt has elapsed. */
export async function promoteScheduledGuides() {
  const due = await prisma.helpGuide.findMany({
    where: {
      status: "DRAFT",
      scheduledPublishAt: { lte: new Date() },
      adminOnly: false,
    },
    select: { id: true },
  });
  for (const row of due) {
    await prisma.helpGuide.update({
      where: { id: row.id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
  }
  return due.length;
}

function mapDbToSearchShape(g: HelpGuide) {
  return {
    slug: g.slug,
    title: g.title,
    summary: g.summary,
    synonyms: parseJsonStringArray(g.synonyms),
    category: g.category,
    role: g.role as GuideRole,
    featured: g.featured,
    adminOnly: g.adminOnly,
    status: g.status as "DRAFT" | "PUBLISHED" | "ARCHIVED",
    relatedSlugs: parseJsonStringArray(g.relatedSlugs),
  };
}

export async function seedCeleventicGuides(options?: { forceUpdate?: boolean }) {
  let created = 0;
  let updated = 0;

  for (const entry of CELEVENTIC_GUIDE_CATALOG) {
    const slug = sanitizeGuideSlug(entry.slug);
    const existing = await prisma.helpGuide.findUnique({ where: { slug } });
    const data = {
      title: sanitizeGuideText(entry.title, 200),
      summary: sanitizeGuideText(entry.summary, 500),
      body: sanitizeGuideText(entry.body ?? entry.summary, 8000),
      role: entry.role as HelpGuideRole,
      category: entry.category as HelpGuideCategory,
      status: (entry.status ?? "PUBLISHED") as HelpGuideStatus,
      sortOrder: entry.sortOrder,
      featured: !!entry.featured,
      adminOnly: !!entry.adminOnly,
      posterUrl: entry.posterUrl ?? null,
      videoUrl: entry.videoUrl ?? null,
      captionsEnUrl: entry.captionsEnUrl ?? null,
      storyboardKey: entry.storyboardKey ?? entry.slug,
      transcript: sanitizeGuideText(entry.transcript ?? "", 12000),
      synonyms: toJsonStringArray(entry.synonyms ?? []),
      contextRoutes: toJsonStringArray(entry.contextRoutes ?? []),
      relatedSlugs: toJsonStringArray(entry.relatedSlugs ?? []),
      ogTitle: sanitizeGuideText(entry.ogTitle ?? entry.title, 200),
      ogDescription: sanitizeGuideText(entry.ogDescription ?? entry.summary, 300),
      publishedAt: (entry.status ?? "PUBLISHED") === "PUBLISHED" ? new Date() : null,
    };

    let guideId: string;
    if (!existing) {
      const guide = await prisma.helpGuide.create({ data: { slug, ...data } });
      guideId = guide.id;
      created++;
    } else if (options?.forceUpdate) {
      await prisma.helpGuide.update({ where: { id: existing.id }, data });
      guideId = existing.id;
      updated++;
      await prisma.guideStep.deleteMany({ where: { guideId } });
    } else {
      continue;
    }

    for (let i = 0; i < entry.steps.length; i++) {
      const step = entry.steps[i];
      await prisma.guideStep.create({
        data: {
          guideId,
          sortOrder: i,
          title: sanitizeGuideText(step.title, 200),
          body: sanitizeGuideText(step.body, 2000),
          stepType: step.stepType ?? "motion",
          motionKey: step.motionKey ?? null,
          durationMs: step.durationMs ?? null,
        },
      });
    }
  }

  return { created, updated, total: CELEVENTIC_GUIDE_CATALOG.length };
}

export async function listPublicGuides(opts?: {
  role?: GuideRole | null;
  category?: string | null;
  q?: string | null;
  viewerRole?: string | null;
}) {
  const rows = await prisma.helpGuide.findMany({
    where: {
      status: "PUBLISHED",
      adminOnly: false,
      ...(opts?.role ? { role: opts.role as HelpGuideRole } : {}),
      ...(opts?.category ? { category: opts.category as HelpGuideCategory } : {}),
    },
    include: { steps: { select: { id: true }, orderBy: { sortOrder: "asc" } } },
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { title: "asc" }],
  });

  const preferred = opts?.role ?? roleFromUserRole(opts?.viewerRole ?? null);

  if (opts?.q?.trim()) {
    const hits = searchGuides(opts.q, {
      role: preferred,
      catalog: rows.map(mapDbToSearchShape),
    });
    const bySlug = new Map(rows.map((r) => [r.slug, r]));
    return hits
      .map((h) => bySlug.get(h.slug))
      .filter(Boolean)
      .map((g) => ({
        slug: g!.slug,
        title: g!.title,
        summary: g!.summary,
        role: g!.role,
        category: g!.category,
        featured: g!.featured,
        posterUrl: g!.posterUrl,
        hasVideo: !!g!.videoUrl,
        stepCount: g!.steps.length,
      }));
  }

  let sorted = rows;
  if (preferred && preferred !== "ADMIN") {
    sorted = [...rows].sort((a, b) => {
      const ar = a.role === preferred ? 0 : 1;
      const br = b.role === preferred ? 0 : 1;
      if (ar !== br) return ar - br;
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    });
  }

  return sorted.map((g) => ({
    slug: g.slug,
    title: g.title,
    summary: g.summary,
    role: g.role,
    category: g.category,
    featured: g.featured,
    posterUrl: g.posterUrl,
    hasVideo: !!g.videoUrl,
    stepCount: g.steps.length,
  }));
}

export async function getPublicGuideBySlug(slug: string, opts?: { viewerIsAdmin?: boolean }) {
  const guide = await prisma.helpGuide.findUnique({
    where: { slug: sanitizeGuideSlug(slug) },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
  });
  if (!guide) return null;

  const visible = isGuidePubliclyVisible({
    status: guide.status,
    adminOnly: guide.adminOnly,
  });

  if (!visible) {
    if (opts?.viewerIsAdmin && guide.adminOnly) return guide;
    return null;
  }

  return guide;
}

export async function getRelatedPublicGuides(guide: HelpGuide, limit = 4) {
  const relatedSlugs = parseJsonStringArray(guide.relatedSlugs);
  const catalogShape = {
    slug: guide.slug,
    relatedSlugs,
    role: guide.role as GuideRole,
    category: guide.category as GuideCatalogCategory,
  };
  // Use DB when possible
  const candidates = await prisma.helpGuide.findMany({
    where: { status: "PUBLISHED", adminOnly: false, slug: { not: guide.slug } },
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
    take: 40,
  });

  const picked: HelpGuide[] = [];
  const seen = new Set<string>();
  for (const slug of relatedSlugs) {
    const hit = candidates.find((c) => c.slug === slug);
    if (hit && !seen.has(hit.slug)) {
      picked.push(hit);
      seen.add(hit.slug);
    }
    if (picked.length >= limit) return picked;
  }
  for (const c of candidates) {
    if (seen.has(c.slug)) continue;
    if (c.role === guide.role || c.category === guide.category) {
      picked.push(c);
      seen.add(c.slug);
    }
    if (picked.length >= limit) break;
  }
  void catalogShape;
  void resolveRelatedGuides;
  return picked;
}

type GuideCatalogCategory = HelpGuide["category"];

export async function recordGuideView(slug: string) {
  await prisma.helpGuide
    .update({
      where: { slug },
      data: { viewCount: { increment: 1 } },
    })
    .catch(() => undefined);
}

export async function recordGuideFeedback(slug: string, helpful: boolean, reason?: string) {
  const guide = await prisma.helpGuide.update({
    where: { slug },
    data: helpful ? { helpfulYes: { increment: 1 } } : { helpfulNo: { increment: 1 } },
  });
  const cleaned = (reason || "").trim().slice(0, 500);
  if (cleaned) {
    try {
      await prisma.helpGuideFeedback.create({
        data: { guideId: guide.id, helpful, reason: cleaned },
      });
    } catch {
      /* feedback table may not be migrated yet in some envs */
    }
  }
}

export async function listAdminGuides() {
  return prisma.helpGuide.findMany({
    include: { steps: { orderBy: { sortOrder: "asc" } } },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });
}

export async function getAdminGuide(id: string) {
  return prisma.helpGuide.findUnique({
    where: { id },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function createAdminGuide(input: Record<string, unknown>) {
  const slug = sanitizeGuideSlug(input.slug || input.title);
  if (!slug) throw new Error("Slug required");
  const status = String(input.status ?? "DRAFT") as HelpGuideStatus;
  const guide = await prisma.helpGuide.create({
    data: {
      slug,
      title: sanitizeGuideText(input.title, 200),
      summary: sanitizeGuideText(input.summary, 500),
      body: sanitizeGuideText(input.body, 8000),
      role: String(input.role ?? "GUEST") as HelpGuideRole,
      category: String(input.category ?? "PLATFORM") as HelpGuideCategory,
      status,
      sortOrder: Number(input.sortOrder ?? 0) || 0,
      featured: !!input.featured,
      adminOnly: !!input.adminOnly,
      posterUrl: input.posterUrl ? sanitizeGuideText(input.posterUrl, 500) : null,
      thumbnailUrl: input.thumbnailUrl ? sanitizeGuideText(input.thumbnailUrl, 500) : null,
      videoUrl: input.videoUrl ? sanitizeGuideText(input.videoUrl, 500) : null,
      mp4Url: input.mp4Url ? sanitizeGuideText(input.mp4Url, 500) : null,
      webmUrl: input.webmUrl ? sanitizeGuideText(input.webmUrl, 500) : null,
      mobileVideoUrl: input.mobileVideoUrl ? sanitizeGuideText(input.mobileVideoUrl, 500) : null,
      desktopVideoUrl: input.desktopVideoUrl ? sanitizeGuideText(input.desktopVideoUrl, 500) : null,
      durationSec: input.durationSec != null ? Number(input.durationSec) || null : null,
      captionsEnUrl: input.captionsEnUrl ? sanitizeGuideText(input.captionsEnUrl, 500) : null,
      captionsFrUrl: input.captionsFrUrl ? sanitizeGuideText(input.captionsFrUrl, 500) : null,
      storyboardKey: input.storyboardKey ? sanitizeGuideSlug(input.storyboardKey) : null,
      transcript: sanitizeGuideText(input.transcript, 12000),
      narrationScript: sanitizeGuideText(input.narrationScript, 12000),
      a11yDescription: sanitizeGuideText(input.a11yDescription ?? input.summary, 500),
      videoProductionRequired: input.videoProductionRequired != null ? !!input.videoProductionRequired : true,
      featureKey: input.featureKey ? sanitizeGuideText(input.featureKey, 80) : null,
      reviewStatus: (input.reviewStatus as HelpGuideReviewStatus) ?? "CURRENT",
      synonyms: toJsonStringArray(Array.isArray(input.synonyms) ? (input.synonyms as string[]) : parseJsonStringArray(input.synonyms)),
      contextRoutes: toJsonStringArray(
        Array.isArray(input.contextRoutes) ? (input.contextRoutes as string[]) : parseJsonStringArray(input.contextRoutes)
      ),
      relatedSlugs: toJsonStringArray(
        Array.isArray(input.relatedSlugs) ? (input.relatedSlugs as string[]) : parseJsonStringArray(input.relatedSlugs)
      ),
      analyticsEvents: toJsonStringArray(
        Array.isArray(input.analyticsEvents)
          ? (input.analyticsEvents as string[])
          : parseJsonStringArray(input.analyticsEvents)
      ),
      ogTitle: sanitizeGuideText(input.ogTitle ?? input.title, 200),
      ogDescription: sanitizeGuideText(input.ogDescription ?? input.summary, 300),
      publishedAt: status === "PUBLISHED" ? new Date() : null,
    },
  });
  return guide;
}

export async function updateAdminGuide(
  id: string,
  input: Record<string, unknown>,
  opts?: { editorId?: string | null; editorLabel?: string | null; skipVersion?: boolean }
) {
  const existing = await prisma.helpGuide.findUnique({
    where: { id },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
  });
  if (!existing) return null;

  if (!opts?.skipVersion) {
    await retainGuideVersion(id, {
      editorId: opts?.editorId,
      editorLabel: opts?.editorLabel,
      note: "pre-edit",
    }).catch(() => undefined);
  }

  const status = input.status != null ? (String(input.status) as HelpGuideStatus) : existing.status;
  const data: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (input.title != null) data.title = sanitizeGuideText(input.title, 200);
  if (input.summary != null) data.summary = sanitizeGuideText(input.summary, 500);
  if (input.body != null) data.body = sanitizeGuideText(input.body, 8000);
  if (input.role != null) data.role = String(input.role);
  if (input.category != null) data.category = String(input.category);
  if (input.status != null) data.status = status;
  if (input.sortOrder != null) data.sortOrder = Number(input.sortOrder) || 0;
  if (input.featured != null) data.featured = !!input.featured;
  if (input.adminOnly != null) data.adminOnly = !!input.adminOnly;
  if (input.posterUrl !== undefined) data.posterUrl = input.posterUrl ? sanitizeGuideText(input.posterUrl, 500) : null;
  if (input.thumbnailUrl !== undefined)
    data.thumbnailUrl = input.thumbnailUrl ? sanitizeGuideText(input.thumbnailUrl, 500) : null;
  if (input.videoUrl !== undefined) data.videoUrl = input.videoUrl ? sanitizeGuideText(input.videoUrl, 500) : null;
  if (input.mp4Url !== undefined) data.mp4Url = input.mp4Url ? sanitizeGuideText(input.mp4Url, 500) : null;
  if (input.webmUrl !== undefined) data.webmUrl = input.webmUrl ? sanitizeGuideText(input.webmUrl, 500) : null;
  if (input.mobileVideoUrl !== undefined)
    data.mobileVideoUrl = input.mobileVideoUrl ? sanitizeGuideText(input.mobileVideoUrl, 500) : null;
  if (input.desktopVideoUrl !== undefined)
    data.desktopVideoUrl = input.desktopVideoUrl ? sanitizeGuideText(input.desktopVideoUrl, 500) : null;
  if (input.durationSec !== undefined)
    data.durationSec = input.durationSec != null ? Number(input.durationSec) || null : null;
  if (input.captionsEnUrl !== undefined)
    data.captionsEnUrl = input.captionsEnUrl ? sanitizeGuideText(input.captionsEnUrl, 500) : null;
  if (input.captionsFrUrl !== undefined)
    data.captionsFrUrl = input.captionsFrUrl ? sanitizeGuideText(input.captionsFrUrl, 500) : null;
  if (input.storyboardKey !== undefined)
    data.storyboardKey = input.storyboardKey ? sanitizeGuideSlug(input.storyboardKey) : null;
  if (input.transcript != null) data.transcript = sanitizeGuideText(input.transcript, 12000);
  if (input.narrationScript != null) data.narrationScript = sanitizeGuideText(input.narrationScript, 12000);
  if (input.a11yDescription != null) data.a11yDescription = sanitizeGuideText(input.a11yDescription, 500);
  if (input.featureKey !== undefined)
    data.featureKey = input.featureKey ? sanitizeGuideText(input.featureKey, 80) : null;
  if (input.reviewStatus != null) data.reviewStatus = String(input.reviewStatus) as HelpGuideReviewStatus;
  if (input.videoProductionRequired != null) data.videoProductionRequired = !!input.videoProductionRequired;
  if (input.synonyms != null)
    data.synonyms = toJsonStringArray(Array.isArray(input.synonyms) ? (input.synonyms as string[]) : parseJsonStringArray(input.synonyms));
  if (input.contextRoutes != null)
    data.contextRoutes = toJsonStringArray(
      Array.isArray(input.contextRoutes) ? (input.contextRoutes as string[]) : parseJsonStringArray(input.contextRoutes)
    );
  if (input.relatedSlugs != null)
    data.relatedSlugs = toJsonStringArray(
      Array.isArray(input.relatedSlugs) ? (input.relatedSlugs as string[]) : parseJsonStringArray(input.relatedSlugs)
    );
  if (input.analyticsEvents != null)
    data.analyticsEvents = toJsonStringArray(
      Array.isArray(input.analyticsEvents)
        ? (input.analyticsEvents as string[])
        : parseJsonStringArray(input.analyticsEvents)
    );
  if (input.ogTitle != null) data.ogTitle = sanitizeGuideText(input.ogTitle, 200);
  if (input.ogDescription != null) data.ogDescription = sanitizeGuideText(input.ogDescription, 300);
  if (input.slug != null) data.slug = sanitizeGuideSlug(input.slug);

  const nextVideo =
    (data.videoUrl as string | null | undefined) ??
    (data.mp4Url as string | null | undefined) ??
    (data.webmUrl as string | null | undefined) ??
    (data.mobileVideoUrl as string | null | undefined);
  if (nextVideo) data.videoProductionRequired = false;

  if (status === "PUBLISHED" && existing.status !== "PUBLISHED") {
    data.publishedAt = new Date();
  }

  await prisma.helpGuide.update({ where: { id }, data });

  if (Array.isArray(input.steps)) {
    await prisma.guideStep.deleteMany({ where: { guideId: id } });
    for (let i = 0; i < (input.steps as unknown[]).length; i++) {
      const step = (input.steps as Record<string, unknown>[])[i];
      await prisma.guideStep.create({
        data: {
          guideId: id,
          sortOrder: Number(step.sortOrder ?? i) || i,
          title: sanitizeGuideText(step.title, 200),
          body: sanitizeGuideText(step.body, 2000),
          stepType: sanitizeGuideText(step.stepType ?? "motion", 40) || "motion",
          motionKey: step.motionKey ? sanitizeGuideText(step.motionKey, 80) : null,
          mediaUrl: step.mediaUrl ? sanitizeGuideText(step.mediaUrl, 500) : null,
          durationMs: step.durationMs != null ? Number(step.durationMs) || null : null,
        },
      });
    }
  }

  return getAdminGuide(id);
}

export async function duplicateAdminGuide(id: string) {
  const source = await getAdminGuide(id);
  if (!source) return null;
  const baseSlug = sanitizeGuideSlug(`${source.slug}-copy`);
  let slug = baseSlug;
  let n = 2;
  while (await prisma.helpGuide.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${n++}`;
  }
  const created = await prisma.helpGuide.create({
    data: {
      slug,
      title: sanitizeGuideText(`${source.title} (Copy)`, 200),
      summary: source.summary,
      body: source.body,
      role: source.role,
      category: source.category,
      status: "DRAFT",
      sortOrder: source.sortOrder + 1,
      featured: false,
      adminOnly: source.adminOnly,
      posterUrl: source.posterUrl,
      videoUrl: source.videoUrl,
      captionsEnUrl: source.captionsEnUrl,
      captionsFrUrl: source.captionsFrUrl,
      storyboardKey: source.storyboardKey,
      transcript: source.transcript,
      synonyms: source.synonyms,
      contextRoutes: source.contextRoutes,
      relatedSlugs: source.relatedSlugs,
      ogTitle: source.ogTitle,
      ogDescription: source.ogDescription,
      publishedAt: null,
    },
  });
  for (const step of source.steps) {
    await prisma.guideStep.create({
      data: {
        guideId: created.id,
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
  return getAdminGuide(created.id);
}

export async function deleteAdminGuide(id: string) {
  await prisma.guideStep.deleteMany({ where: { guideId: id } });
  await prisma.helpGuide.delete({ where: { id } });
}
