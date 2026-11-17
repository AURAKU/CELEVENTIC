import type { Metadata } from "next";
import Link from "next/link";
import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { LiveTemplatePreview } from "@/components/invitation/live-template-preview";
import { EXPERIENCE3_REFERENCE_DEFINITIONS } from "@/lib/invitation/studio3/reference-definitions";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Invitation Experience 3.0 · ${APP_NAME}`,
  description:
    "Safe demo gallery for Experience 3.0 native reference layouts. Demo guest data only. No production deploy.",
  robots: { index: false, follow: false },
};

const CATEGORY_BY_LAYOUT: Record<string, string> = {
  "ix3-editorial-wedding": "Wedding",
  "ix3-brand-launch": "Corporate",
  "ix3-memorial": "Funeral",
};

/**
 * Internal / staging preview gallery for Experience 3.0 native references.
 * Does not list in the public marketplace catalogue and does not change pricing.
 */
export default function Experience3PreviewGalleryPage() {
  return (
    <>
      <HeaderShell />
      <main className="min-h-app-viewport bg-[#FAF8F4] py-12">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
            Celeventic · Invitation Experience 3.0
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-[#0F172A] sm:text-4xl">
            Reference experiences
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
            Brand-new layout slugs for creative QA. Protected live invitations are not modified.
            Previews use demo guest data only.
          </p>

          <div className="mt-10 grid gap-8 lg:grid-cols-3">
            {EXPERIENCE3_REFERENCE_DEFINITIONS.map((def) => (
              <section
                key={def.layout}
                className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
              >
                <div className="border-b border-stone-100 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    {def.designFamily}
                  </p>
                  <h2 className="mt-1 text-base font-medium text-slate-900">{def.label}</h2>
                  <Link
                    href={`/invitations/experience3/${def.layout}`}
                    className="mt-2 inline-block text-xs font-medium text-[#0B8A83] underline-offset-4 hover:underline"
                  >
                    Open full preview
                  </Link>
                </div>
                <div className="p-3">
                  <LiveTemplatePreview
                    layoutSlug={def.layout}
                    category={CATEGORY_BY_LAYOUT[def.layout]}
                    variant="card"
                    showDeviceToggle
                    tapToOpen
                    musicEnabled={false}
                  />
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
