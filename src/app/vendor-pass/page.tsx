import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vendor Pass",
  robots: { index: false, follow: false },
};

/**
 * Bare /vendor-pass has no token — show a clear recovery screen instead of a raw 404.
 */
export default function VendorPassIndexPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
        Celeventic
      </p>
      <h1 className="mt-3 text-2xl font-bold text-slate-900">Vendor pass link incomplete</h1>
      <p className="mt-3 text-slate-600">
        Open the full pass link you were sent (it ends with a unique pass ID), or ask the event
        organizer to resend it from Guest CRM → Vendors.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
      >
        Go to Celeventic
      </Link>
    </main>
  );
}
