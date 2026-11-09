"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Calendar, MapPin, Ticket } from "lucide-react";
import { EVENT_TYPES } from "@/lib/constants";
import {
  discoverDateParts,
  discoverEventCta,
  discoverEventHref,
  discoverPlaceLabel,
  discoverPriceLabel,
  type PublicDiscoverEvent,
} from "@/lib/discovery/public-event";
import { resolvePublicMediaUrl } from "@/lib/uploads/media-url";
import { EventPosterArt } from "@/components/discover/event-poster-art";

const TYPE_LABELS = Object.fromEntries(EVENT_TYPES.map((item) => [item.value, item.label]));

export function PublicEventCard({ event, priority = false }: { event: PublicDiscoverEvent; priority?: boolean }) {
  const [coverFailed, setCoverFailed] = useState(false);
  const cover = event.coverImageUrl ? resolvePublicMediaUrl(event.coverImageUrl) : "";
  const showCover = Boolean(cover) && !coverFailed;
  const date = discoverDateParts(event.startDate, event.endDate);
  const place = discoverPlaceLabel(event);
  const href = discoverEventHref(event);
  const cta = discoverEventCta(event);
  const price = discoverPriceLabel(event);
  const typeLabel = TYPE_LABELS[event.eventType] ?? event.eventType.replace(/_/g, " ");
  const live = event.status === "LIVE";

  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-brand-300/70 hover:shadow-[0_18px_40px_rgba(11,138,131,0.14)]"
    >
      <div className="event-cover-frame relative aspect-[4/3] overflow-hidden bg-slate-900">
        {showCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-top"
            onError={() => setCoverFailed(true)}
            fetchPriority={priority ? "high" : "auto"}
          />
        ) : (
          <EventPosterArt eventType={event.eventType} title={event.title} />
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-slate-950/25 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/50 to-transparent" />

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/92 px-3 py-1 text-sm font-semibold text-slate-800 backdrop-blur-sm">
            {typeLabel}
          </span>
          {event.isFeatured ? (
            <span className="rounded-full bg-gold-400 px-3 py-1 text-sm font-semibold text-slate-950">Featured</span>
          ) : null}
          {live ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-sm font-semibold text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              Live now
            </span>
          ) : null}
        </div>

        <div className="absolute bottom-3 left-3 min-w-[4.5rem] rounded-2xl bg-white/95 px-3 py-2 text-center shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">{date.month}</p>
          <p className="font-display text-2xl font-bold leading-none text-slate-900">{date.day}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-sm font-medium text-slate-500">
          {date.weekday} · {date.time}
          {date.rangeLabel ? ` · ${date.rangeLabel}` : ""}
        </p>
        <h3 className="mt-1 font-display text-xl font-semibold tracking-tight text-slate-900 group-hover:text-brand-800">
          {event.title}
        </h3>
        {event.hostName && event.hostName !== event.title ? (
          <p className="mt-1 text-base text-slate-500">Hosted by {event.hostName}</p>
        ) : null}

        <div className="mt-3 space-y-1.5 text-base text-slate-600">
          {place ? (
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
              <span>{place}</span>
            </p>
          ) : (
            <p className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
              <span>Venue to be announced</span>
            </p>
          )}
        </div>

        {event.description ? (
          <p className="mt-3 line-clamp-2 text-base leading-relaxed text-slate-600">{event.description}</p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          {price ? (
            <span className="inline-flex items-center gap-1.5 text-base font-semibold text-slate-800">
              <Ticket className="h-4 w-4 text-brand-600" aria-hidden />
              {price}
            </span>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-1 text-base font-semibold text-brand-700">
            {cta}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function PublicEventCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white">
      <div className="aspect-[4/3] animate-pulse bg-slate-200" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
        <div className="h-6 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}
