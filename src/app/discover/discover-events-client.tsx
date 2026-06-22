"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/components/ui/pagination";
import { formatDate } from "@/lib/utils";
import { usePagination } from "@/hooks/use-pagination";
import { PUBLIC_GRID_LIMIT } from "@/lib/pagination";

interface DiscoverEvent {
  id: string;
  slug: string;
  title: string;
  eventType: string;
  city: string | null;
  startDate: string;
}

export function DiscoverEventsClient() {
  const { page, setPage, appendToParams } = usePagination(PUBLIC_GRID_LIMIT);
  const [events, setEvents] = useState<DiscoverEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = appendToParams(new URLSearchParams({ country: "GH" }));
    const res = await fetch(`/api/discovery?${params}`);
    const d = await res.json();
    if (d.success) {
      setEvents(d.data.events ?? d.data.items ?? []);
      setTotal(d.data.total ?? 0);
      setPages(d.data.pages ?? 1);
    }
    setLoading(false);
  }, [appendToParams]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-slate-900 mb-6">All Public Events</h2>
      {loading ? (
        <p className="text-slate-500 text-center py-16">Loading events…</p>
      ) : events.length === 0 ? (
        <p className="text-slate-500 text-center py-16">
          No public events yet.{" "}
          <Link href="/auth/register" className="text-brand-600 font-semibold hover:underline">
            Create one
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((e) => (
              <Link key={e.id} href={`/events/${e.slug}`}>
                <Card className="card-glow hover:shadow-[0_12px_40px_rgba(11,138,131,0.12)] transition-shadow h-full">
                  <CardContent className="p-5">
                    <Badge variant="outline" className="mb-3">
                      {e.eventType.replace(/_/g, " ")}
                    </Badge>
                    <p className="font-display font-semibold text-lg text-slate-900">{e.title}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {formatDate(e.startDate)}
                      {e.city ? ` · ${e.city}` : ""}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <PaginationBar
            page={page}
            pages={pages}
            total={total}
            limit={PUBLIC_GRID_LIMIT}
            onPageChange={setPage}
            className="mt-8"
          />
        </>
      )}
    </div>
  );
}
