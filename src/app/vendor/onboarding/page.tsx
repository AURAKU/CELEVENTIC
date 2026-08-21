import { Suspense } from "react";
import VendorOnboardingClient from "./vendor-onboarding-client";

export default function VendorOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-app-viewport flex items-center justify-center text-sm text-slate-500">
          Loading vendor setup…
        </div>
      }
    >
      <VendorOnboardingClient />
    </Suspense>
  );
}
