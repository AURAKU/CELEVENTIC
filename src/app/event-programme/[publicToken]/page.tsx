import { notFound } from "next/navigation";
import { eventQrLinkService } from "@/services/qr-hub/event-qr-link.service";
import { prisma } from "@/lib/prisma";
import { resolveCompanionTheme } from "@/lib/admission/event-companion-theme";
import { liveInvitationWhere } from "@/lib/invitation/live-invitation";

type Ctx = { params: Promise<{ publicToken: string }> };

export default async function EventProgrammePage({ params }: Ctx) {
  const { publicToken } = await params;
  const link = await eventQrLinkService.getByToken(publicToken);
  if (!link || link.type !== "PROGRAMME" || link.status !== "ACTIVE") notFound();

  const invitation = await prisma.invitation.findFirst({
    where: liveInvitationWhere(link.eventId),
    orderBy: { updatedAt: "desc" },
    select: { designConfig: true, template: { select: { slug: true, config: true } } },
  });

  let items: Array<{ time?: string; title: string; detail?: string }> = [];
  try {
    if (invitation) {
      const theme = resolveCompanionTheme(invitation);
      items = (theme.programmeItems ?? []).map((item) => ({
        time: item.time,
        title: item.title,
        detail: item.description,
      }));
    }
  } catch {
    items = [];
  }

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 py-12">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
        {link.heading || "Today’s Programme"}
      </p>
      <h1 className="mt-2 font-serif text-3xl font-bold">{link.event.title}</h1>
      <p className="mt-2 text-sm text-slate-600">{link.subtitle}</p>
      <ol className="mt-8 space-y-4">
        {items.length === 0 ? (
          <li className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
            The programme will appear here once the hosts publish it.
          </li>
        ) : (
          items.map((item, i) => (
            <li key={`${item.title}-${i}`} className="rounded-xl border border-slate-200 bg-white p-4">
              {item.time ? (
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">{item.time}</p>
              ) : null}
              <p className="mt-1 font-semibold text-slate-900">{item.title}</p>
              {item.detail ? <p className="mt-1 text-sm text-slate-600">{item.detail}</p> : null}
            </li>
          ))
        )}
      </ol>
    </main>
  );
}
