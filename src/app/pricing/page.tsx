import { Suspense } from "react";
import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { Pricing } from "@/components/landing/pricing";
import { PageLoaderClient } from "@/components/ui/page-loader-client";

export const metadata = {
  title: "Pricing",
  description: "Celeventic invitation and event packages — transparent pricing in GHS, USD, and GBP.",
};

export default function PricingPage() {
  return (
    <>
      <HeaderShell />
      <main className="pt-8 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center mb-4">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">Pricing</h1>
          <p className="text-slate-600 mt-2 max-w-2xl mx-auto">
            Choose the package that fits your celebration — from digital invites to full EventOS.
          </p>
        </div>
        <Suspense fallback={<PageLoaderClient labelKey="landing.loading_pricing" className="py-28" />}>
          <Pricing />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
