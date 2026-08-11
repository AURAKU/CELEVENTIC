import { Suspense } from "react";
import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import dynamic from "next/dynamic";
const HowItWorks = dynamic(() => import("@/components/landing/how-it-works").then((m) => m.HowItWorks), { ssr: true });
import { EventCategories } from "@/components/landing/event-categories";
import { InvitationExperience } from "@/components/landing/invitation-experience";
import { Pricing } from "@/components/landing/pricing";
import { HomeCta } from "@/components/landing/home-cta";
import { PageLoaderClient } from "@/components/ui/page-loader-client";

export const revalidate = 300;

export default function HomePage() {
  return (
    <>
      <HeaderShell />
      <main>
        <Hero />
        <Features />
        <InvitationExperience />
        <HowItWorks />
        <EventCategories />
        <Suspense fallback={<PageLoaderClient labelKey="landing.loading_pricing" className="py-28" />}>
          <Pricing />
        </Suspense>
        <HomeCta />
      </main>
      <Footer />
    </>
  );
}
