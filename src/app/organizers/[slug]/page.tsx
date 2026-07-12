import { notFound } from "next/navigation";
import Link from "next/link";
import { organizerProfileService } from "@/services/workspace/organizer-profile.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Star, MapPin, CheckCircle, MessageSquare, Calendar } from "lucide-react";

export default async function OrganizerPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await organizerProfileService.getBySlug(slug);
  if (!profile) notFound();

  const packages = Array.isArray(profile.packages) ? profile.packages : [];
  const portfolio = Array.isArray(profile.portfolio) ? profile.portfolio : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-brand-700 to-brand-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="flex items-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">{profile.user.name}</h1>
                {profile.isVerified && <CheckCircle className="h-6 w-6 text-gold-400" />}
              </div>
              {profile.headline && <p className="text-brand-100 mt-1">{profile.headline}</p>}
              {profile.user.companyName && (
                <p className="text-brand-200 mt-1">{profile.user.companyName}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-4 text-sm">
                {profile.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> {profile.city}
                    {profile.region ? `, ${profile.region}` : ""}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-gold-400" />
                  {Number(profile.rating).toFixed(1)} ({profile.reviewCount} reviews)
                </span>
                <Badge className="bg-white/20">{profile.completedEventsCount} events completed</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {profile.bio && (
          <section>
            <h2 className="text-lg font-semibold mb-2">About</h2>
            <p className="text-slate-600">{profile.bio}</p>
          </section>
        )}

        {portfolio.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Portfolio</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {portfolio.map((item, i) => {
                const p = item as { title?: string; imageUrl?: string };
                return (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <p className="font-medium">{p.title ?? "Project"}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {packages.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Packages</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {packages.map((pkg, i) => {
                const p = pkg as { name?: string; price?: number; description?: string };
                return (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <h3 className="font-semibold">{p.name}</h3>
                      {p.price != null && <p className="text-brand-700 font-bold mt-1">From {p.price}</p>}
                      {p.description && <p className="text-sm text-slate-500 mt-2">{p.description}</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href={`/dashboard/messages?organizer=${profile.slug}`}>
              <MessageSquare className="h-4 w-4 mr-2" /> Message
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/organizers">Find more organizers</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/events/create">
              <Calendar className="h-4 w-4 mr-2" /> Invite to your event
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
