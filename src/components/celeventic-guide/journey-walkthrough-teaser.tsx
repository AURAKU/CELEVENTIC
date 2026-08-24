import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Compact CTA for landing + /guide — links to the full interactive walkthrough page.
 */
export function JourneyWalkthroughTeaser({ className }: { className?: string }) {
  return (
    <section
      aria-label="See how Celeventic works"
      className={cn(
        "relative overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-900 via-brand-700 to-slate-900 text-white",
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_18%_0%,rgba(212,166,58,0.4),transparent_42%),radial-gradient(circle_at_90%_80%,rgba(255,255,255,0.08),transparent_40%)]"
        aria-hidden
      />
      <div className="relative flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="max-w-xl space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-brand-100/90">Celeventic Guide</p>
          <h2 className="font-display text-2xl font-semibold leading-tight sm:text-3xl">
            See How Celeventic Works
          </h2>
          <p className="text-sm text-white/75 leading-relaxed">
            Invitations, RSVP, QR admission, Event Guide, gifts, vendors, and Memory Vault — explore
            the full journey in an interactive walkthrough.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href="/guide/how-celeventic-works"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-brand-900 transition hover:bg-brand-50"
          >
            Full walkthrough
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/guide"
            className="inline-flex items-center rounded-xl border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Browse all guides
          </Link>
        </div>
      </div>
    </section>
  );
}
