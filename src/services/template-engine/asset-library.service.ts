import { prisma } from "@/lib/prisma";
import type { AssetLibraryType } from "@prisma/client";
import { parsePaginationInput, paginatedResult } from "@/lib/pagination";

export interface ListAssetsFilter {
  type?: AssetLibraryType;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class AssetLibraryService {
  async list(filters: ListAssetsFilter = {}) {
    const { page, limit, skip } = parsePaginationInput(
      { page: filters.page, limit: filters.limit },
      { limit: 24, maxLimit: 100 }
    );
    const where = {
      isActive: true,
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.search ? { name: { contains: filters.search } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.templateAsset.findMany({
        where,
        orderBy: [{ isPremium: "asc" }, { name: "asc" }],
        skip,
        take: limit,
      }),
      prisma.templateAsset.count({ where }),
    ]);
    return paginatedResult(items, total, page, limit);
  }

  async listPatterns(category?: string, page = 1, limit = 24) {
    const { page: p, limit: take, skip } = parsePaginationInput(
      { page, limit },
      { limit: 24, maxLimit: 100 }
    );
    const where = category ? { category } : {};
    const [items, total] = await Promise.all([
      prisma.patternAsset.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take,
      }),
      prisma.patternAsset.count({ where }),
    ]);
    return paginatedResult(items, total, p, take);
  }

  async listFonts(page = 1, limit = 24) {
    const { page: p, limit: take, skip } = parsePaginationInput(
      { page, limit },
      { limit: 24, maxLimit: 100 }
    );
    const [items, total] = await Promise.all([
      prisma.fontAsset.findMany({
        orderBy: { name: "asc" },
        skip,
        take,
      }),
      prisma.fontAsset.count(),
    ]);
    return paginatedResult(items, total, p, take);
  }

  async listPalettes(category?: string, page = 1, limit = 24) {
    const { page: p, limit: take, skip } = parsePaginationInput(
      { page, limit },
      { limit: 24, maxLimit: 100 }
    );
    const where = category ? { category } : {};
    const [items, total] = await Promise.all([
      prisma.colorPalette.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take,
      }),
      prisma.colorPalette.count({ where }),
    ]);
    return paginatedResult(items, total, p, take);
  }

  async getById(id: string) {
    return prisma.templateAsset.findUnique({ where: { id } });
  }
}

export const assetLibraryService = new AssetLibraryService();
