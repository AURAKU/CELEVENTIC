import Link from "next/link";
import { Sparkles } from "lucide-react";
import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaginationLinks } from "@/components/ui/pagination";
import { INVITATION_TEMPLATE_PRESETS } from "@/lib/invitation-templates";
import { CATALOG_TEMPLATES } from "@/lib/invitation-mvp/catalogue";
import { LivePresetTemplateGrid } from "@/components/invitation/live-template-catalog-grid";
import { LiveCatalogTemplateGrid } from "@/components/invitation/live-template-catalog-grid";
import { prisma } from "@/lib/prisma";
import { PUBLIC_GRID_LIMIT } from "@/lib/pagination";

export const revalidate = 300;

export default async function PublicTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const limit = PUBLIC_GRID_LIMIT;
  const skip = (page - 1) * limit;

  const where = { approvalStatus: "APPROVED" as const, isActive: true };

  const [designTemplates, total] = await Promise.all([
    prisma.designTemplate.findMany({
      where,
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        style: true,
        isPremium: true,
        isFeatured: true,
        thumbnailUrl: true,
      },
    }),
    prisma.designTemplate.count({ where }),
  ]);

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <HeaderShell />
      <main className="min-h-screen bg-mesh">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Celeventic Catalogue
            </Badge>
            <h1 className="font-display text-4xl font-bold text-slate-900 tracking-tight">
              Premium Invitation Templates
            </h1>
            <p className="mt-4 text-slate-600">
              Every preview is a live invitation — scroll and explore exactly how your guests will experience it.
            </p>
          </div>

          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Classic Invitation Layouts ({INVITATION_TEMPLATE_PRESETS.length})
          </h2>
          <p className="text-sm text-slate-500 mb-6">Core Celeventic layouts with auto-scrolling live previews.</p>
          <LivePresetTemplateGrid
            presets={INVITATION_TEMPLATE_PRESETS}
            linkHref="/dashboard/invitations"
          />

          <h2 className="text-lg font-semibold text-slate-900 mt-16 mb-2">
            Full Template Catalogue ({CATALOG_TEMPLATES.length})
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Wedding, funeral, corporate, and celebration templates — all with live guest-flow previews.
          </p>
          <LiveCatalogTemplateGrid templates={CATALOG_TEMPLATES} />

          {total > 0 && (
            <div className="mt-16">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Design Studio Collection</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {designTemplates.map((t) => (
                  <div key={t.id} className="rounded-2xl border border-slate-200/70 overflow-hidden bg-white">
                    <div className="h-36 bg-gradient-to-br from-brand-50 to-gold-50 flex items-center justify-center text-sm text-slate-500">
                      {t.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.thumbnailUrl} alt={t.name} className="w-full h-full object-cover" />
                      ) : (
                        t.style
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-slate-900">{t.name}</p>
                        {t.isFeatured && <Badge variant="secondary">Featured</Badge>}
                        {t.isPremium && <Badge>Premium</Badge>}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{t.category}</p>
                    </div>
                  </div>
                ))}
              </div>
              <PaginationLinks
                page={page}
                pages={pages}
                total={total}
                limit={limit}
                basePath="/templates"
              />
            </div>
          )}

          <div className="mt-14 text-center">
            <Button size="lg" asChild>
              <Link href="/auth/register">Start Designing — Free</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
