import Link from "next/link";
import { Sparkles } from "lucide-react";
import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getBrowseCatalogTemplates } from "@/lib/invitation-mvp/catalogue";
import { PublicTemplatesCatalog } from "@/components/invitation/public-templates-catalog";
import {
  PublicDesignStudioCollection,
  type PublicDesignStudioItem,
} from "@/components/invitation/public-design-studio-collection";
import { PublicDigitalCardsShowcase } from "@/components/digital-business-card/public-digital-cards-showcase";
import { prisma } from "@/lib/prisma";
import { PUBLIC_GRID_LIMIT } from "@/lib/pagination";
import type { TemplateBlock, TemplateCanvas } from "@/types/template-engine";

export const revalidate = 300;

function asCanvas(value: unknown): TemplateCanvas {
  const raw = (value ?? {}) as Partial<TemplateCanvas>;
  return {
    width: typeof raw.width === "number" ? raw.width : 1080,
    height: typeof raw.height === "number" ? raw.height : 1350,
    background: typeof raw.background === "string" ? raw.background : "#0B8A83",
    backgroundImage: typeof raw.backgroundImage === "string" ? raw.backgroundImage : undefined,
  };
}

function asBlocks(value: unknown): TemplateBlock[] {
  return Array.isArray(value) ? (value as TemplateBlock[]) : [];
}

export default async function PublicTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const limit = PUBLIC_GRID_LIMIT;
  const skip = (page - 1) * limit;
  const browseTemplates = getBrowseCatalogTemplates();

  const where = { approvalStatus: "APPROVED" as const, isActive: true };

  const [designRows, total] = await Promise.all([
    prisma.designTemplate.findMany({
      where,
      orderBy: [{ isFeatured: "desc" }, { popularity: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        style: true,
        description: true,
        productType: true,
        isPremium: true,
        isFeatured: true,
        thumbnailUrl: true,
        previewUrl: true,
        canvas: true,
        blocks: true,
      },
    }),
    prisma.designTemplate.count({ where }),
  ]);

  const designTemplates: PublicDesignStudioItem[] = designRows.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    category: t.category === "Engagement" ? "Wedding" : t.category,
    style: t.style,
    description: t.description,
    productType: t.productType,
    isPremium: t.isPremium,
    isFeatured: t.isFeatured,
    thumbnailUrl: t.thumbnailUrl,
    previewUrl: t.previewUrl,
    canvas: asCanvas(t.canvas),
    blocks: asBlocks(t.blocks),
  }));

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <HeaderShell />
      <main className="min-h-app-viewport bg-mesh">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Celeventic Catalogue
            </Badge>
            <h1 className="font-display text-4xl font-bold text-slate-900 tracking-tight">
              Premium Invitation Templates
            </h1>
            <p className="mt-4 text-slate-600">
              {browseTemplates.length} unique cinematic experiences, each with its own layout, motion, and soundtrack.
              Scroll live previews exactly as your guests will see them.
            </p>
          </div>

          <PublicTemplatesCatalog templates={browseTemplates} />

          <PublicDigitalCardsShowcase />

          <PublicDesignStudioCollection
            templates={designTemplates}
            page={page}
            pages={pages}
            total={total}
            limit={limit}
          />

          <div className="mt-14 text-center">
            <Button size="lg" asChild>
              <Link href="/auth/register">Start Designing, Free</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
