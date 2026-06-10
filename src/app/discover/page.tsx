export const dynamic = "force-dynamic";

import Link from "next/link";
import { Compass } from "lucide-react";
import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { discoveryService } from "@/services/discovery/discovery.service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default async function PublicDiscoverPage() {
  const [featured, events] = await Promise.all([
    discoveryService.getFeatured(),
    discoveryService.discover({ country: "GH", limit: 12 }),
  ]);

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
              Find weddings, concerts, conferences, and celebrations happening across Ghana.
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

          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900 mb-6">All Public Events</h2>
            {events.length === 0 ? (
              <p className="text-slate-500 text-center py-16">
                No public events yet.{" "}
                <Link href="/auth/register" className="text-brand-600 font-semibold hover:underline">
                  Create one
                </Link>
                .
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {(events as { id: string; slug: string; title: string; eventType: string; city: string | null; startDate: Date }[]).map((e) => (
                  <Link key={e.id} href={`/events/${e.slug}`}>
                    <Card className="card-glow hover:shadow-[0_12px_40px_rgba(11,138,131,0.12)] transition-shadow h-full">
                      <CardContent className="p-5">
                        <Badge variant="outline" className="mb-3">{e.eventType.replace(/_/g, " ")}</Badge>
                        <p className="font-display font-semibold text-lg text-slate-900">{e.title}</p>
                        <p className="text-sm text-slate-500 mt-1">
                          {formatDate(e.startDate)}{e.city ? ` · ${e.city}` : ""}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
