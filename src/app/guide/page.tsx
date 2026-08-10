import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { GuideHomeClient } from "@/components/celeventic-guide/guide-home-client";
import { JourneyPreviewStrip } from "@/components/celeventic-guide/journey-preview-strip";
import { listPublicGuides, seedCeleventicGuides } from "@/services/celeventic-guide/guide.service";
import { roleFromUserRole } from "@/lib/celeventic-guide/visibility";
import type { GuideRole } from "@/lib/celeventic-guide/types";

export const metadata: Metadata = {
  title: "Celeventic Guide · Learn Celeventic",
  description: "Interactive tutorials for guests, organizers, vendors, and scanners — See How Celeventic Works.",
  openGraph: {
    title: "Celeventic Guide",
    description: "Learn Celeventic with motion walkthroughs and step-by-step guides.",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function GuideHomePage() {
  // Ensure catalog exists in local/dev DBs without requiring a separate seed run.
  const existing = await listPublicGuides();
  if (existing.length === 0) {
    await seedCeleventicGuides();
  }

  const session = await getServerSession(authOptions);
  const preferredRole = roleFromUserRole(session?.user?.role as string | undefined);
  const guides = await listPublicGuides({ viewerRole: session?.user?.role as string | undefined });

  return (
    <>
      <HeaderShell />
      <main className="relative min-h-screen">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(11,138,131,0.12),transparent_55%),linear-gradient(180deg,#faf8f4_0%,#f3f7f6_40%,#ffffff_100%)]" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10">
          <header className="max-w-3xl space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">Learn Celeventic</p>
            <h1 className="font-display text-4xl sm:text-5xl font-semibold text-slate-900 tracking-tight">
              CELEVENTIC GUIDE
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              Motion tutorials and step-by-step walkthroughs for guests, organizers, vendors, and scanners.
            </p>
            <Link href="/guide/how-celeventic-works" className="inline-flex text-sm font-semibold text-brand-800 hover:underline">
              See How Celeventic Works →
            </Link>
          </header>

          <JourneyPreviewStrip />

          <GuideHomeClient
            initialGuides={guides.map((g) => ({
              ...g,
              role: g.role as GuideRole,
              category: g.category as GuideCardCategory,
            }))}
            preferredRole={preferredRole}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}

type GuideCardCategory = import("@/lib/celeventic-guide/types").GuideCategory;
