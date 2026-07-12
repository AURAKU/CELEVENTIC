"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Star, MapPin, CheckCircle } from "lucide-react";

export default function FindOrganizersPage() {
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [organizers, setOrganizers] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const res = await fetch(`/api/organizers?${params}`);
    const d = await res.json();
    if (res.ok) setOrganizers(d.data.items ?? []);
    setLoading(false);
  }

  useEffect(() => {
    search();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Find an Organizer</h1>
        <p className="text-slate-500">Search professional event organizers and invite them to your event</p>
      </div>

      <div className="flex gap-2 max-w-xl">
        <Input
          placeholder="Name, company, location, specialty..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <Button onClick={search} disabled={loading}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {organizers.map((o) => {
          const org = o as {
            slug: string;
            bio?: string;
            city?: string;
            isVerified: boolean;
            rating: number | string;
            completedEventsCount: number;
            user: { name: string; companyName?: string; username?: string };
          };
          return (
            <Card key={org.slug} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{org.user.name}</h3>
                    {org.user.companyName && (
                      <p className="text-sm text-slate-500">{org.user.companyName}</p>
                    )}
                  </div>
                  {org.isVerified && <CheckCircle className="h-5 w-5 text-brand-600" />}
                </div>
                {org.city && (
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {org.city}
                  </p>
                )}
                {org.bio && <p className="text-sm text-slate-600 line-clamp-2">{org.bio}</p>}
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-gold-500" />
                    {Number(org.rating).toFixed(1)}
                  </span>
                  <Badge variant="outline">{org.completedEventsCount} events</Badge>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" asChild>
                    <Link href={`/organizers/${org.slug}`}>View profile</Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/dashboard/messages?to=${org.user.username ?? org.slug}`}>Message</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
