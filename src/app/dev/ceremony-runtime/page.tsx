import { Suspense } from "react";
import { notFound } from "next/navigation";
import CeremonyRuntimeHarnessPage from "./ceremony-runtime-client";

export const dynamic = "force-dynamic";

/**
 * Dev / Playwright ceremony harness.
 * Disabled in production unless CELEVENTIC_CEREMONY_HARNESS=1.
 */
export default function CeremonyRuntimePage() {
  const allowed =
    process.env.NODE_ENV !== "production" ||
    process.env.CELEVENTIC_CEREMONY_HARNESS === "1";
  if (!allowed) notFound();

  return (
    <Suspense fallback={<div className="min-h-app-viewport bg-black" />}>
      <CeremonyRuntimeHarnessPage />
    </Suspense>
  );
}
