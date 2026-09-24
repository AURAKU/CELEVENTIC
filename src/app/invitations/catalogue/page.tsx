import { Suspense } from "react";
import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { CatalogueClient } from "./catalogue-client";
import { getSession, isAdminRole } from "@/lib/auth";
import {
  loadCatalogVisibilityOverlay,
  getVisibleBrowseCatalogTemplates,
} from "@/lib/invitation-mvp/catalog-visibility";
import { isCatalogTemplatePubliclyListed } from "@/lib/invitation-mvp/catalogue";

export default async function CataloguePage() {
  const session = await getSession();
  const isAdmin = isAdminRole(session?.user?.role);
  const overlay = await loadCatalogVisibilityOverlay();
  const templates = getVisibleBrowseCatalogTemplates(overlay, { includeHidden: isAdmin });
  const hiddenSlugs = templates
    .filter((template) => !isCatalogTemplatePubliclyListed(template, overlay))
    .map((template) => template.slug);

  return (
    <>
      <HeaderShell />
      <main className="min-h-app-viewport bg-[#FAF8F4] py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-10">
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0F172A]">Invitation Catalogue</h1>
            <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
              Handcrafted online wedding & event invitations, each a complete experience with RSVP, calendar, maps,
              countdown, music, gallery, and guest wishes. Switch templates anytime while editing.
            </p>
          </div>
          <Suspense>
            <CatalogueClient templates={templates} isAdmin={isAdmin} hiddenSlugs={hiddenSlugs} />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
