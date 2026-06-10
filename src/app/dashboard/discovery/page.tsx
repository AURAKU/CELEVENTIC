"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Compass } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Event {
  id: string;
  title: string;
  eventType: string;
  city: string | null;
  startDate: string;
  isFeatured: boolean;
  coverImageUrl: string | null;
}

export default function DiscoveryPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [city, setCity] = useState("Accra");

  useEffect(() => {
    fetch(`/api/discovery?city=${city}&country=GH`).then((r) => r.json()).then((d) => {
      if (d.success) setEvents(d.data);
    });
  }, [city]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Event Discovery</h1>
        <p className="page-subtitle">Location-based event recommendations across Ghana.</p>
      </div>

      <div className="flex gap-2">
        {["Accra", "Kumasi", "Takoradi", "Tamale"].map((c) => (
          <button
            key={c}
            onClick={() => setCity(c)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${city === c ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-brand-50"}`}
          >
            {c}
          </button>
        ))}
      </div>

      {events.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-500 flex flex-col items-center gap-2"><Compass className="h-8 w-8 text-brand-300" />No public events in {city} yet. Publish events with discovery enabled.</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((e) => (
            <Card key={e.id} className="hover:shadow-md transition-shadow">
              <div className="h-32 bg-gradient-to-br from-teal-100 to-gold-100 rounded-t-xl" />
              <CardContent className="p-4">
                <div className="flex gap-2 mb-2">
                  <Badge variant="outline">{e.eventType.replace(/_/g, " ")}</Badge>
                  {e.isFeatured && <Badge variant="secondary">Featured</Badge>}
                </div>
                <p className="font-semibold">{e.title}</p>
                <p className="text-sm page-subtitle">{formatDate(e.startDate)} · {e.city}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
