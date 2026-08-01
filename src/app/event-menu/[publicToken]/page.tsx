import { notFound } from "next/navigation";
import { eventQrLinkService } from "@/services/qr-hub/event-qr-link.service";
import { prisma } from "@/lib/prisma";
import { readCompanionMenuConfig } from "@/lib/admission/companion-studio";

type Ctx = { params: Promise<{ publicToken: string }> };

export default async function EventMenuPage({ params }: Ctx) {
  const { publicToken } = await params;
  const link = await eventQrLinkService.getByToken(publicToken);
  if (!link || link.type !== "MENU" || link.status !== "ACTIVE") notFound();
  if (link.event.status === "CANCELLED") notFound();

  const invitation = await prisma.invitation.findFirst({
    where: { eventId: link.eventId, status: { in: ["PUBLISHED", "APPROVED"] } },
    orderBy: { updatedAt: "desc" },
    select: { featureConfig: true },
  });
  const menu = readCompanionMenuConfig(invitation?.featureConfig);

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 py-12" data-testid="event-menu-only">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
        {link.heading || "View Today’s Menu"}
      </p>
      <h1 className="mt-2 font-serif text-3xl font-bold text-slate-900">{link.event.title}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {link.subtitle || "Scan to explore the menu prepared for this celebration."}
      </p>
      <div className="mt-8 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-5 text-base leading-relaxed text-slate-800">
        {menu.menuBody.trim()
          ? menu.menuBody
          : "The menu for this celebration will appear here once the hosts publish it."}
      </div>
      {menu.menuUrl ? (
        <a
          href={menu.menuUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex text-sm font-semibold text-teal-700 underline-offset-4 hover:underline"
        >
          Open full menu
        </a>
      ) : null}
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        {link.footerText || "Menu only · No seating or gifts"}
      </p>
    </main>
  );
}
