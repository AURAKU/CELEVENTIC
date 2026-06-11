import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import { getCmsPage, isCmsPageSlug, CMS_PAGES } from "@/lib/cms-pages";

export function generateStaticParams() {
  return Object.keys(CMS_PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isCmsPageSlug(slug)) return { title: "Page Not Found" };
  const page = await getCmsPage(slug);
  return { title: page.title, description: page.description };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isCmsPageSlug(slug)) notFound();

  const page = await getCmsPage(slug, "en");
  const legalMeta = page as { version?: string; effectiveDate?: string };

  return (
    <LegalPageLayout
      slug={slug}
      initialTitle={page.title}
      initialDescription={page.description}
      initialContent={page.content}
      initialVersion={legalMeta.version}
      initialEffectiveDate={legalMeta.effectiveDate}
    />
  );
}
