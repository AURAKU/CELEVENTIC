import { notFound } from "next/navigation";
import {
  displayContactPhone,
  normalizeCallablePhone,
} from "@/lib/admission/contact-phone";
import { eventQrLinkService } from "@/services/qr-hub/event-qr-link.service";

type Ctx = { params: Promise<{ publicToken: string }> };

export default async function EventHelpPage({ params }: Ctx) {
  const { publicToken } = await params;
  const link = await eventQrLinkService.getByToken(publicToken);
  if (!link || link.type !== "HELP" || link.status !== "ACTIVE") notFound();

  const contactPhoneDisplay = displayContactPhone(link.event.contactPhone);
  const callablePhone = normalizeCallablePhone(link.event.contactPhone);

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 py-12">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
        {link.heading || "Need Help?"}
      </p>
      <h1 className="mt-2 font-serif text-3xl font-bold">{link.event.title}</h1>
      <p className="mt-2 text-sm text-slate-600">{link.subtitle}</p>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-relaxed">
        {callablePhone ? (
          <p>
            Host contact:{" "}
            <a className="font-semibold text-teal-700" href={`tel:${callablePhone}`}>
              {contactPhoneDisplay}
            </a>
          </p>
        ) : (
          <p className="text-slate-500">Help contacts will appear here once the hosts publish them.</p>
        )}
        {link.event.dressCode ? (
          <p className="mt-3">
            <span className="font-semibold">Dress code:</span> {link.event.dressCode}
          </p>
        ) : null}
      </div>
    </main>
  );
}
