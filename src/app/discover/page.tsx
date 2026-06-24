export const dynamic = "force-dynamic";

import { Compass } from "lucide-react";
import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { discoveryService } from "@/services/discovery/discovery.service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { DiscoverEventsClient } from "./discover-events-client";

export default async function PublicDiscoverPage() {
  const featured = await discoveryService.getFeatured();

  return (
    <>
      <HeaderShell />
      <main className="min-h-screen bg-mesh">
        <section className="bg-gradient-hero text-white py-20 px-4 text-center relative overflow-hidden">
          <div className="absolute inset-0 grid-pattern opacity-20" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 badge-pill bg-white/10 text-gold-400 border border-white/10 mb-6">
              <Compass className="h-4 w-4" />
              Public Events
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">Discover Events</h1>
            <p className="text-slate-300 mt-4 max-w-lg mx-auto text-lg">
              Find weddings, concerts, conferences, and celebrations happening around the world.
            </p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 py-16 space-y-16">
          {featured.length > 0 && (
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900 mb-6">Featured Events</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {featured.map((e) => (
                  <Card key={e.id} className="card-glow hover:shadow-[0_12px_40px_rgba(11,138,131,0.12)]">
                    <CardContent className="p-5">
                      <Badge variant="secondary" className="mb-3">Featured</Badge>
                      <p className="font-display font-semibold text-lg text-slate-900">{e.title}</p>
                      <p className="text-sm text-slate-500 mt-1">{formatDate(e.startDate)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <DiscoverEventsClient />
        </div>
      </main>
      <Footer />
    </>
  );
}
