import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { CeleventicGuideHome } from "@/components/celeventic-guide/celeventic-guide-home";
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
  if (slug === "faq") {
    return {
      title: "FAQ & Guides · Celeventic Guide",
      description:
        "Celeventic Guide tutorials, Start Here journeys, guest quick actions, search, and frequently asked questions.",
      openGraph: {
        title: "FAQ & Guides · Celeventic Guide",
        description: "Learn Celeventic — tutorials, journeys, and answers in one place.",
        type: "website",
      },
      alternates: { canonical: "/legal/faq" },
    };
  }
  if (!isCmsPageSlug(slug)) return { title: "Page Not Found" };
  const page = await getCmsPage(slug);
  return { title: page.title, description: page.description };
}

export const dynamic = "force-dynamic";

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isCmsPageSlug(slug)) notFound();

  // Public FAQ hub hosts the full Celeventic Guide browsing experience.
  if (slug === "faq") {
    return (
      <>
        <HeaderShell />
        <main>
          <CeleventicGuideHome />
        </main>
        <Footer />
      </>
    );
  }

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
