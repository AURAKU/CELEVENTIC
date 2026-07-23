import { prisma } from "@/lib/prisma";
import { paginatedResult, parsePaginationFromUrl } from "@/lib/pagination";
import type { MusicSelection } from "@/lib/music/music-types";
import { validateMusicSelection } from "@/lib/music/validate-selection";

export class MusicLibraryService {
  async listActive(category?: string, limit = 100) {
    return prisma.invitationMusicTrack.findMany({
      where: {
        isActive: true,
        ...(category && category !== "all" ? { category } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      take: Math.min(100, Math.max(1, limit)),
      select: {
        id: true,
        title: true,
        artist: true,
        category: true,
        url: true,
        durationSec: true,
        isPremium: true,
      },
    });
  }

  async listAdmin(url: string) {
    const { page, limit, skip } = parsePaginationFromUrl(url);
    const [items, total] = await Promise.all([
      prisma.invitationMusicTrack.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip,
        take: limit,
        include: {
          createdBy: { select: { id: true, name: true } },
          _count: { select: { catalogTemplates: true, events: true } },
        },
      }),
      prisma.invitationMusicTrack.count(),
    ]);
    return paginatedResult(items, total, page, limit);
  }

  async createTrack(data: {
    title: string;
    artist?: string;
    category: string;
    url: string;
    sourceUrl?: string;
    durationSec?: number;
    clipStartSec?: number;
    clipEndSec?: number;
    createdById?: string;
    isPremium?: boolean;
  }) {
    const maxSort = await prisma.invitationMusicTrack.aggregate({ _max: { sortOrder: true } });
    return prisma.invitationMusicTrack.create({
      data: {
        title: data.title,
        artist: data.artist,
        category: data.category,
        url: data.url,
        sourceUrl: data.sourceUrl,
        durationSec: data.durationSec,
        clipStartSec: data.clipStartSec,
        clipEndSec: data.clipEndSec,
        createdById: data.createdById,
        isPremium: data.isPremium ?? false,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
    });
  }

  async assignTrack(data: {
    trackId: string;
    templateIds?: string[];
    eventIds?: string[];
    clearTemplates?: boolean;
    clearEvents?: boolean;
  }) {
    const track = await prisma.invitationMusicTrack.findUnique({ where: { id: data.trackId } });
    if (!track) throw new Error("Track not found");

    if (data.clearTemplates) {
      await prisma.invitationCatalogTemplate.updateMany({
        where: { defaultMusicTrackId: data.trackId },
        data: { defaultMusicTrackId: null },
      });
    }
    if (data.clearEvents) {
      await prisma.event.updateMany({
        where: { defaultMusicTrackId: data.trackId },
        data: { defaultMusicTrackId: null },
      });
    }

    if (data.templateIds?.length) {
      await prisma.invitationCatalogTemplate.updateMany({
        where: { id: { in: data.templateIds } },
        data: { defaultMusicTrackId: data.trackId },
      });
    }
    if (data.eventIds?.length) {
      await prisma.event.updateMany({
        where: { id: { in: data.eventIds } },
        data: { defaultMusicTrackId: data.trackId },
      });
    }

    const [templates, events] = await Promise.all([
      prisma.invitationCatalogTemplate.findMany({
        where: { defaultMusicTrackId: data.trackId },
        select: { id: true, name: true, slug: true },
      }),
      prisma.event.findMany({
        where: { defaultMusicTrackId: data.trackId },
        select: { id: true, title: true, slug: true },
        take: 100,
      }),
    ]);

    return { track, templates, events };
  }

  async listAssignTargets() {
    const [templates, events] = await Promise.all([
      prisma.invitationCatalogTemplate.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, slug: true, defaultMusicTrackId: true },
        take: 200,
      }),
      prisma.event.findMany({
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, slug: true, defaultMusicTrackId: true },
        take: 100,
      }),
    ]);
    return { templates, events };
  }

  async updateTrack(
    id: string,
    data: Partial<{
      title: string;
      artist: string | null;
      category: string;
      isActive: boolean;
      isPremium: boolean;
      sortOrder: number;
      durationSec: number;
    }>
  ) {
    return prisma.invitationMusicTrack.update({ where: { id }, data });
  }

  async deleteTrack(id: string) {
    return prisma.invitationMusicTrack.delete({ where: { id } });
  }

  validateSelectionForOrder(selection: MusicSelection | null | undefined) {
    return validateMusicSelection(selection);
  }
}

export const musicLibraryService = new MusicLibraryService();
