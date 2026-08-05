import Link from "next/link";
import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";

/**
 * Branded empty state when `/invite/{link}` does not resolve.
 * Avoids the default Next.js black 404 so guests never land on a blank screen.
 */
export default function InviteNotFound() {
  return (
    <>
      <HeaderShell />
      <main className="flex min-h-[70vh] flex-col items-center justify-center bg-[#FAF8F4] px-6 py-16 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-500">
          Invitation
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-[#0F172A] sm:text-4xl">
          This invitation link is unavailable
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600 sm:text-base">
          The link may have expired, been typed incorrectly, or belong to another
          environment. Ask your host for a fresh invitation link.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild className="bg-[#0B8A83] hover:bg-[#097068]">
            <Link href="/">Back to Celeventic</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/templates">Browse templates</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </>
  );
}
