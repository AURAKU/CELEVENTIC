import { notFound } from "next/navigation";
import { eventQrLinkService } from "@/services/qr-hub/event-qr-link.service";

type Ctx = { params: Promise<{ publicToken: string }> };

export default async function EventVenuePage({ params }: Ctx) {
  const { publicToken } = await params;
  const link = await eventQrLinkService.getByToken(publicToken);
  if (!link || link.type !== "VENUE" || link.status !== "ACTIVE") notFound();
  const event = link.event;

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 py-12">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
        {link.heading || "Find Us"}
      </p>
      <h1 className="mt-2 font-serif text-3xl font-bold">{event.title}</h1>
      <p className="mt-2 text-sm text-slate-600">{link.subtitle}</p>
      <div className="mt-8 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm">
        <p>
          <span className="font-semibold">Venue:</span> {event.venueName || "To be announced"}
        </p>
        {event.landmark ? (
          <p>
            <span className="font-semibold">Landmark:</span> {event.landmark}
          </p>
        ) : null}
        {event.mapsLink ? (
          <a
            href={event.mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex font-semibold text-teal-700 underline-offset-4 hover:underline"
          >
            Open map directions
          </a>
        ) : null}
      </div>
    </main>
  );
}
