"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Compass } from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination";
import { PublicEventCard, PublicEventCardSkeleton } from "@/components/discover/public-event-card";
import { usePagination } from "@/hooks/use-pagination";
import { PUBLIC_GRID_LIMIT } from "@/lib/pagination";
import { EVENT_TYPES } from "@/lib/constants";
import type { PublicDiscoverEvent } from "@/lib/discovery/public-event";

export function DiscoverEventsClient() {
  const { page, setPage, resetPage, appendToParams } = usePagination(PUBLIC_GRID_LIMIT);
  const [events, setEvents] = useState<PublicDiscoverEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [eventType, setEventType] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = appendToParams(new URLSearchParams({ country: "GH" }));
    if (eventType) params.set("type", eventType);
    const res = await fetch(`/api/discovery?${params}`);
    const d = await res.json();
    if (d.success) {
      setEvents(d.data.events ?? d.data.items ?? []);
      setTotal(d.data.total ?? 0);
      setPages(d.data.pages ?? 1);
    }
    setLoading(false);
  }, [appendToParams, eventType]);

  useEffect(() => {
    load();
  }, [load]);

  function chooseType(next: string) {
    setEventType(next);
    resetPage();
  }

  return (
    <section id="public-events">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Open to the public</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Events you can join
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-600 lg:text-lg">
            Browse celebrations an admin has listed for the public. Open the guest page, or get tickets when the host is selling them.
          </p>
        </div>
        {total > 0 ? (
          <p className="text-base font-semibold text-slate-500">
            {total} {total === 1 ? "event" : "events"}
          </p>
        ) : null}
      </div>

      <div className="mb-8 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => chooseType("")}
          className={`shrink-0 rounded-full px-4 py-2 text-base font-semibold transition ${
            eventType === ""
              ? "bg-[#0B8A83] text-white"
              : "border border-slate-200 bg-white text-slate-700 hover:border-brand-400"
          }`}
        >
          All events
        </button>
        {EVENT_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => chooseType(type.value)}
            className={`shrink-0 rounded-full px-4 py-2 text-base font-semibold transition ${
              eventType === type.value
                ? "bg-[#0B8A83] text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:border-brand-400"
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <PublicEventCardSkeleton />
          <PublicEventCardSkeleton />
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-16 text-center">
          <Compass className="mx-auto h-10 w-10 text-brand-500" aria-hidden />
          <p className="mt-4 text-lg font-semibold text-slate-900">No listed events in this view yet</p>
          <p className="mt-2 text-base text-slate-600">
            An admin lists an event on Discover when it should be found by the public.
          </p>
          <Link
            href="/auth/register?intent=host"
            className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-[#0B8A83] px-5 text-base font-semibold text-white hover:bg-[#097068]"
          >
            Create an event
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2">
            {events.map((event, index) => (
              <PublicEventCard key={event.id} event={event} priority={index < 2} />
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
    </section>
  );
}
