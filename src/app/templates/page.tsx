import Link from "next/link";
import { Sparkles } from "lucide-react";
import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { INVITATION_TEMPLATE_PRESETS } from "@/lib/invitation-templates";
import { prisma } from "@/lib/prisma";

export const revalidate = 300;

export default async function PublicTemplatesPage() {
  const designTemplates = await prisma.designTemplate.findMany({
    where: { approvalStatus: "APPROVED", isActive: true },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: 12,
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
  });

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
              Curated for weddings, funerals, corporate events, and celebrations across Ghana and beyond.
            </p>
          </div>

          <h2 className="text-lg font-semibold text-slate-900 mb-4">Classic Invitation Layouts</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-14">
            {INVITATION_TEMPLATE_PRESETS.map((template) => (
              <div
                key={template.slug}
                className="rounded-2xl border border-slate-200/70 overflow-hidden bg-white"
              >
                <div className={`h-40 bg-gradient-to-br ${template.preview.gradient}`} />
                <div className="p-5">
                  <p className="text-xs uppercase tracking-wider text-brand-600">{template.category}</p>
                  <p className="font-semibold text-slate-900 mt-1">{template.name}</p>
                  <p className="text-sm text-slate-500 mt-2">{template.description}</p>
                </div>
              </div>
            ))}
          </div>

          {designTemplates.length > 0 && (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Design Studio Collection</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {designTemplates.map((t) => (
                  <div key={t.id} className="rounded-2xl border border-slate-200/70 overflow-hidden bg-white">
                    <div className="h-36 bg-gradient-to-br from-brand-50 to-gold-50 flex items-center justify-center text-sm text-slate-500">
                      {t.thumbnailUrl ? "Preview" : t.style}
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
            </>
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
