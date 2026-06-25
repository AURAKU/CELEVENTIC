import { Suspense } from "react";
import { FuneralPortalClient } from "./funeral-portal-client";

export default function FuneralOSPage() {
  return (
    <Suspense fallback={<p className="text-slate-500 py-12 text-center">Loading FuneralOS…</p>}>
      <FuneralPortalClient />
    </Suspense>
  );
}
