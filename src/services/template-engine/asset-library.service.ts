import { prisma } from "@/lib/prisma";
import type { AssetLibraryType } from "@prisma/client";

export interface ListAssetsFilter {
  type?: AssetLibraryType;
  category?: string;
  search?: string;
}

export class AssetLibraryService {
  async list(filters: ListAssetsFilter = {}) {
    return prisma.templateAsset.findMany({
      where: {
        isActive: true,
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.search ? { name: { contains: filters.search } } : {}),
      },
      orderBy: [{ isPremium: "asc" }, { name: "asc" }],
    });
  }

  async listPatterns(category?: string) {
    return prisma.patternAsset.findMany({
      where: category ? { category } : {},
      orderBy: { name: "asc" },
    });
  }

  async listFonts() {
    return prisma.fontAsset.findMany({
      orderBy: { name: "asc" },
    });
  }

  async listPalettes(category?: string) {
    return prisma.colorPalette.findMany({
      where: category ? { category } : {},
      orderBy: { name: "asc" },
    });
  }

  async getById(id: string) {
    return prisma.templateAsset.findUnique({ where: { id } });
  }
}

export const assetLibraryService = new AssetLibraryService();
