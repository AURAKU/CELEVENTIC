import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import { getCmsPage, isCmsPageSlug } from "@/lib/cms-pages";

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

  return (
    <LegalPageLayout
      slug={slug}
      initialTitle={page.title}
      initialDescription={page.description}
      initialContent={page.content}
    />
  );
}
