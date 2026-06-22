import { prisma } from "@/lib/prisma";
import { paginatedResult, parsePaginationFromUrl } from "@/lib/pagination";
import type { MusicSelection } from "@/lib/music/music-types";
import { validateMusicSelection } from "@/lib/music/validate-selection";

export class MusicLibraryService {
  async listActive(category?: string) {
    return prisma.invitationMusicTrack.findMany({
      where: {
        isActive: true,
        ...(category && category !== "all" ? { category } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        artist: true,
        category: true,
        url: true,
        durationSec: true,
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
        include: { createdBy: { select: { id: true, name: true } } },
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
    durationSec?: number;
    createdById?: string;
  }) {
    const maxSort = await prisma.invitationMusicTrack.aggregate({ _max: { sortOrder: true } });
    return prisma.invitationMusicTrack.create({
      data: {
        title: data.title,
        artist: data.artist,
        category: data.category,
        url: data.url,
        durationSec: data.durationSec,
        createdById: data.createdById,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
    });
  }

  async updateTrack(
    id: string,
    data: Partial<{
      title: string;
      artist: string | null;
      category: string;
      isActive: boolean;
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
