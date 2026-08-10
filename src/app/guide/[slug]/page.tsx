import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import {
  getPublicGuideBySlug,
  getRelatedPublicGuides,
  recordGuideView,
  seedCeleventicGuides,
} from "@/services/celeventic-guide/guide.service";
import { getStoryboard } from "@/lib/celeventic-guide/storyboards";
import { canAccessAdminPanel } from "@/lib/rbac";
import { TutorialClient } from "./tutorial-client";
import { getAppUrlFromEnv } from "@/lib/app-url";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getPublicGuideBySlug(slug);
  if (!guide) {
    return { title: "Guide not found · Celeventic Guide" };
  }
  const title = guide.ogTitle || guide.title;
  const description = guide.ogDescription || guide.summary;
  const base = getAppUrlFromEnv();
  return {
    title: `${title} · Celeventic Guide`,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `${base}/guide/${guide.slug}`,
      images: guide.posterUrl ? [{ url: guide.posterUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function GuideTutorialPage({ params }: Props) {
  const { slug } = await params;
  let guide = await getPublicGuideBySlug(slug);
  if (!guide) {
    await seedCeleventicGuides();
    guide = await getPublicGuideBySlug(slug);
  }

  const session = await getServerSession(authOptions);
  const viewerIsAdmin = canAccessAdminPanel(session?.user?.role as never);
  if (!guide) {
    guide = await getPublicGuideBySlug(slug, { viewerIsAdmin });
  }
  if (!guide) notFound();

  void recordGuideView(guide.slug);
  const related = await getRelatedPublicGuides(guide, 4);
  const storyboard = getStoryboard(guide.storyboardKey);

  return (
    <>
      <HeaderShell />
      <main className="relative min-h-screen">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(11,138,131,0.1),transparent_50%),linear-gradient(180deg,#faf8f4,#fff)]" />
        <TutorialClient
          guide={{
            slug: guide.slug,
            title: guide.title,
            summary: guide.summary,
            body: guide.body,
            role: guide.role,
            category: guide.category,
            posterUrl: guide.posterUrl,
            videoUrl: guide.videoUrl,
            captionsEnUrl: guide.captionsEnUrl,
            transcript: guide.transcript,
            storyboard,
            steps: guide.steps.map((s) => ({
              id: s.id,
              sortOrder: s.sortOrder,
              title: s.title,
              body: s.body,
              stepType: s.stepType,
            })),
            related: related.map((r) => ({ slug: r.slug, title: r.title, summary: r.summary })),
          }}
        />
      </main>
      <Footer />
    </>
  );
}
