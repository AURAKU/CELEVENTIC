import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { EventCategories } from "@/components/landing/event-categories";
import { InvitationExperience } from "@/components/landing/invitation-experience";
import { Pricing } from "@/components/landing/pricing";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";

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
        <Suspense fallback={<PageLoader label="Loading pricing..." className="py-28" />}>
          <Pricing />
        </Suspense>
        <section className="py-28 bg-gradient-cta text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 grid-pattern opacity-10" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="relative mx-auto max-w-3xl px-4">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Ready to Celebrate Smarter?
            </h2>
            <p className="mt-5 text-lg text-white/80 leading-relaxed">
              Join thousands of organizers who trust Celeventic for their most important events.
            </p>
            <Button size="lg" variant="secondary" className="mt-10" asChild>
              <Link href="/auth/register">
                Create Your First Event <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
