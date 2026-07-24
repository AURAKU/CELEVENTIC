import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  Calendar, MapPin, Phone, Shirt, Ticket, Heart, ArrowRight, ExternalLink,
} from "lucide-react";
import { getPublicEventSite } from "@/services/events/event-site.service";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrandMotto } from "@/components/brand/brand-motto";
import { BRAND_MOTTO, APP_NAME } from "@/lib/constants";
import { resolveMediaUrl, shouldUnoptimizeNextImage } from "@/lib/uploads/media-url";
import { resolveShareOgImage } from "@/lib/social/share-image";
import { getServerAppUrl } from "@/lib/app-url";

/**
 * Share-card preview defaults to the QR center logo (falls back to the
 * Celeventic official logo) so link previews match the branded QR guests
 * scan — see `resolveShareOgImage`.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const site = await getPublicEventSite(slug);
  if (!site) return { title: "Event Not Found" };

  const title = site.title;
  const description = site.description ?? `Join ${site.hostName} for ${site.title} on Celeventic`;
  const appUrl = await getServerAppUrl();
  const ogImage = await resolveShareOgImage(site.id, appUrl);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: APP_NAME,
      images: [{ url: ogImage, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function EventMiniSitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getPublicEventSite(slug);
  if (!site) notFound();

  const inviteUrl = site.primaryInvitation
    ? `/invite/${site.primaryInvitation.uniqueLink}`
    : null;

  return (
    <div className="min-h-screen bg-[#FAF8F4]">
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <BrandMotto size="sm" />
          <Badge variant="outline" className="capitalize">{site.eventType.toLowerCase().replace(/_/g, " ")}</Badge>
        </div>
      </header>

      <section className="relative">
        {site.coverImageUrl ? (
          <div className="relative h-64 sm:h-80 lg:h-[28rem]">
            <Image src={site.coverImageUrl} alt={site.title} fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent" />
          </div>
        ) : (
          <div className="h-48 sm:h-64 bg-gradient-to-br from-brand-600 via-brand-500 to-gold-400" />
        )}
        <div className="absolute bottom-0 inset-x-0 p-6 sm:p-10 text-white">
          <div className="mx-auto max-w-5xl">
            <p className="text-sm font-medium text-white/80">{site.hostName} invites you</p>
            <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight mt-2">{site.title}</h1>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:py-14 space-y-10">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 flex gap-3">
            <Calendar className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Date & Time</p>
              <p className="font-semibold text-slate-900 mt-1">{formatDate(site.startDate)}</p>
            </div>
          </div>
          {(site.venueName || site.landmark) && (
            <div className="rounded-2xl border border-slate-200/70 bg-white p-5 flex gap-3">
              <MapPin className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Venue</p>
                <p className="font-semibold text-slate-900 mt-1">{site.venueName ?? site.landmark}</p>
                {site.mapsLink && (
                  <a href={site.mapsLink} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:underline inline-flex items-center gap-1 mt-1">
                    Directions <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          )}
          {site.dressCode && (
            <div className="rounded-2xl border border-slate-200/70 bg-white p-5 flex gap-3">
              <Shirt className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Dress Code</p>
                <p className="font-semibold text-slate-900 mt-1">{site.dressCode}</p>
              </div>
            </div>
          )}
          {site.contactPhone && (
            <div className="rounded-2xl border border-slate-200/70 bg-white p-5 flex gap-3">
              <Phone className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Contact</p>
                <p className="font-semibold text-slate-900 mt-1">{site.contactPhone}</p>
              </div>
            </div>
          )}
        </div>

        {site.description && (
          <section className="rounded-2xl border border-slate-200/70 bg-white p-6 sm:p-8">
            <h2 className="font-display text-xl font-bold text-slate-900">About This Celebration</h2>
            <p className="mt-4 text-slate-600 leading-relaxed whitespace-pre-line">{site.description}</p>
          </section>
        )}

        {site.media.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-bold text-slate-900 mb-4">Gallery</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {site.media.map((item) => (
                <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                  <Image
                    src={resolveMediaUrl(item.url)}
                    alt={item.caption ?? site.title}
                    fill
                    className="object-cover"
                    unoptimized={shouldUnoptimizeNextImage(item.url)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 text-white p-8 sm:p-10 text-center">
          <Heart className="h-8 w-8 mx-auto text-gold-300 mb-4" />
          <h2 className="font-display text-2xl font-bold">You&apos;re Invited</h2>
          <p className="mt-2 text-white/80 max-w-md mx-auto">
            Open your personalized invitation to RSVP and receive your digital admission pass.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            {inviteUrl && (
              <Button size="lg" variant="secondary" asChild>
                <Link href={inviteUrl}>
                  View Invitation <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
            {site.tickets.length > 0 && (
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10" asChild>
                <Link href={`/events/${site.slug}`}>
                  <Ticket className="h-4 w-4" /> Get Tickets
                </Link>
              </Button>
            )}
          </div>
        </section>

        {site.tickets.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-bold text-slate-900 mb-4">Tickets</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {site.tickets.map((ticket) => (
                <div key={ticket.id} className="rounded-xl border border-slate-200/70 bg-white p-5 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-slate-900">{ticket.name}</p>
                    <p className="text-sm text-slate-500 capitalize">{ticket.type.toLowerCase()}</p>
                  </div>
                  <p className="font-bold text-brand-600">{formatCurrency(ticket.price)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="text-center text-xs text-slate-400 pb-8">
          Powered by <Link href="/" className="text-brand-600 hover:underline">Celeventic</Link> — {BRAND_MOTTO}
        </p>
      </main>
    </div>
  );
}
