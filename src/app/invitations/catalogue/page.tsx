import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { CatalogueClient } from "./catalogue-client";

export default function CataloguePage() {
  return (
    <>
      <HeaderShell />
      <main className="min-h-screen bg-[#FAF8F4] py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-10">
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0F172A]">Invitation Catalogue</h1>
            <p className="mt-3 text-slate-600 max-w-xl mx-auto">
              Filter by event type and style. Every template is Celeventic-original — premium, mobile-first, and RSVP-ready.
            </p>
          </div>
          <CatalogueClient />
        </div>
      </main>
      <Footer />
    </>
  );
}
