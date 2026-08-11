import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GuideHomeClient } from "@/components/celeventic-guide/guide-home-client";
import { JourneyPreviewStrip } from "@/components/celeventic-guide/journey-preview-strip";
import { StartHereJourneys } from "@/components/celeventic-guide/start-here-journeys";
import { GuideFaqAccordion } from "@/components/celeventic-guide/guide-faq-accordion";
import { listPublicGuides, seedCeleventicGuides } from "@/services/celeventic-guide/guide.service";
import { roleFromUserRole } from "@/lib/celeventic-guide/visibility";
import type { GuideCategory, GuideRole } from "@/lib/celeventic-guide/types";

/**
 * Shared Celeventic Guide / FAQ hub UI.
 * Used by `/guide` and `/legal/faq` so both routes host the full browsing experience.
 */
export async function CeleventicGuideHome({
  showClassicFaq = true,
}: {
  showClassicFaq?: boolean;
}) {
  const existing = await listPublicGuides();
  if (existing.length === 0) {
    await seedCeleventicGuides();
  }

  const session = await getServerSession(authOptions);
  const preferredRole = roleFromUserRole(session?.user?.role as string | undefined);
  const guides = await listPublicGuides({ viewerRole: session?.user?.role as string | undefined });

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(11,138,131,0.12),transparent_55%),linear-gradient(180deg,#faf8f4_0%,#f3f7f6_40%,#ffffff_100%)]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10">
        <header className="max-w-3xl space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">
            Help & Guides · Learn Celeventic
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-slate-900 tracking-tight">
            CELEVENTIC GUIDE
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Motion tutorials, Start Here journeys, quick actions, and answers for guests, organizers,
            vendors, and scanners — all in one place.
          </p>
          <Link
            href="/guide/how-celeventic-works"
            className="inline-flex text-sm font-semibold text-brand-800 hover:underline"
          >
            See How Celeventic Works →
          </Link>
        </header>

        <JourneyPreviewStrip />

        <StartHereJourneys preferredRole={preferredRole} />

        <GuideHomeClient
          initialGuides={guides.map((g) => ({
            ...g,
            role: g.role as GuideRole,
            category: g.category as GuideCategory,
          }))}
          preferredRole={preferredRole}
        />

        {showClassicFaq && <GuideFaqAccordion />}

        <p className="text-center text-sm text-slate-500 pb-4">
          Still need help?{" "}
          <a href="mailto:support@celeventic.com" className="text-brand-700 hover:underline">
            support@celeventic.com
          </a>{" "}
          or{" "}
          <Link href="/legal/contact" className="text-brand-700 hover:underline">
            contact us
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
