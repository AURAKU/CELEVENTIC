import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { JourneyPreviewStrip } from "@/components/celeventic-guide/journey-preview-strip";

export const metadata: Metadata = {
  title: "How Celeventic Works · Celeventic Guide",
  description:
    "Interactive walkthrough of the Celeventic platform — invitations, RSVP, QR admission, Event Guide, gifts, vendors, and Memory Vault for guests, hosts, door staff, and vendors.",
  openGraph: {
    title: "How Celeventic Works",
    description:
      "Explore the full Celeventic journey in motion — from the first invitation tap to Memory Vault.",
    type: "website",
  },
  alternates: {
    canonical: "/guide/how-celeventic-works",
  },
};

export default function HowCeleventicWorksPage() {
  return (
    <>
      <HeaderShell />
      <main className="relative min-h-app-viewport">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(11,138,131,0.12),transparent_55%),linear-gradient(180deg,#faf8f4_0%,#f3f7f6_40%,#ffffff_100%)]" />
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 space-y-8">
          <Link
            href="/guide"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-800 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to Celeventic Guide
          </Link>
          <JourneyPreviewStrip showWalkthroughLink={false} />
        </div>
      </main>
      <Footer />
    </>
  );
}
