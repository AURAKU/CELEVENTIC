import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { LiveTemplatePreview } from "@/components/invitation/live-template-preview";
import { isExperience3NativeLayout } from "@/lib/invitation/studio3/native-layouts";
import { EXPERIENCE3_REFERENCE_DEFINITIONS } from "@/lib/invitation/studio3/reference-definitions";
import { APP_NAME } from "@/lib/constants";

const CATEGORY_BY_LAYOUT: Record<string, string> = {
  "ix3-editorial-wedding": "Wedding",
  "ix3-brand-launch": "Corporate",
  "ix3-memorial": "Funeral",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ layout: string }>;
}): Promise<Metadata> {
  const { layout } = await params;
  const def = EXPERIENCE3_REFERENCE_DEFINITIONS.find((item) => item.layout === layout);
  return {
    title: def ? `${def.label} · ${APP_NAME}` : `Experience 3.0 · ${APP_NAME}`,
    robots: { index: false, follow: false },
  };
}

export default async function Experience3LayoutPreviewPage({
  params,
}: {
  params: Promise<{ layout: string }>;
}) {
  const { layout } = await params;
  if (!isExperience3NativeLayout(layout)) notFound();
  const def = EXPERIENCE3_REFERENCE_DEFINITIONS.find((item) => item.layout === layout);
  if (!def) notFound();

  return (
    <>
      <HeaderShell />
      <main className="min-h-app-viewport bg-[#FAF8F4] py-10">
        <div className="mx-auto max-w-5xl px-4">
          <Link
            href="/invitations/experience3"
            className="text-xs font-medium text-[#0B8A83] underline-offset-4 hover:underline"
          >
            ← All Experience 3.0 references
          </Link>
          <h1 className="mt-4 font-display text-3xl font-semibold text-[#0F172A]">{def.label}</h1>
          <p className="mt-2 text-sm text-slate-600">
            Demo preview only · layout <span className="font-mono text-xs">{def.layout}</span> ·
            family {def.designFamily}
          </p>
          <div className="mt-8 overflow-hidden rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <LiveTemplatePreview
              layoutSlug={def.layout}
              category={CATEGORY_BY_LAYOUT[def.layout]}
              variant="detail"
              showDeviceToggle
              tapToOpen={false}
              musicEnabled={false}
            />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
