"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, Home, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

/**
 * Route-segment error boundary. Catches render errors thrown anywhere below the root
 * layout (pages, nested layouts, client components) so a single broken page/section
 * — e.g. a bad media asset or malformed block — degrades gracefully instead of
 * escalating to `global-error.tsx` (which nukes the entire document).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[route-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
        </div>
        <h1 className="text-lg font-semibold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          This page hit an unexpected error. The rest of {APP_NAME} is unaffected — try again, or head back home.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button type="button" onClick={() => reset()} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Try again
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/" className="gap-2">
              <Home className="h-4 w-4" /> Go home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
