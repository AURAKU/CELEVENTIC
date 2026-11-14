export const dynamic = "force-dynamic";

import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { discoveryService } from "@/services/discovery/discovery.service";
import { DiscoverEventsClient } from "./discover-events-client";
import { DiscoverFeaturedHeading, DiscoverHero } from "./discover-hero";
import { PublicEventCard } from "@/components/discover/public-event-card";

export default async function PublicDiscoverPage() {
  const featured = await discoveryService.getFeatured();

  return (
    <>
      <HeaderShell />
      <main className="min-h-app-viewport bg-mesh">
        <DiscoverHero />

        <div className="mx-auto max-w-7xl space-y-14 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          {featured.length > 0 ? (
            <section>
              <DiscoverFeaturedHeading />
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
