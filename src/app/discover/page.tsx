export const dynamic = "force-dynamic";

import { Compass } from "lucide-react";
import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { discoveryService } from "@/services/discovery/discovery.service";
import { DiscoverEventsClient } from "./discover-events-client";
import { PublicEventCard } from "@/components/discover/public-event-card";

export default async function PublicDiscoverPage() {
  const featured = await discoveryService.getFeatured();

  return (
    <>
      <HeaderShell />
      <main className="min-h-app-viewport bg-mesh">
        <section className="relative overflow-hidden bg-gradient-hero px-4 py-16 text-center text-white sm:py-20">
          <div className="absolute inset-0 grid-pattern opacity-20" />
          <div className="relative mx-auto max-w-3xl">
            <div className="badge-pill mb-6 inline-flex items-center gap-2 border border-white/10 bg-white/10 text-gold-400">
              <Compass className="h-4 w-4" />
              Public events and tickets
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Discover Events</h1>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-white/85">
              Find weddings, concerts, conferences, and celebrations. Open the guest page or get tickets from one place.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-14 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          {featured.length > 0 ? (
            <section>
              <div className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Featured</p>
                <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900">Picked for this week</h2>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                {featured.map((event, index) => (
                  <PublicEventCard key={event.id} event={event} priority={index === 0} />
                ))}
              </div>
            </section>
          ) : null}

          <DiscoverEventsClient />
        </div>
      </main>
      <Footer />
    </>
  );
}
