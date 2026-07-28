import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/layout/logo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ticket } from "lucide-react";
import { AgiFooter } from "@/components/agi-engine/agi-badge";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { qrService } from "@/services/qr/qr.service";
import { BrandedQrImage } from "@/components/qr/branded-qr-image";
import { resolveShareOgImage } from "@/lib/social/share-image";
import { getServerAppUrl } from "@/lib/app-url";
import { APP_NAME } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { hashPassToken, verifyPassTokenSignature } from "@/lib/admission/pass-token";
import { getEventAdmissionSettings } from "@/services/admission/guest-pass.service";
import { GuestEntryPass } from "@/components/admission/guest-entry-pass";
import { buildEventCompanionHref } from "@/lib/admission/event-companion";
import { getInvitationAdmission } from "@/services/admission/admission.service";

/**
 * Share-card preview defaults to the QR center logo (falls back to the
 * Celeventic official logo) so link previews match the branded QR guests
 * scan — see `resolveShareOgImage`.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const passEvent = await resolvePassEvent(token);
  const qrCode = passEvent
    ? null
    : await prisma.qrCode.findUnique({
        where: { token },
        select: { event: { select: { id: true, title: true, hostName: true } } },
      });
  const event = passEvent ?? qrCode?.event;
  if (!event) return { title: "Admission Pass" };

  const title = `${event.title} · Admission Pass`;
  const description = `${event.hostName ? `${event.hostName}'s` : "Your"} digital admission pass on Celeventic.`;
  const appUrl = await getServerAppUrl();
  const ogImage = await resolveShareOgImage(event.id, appUrl);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: APP_NAME,
      images: [{ url: ogImage, alt: event.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

/** Resolve the event behind a Guest Entry Pass token, if this is one. */
async function resolvePassEvent(token: string) {
  if (!verifyPassTokenSignature(token)) return null;
  const pass = await prisma.guestPass.findUnique({
    where: { tokenHash: hashPassToken(token) },
    select: { event: { select: { id: true, title: true, hostName: true } } },
  });
  return pass?.event ?? null;
}

export default async function AdmissionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Guest Entry Pass tokens are signed and resolve to the invitation-level pass.
  // Legacy per-guest/ticket QR tokens fall through to the original lookup below.
  if (verifyPassTokenSignature(token)) {
    const pass = await prisma.guestPass.findUnique({
      where: { tokenHash: hashPassToken(token) },
      include: {
        event: { select: { title: true, venueName: true, startDate: true } },
        invitation: {
          select: {
            id: true,
            uniqueLink: true,
            postAdmissionEnabled: true,
            guests: { select: { qrToken: true }, take: 1 },
          },
        },
      },
    });
    if (!pass) notFound();

    const settings = await getEventAdmissionSettings(pass.eventId);
    const guestToken = pass.invitation.guests[0]?.qrToken;
    const companionHref = pass.invitation.postAdmissionEnabled
      ? buildEventCompanionHref(pass.invitation.uniqueLink, guestToken)
      : null;

    // Already admitted → Event Companion is the home surface (until reset).
    if (companionHref && pass.admittedCount > 0) {
      const summary = await getInvitationAdmission(pass.invitation.id);
      if (summary?.canAccessPortal) {
        redirect(companionHref);
      }
    }

    const inviteHref = `/invite/${pass.invitation.uniqueLink}${guestToken ? `?guest=${guestToken}` : ""}`;
    const admitted = pass.admittedCount > 0;

    return (
      <AdmissionShell>
        <GuestEntryPass
          token={token}
          code={pass.code}
          displayName={pass.displayName}
          eventName={pass.event.title}
          eventDate={formatDate(pass.event.startDate)}
          venueName={pass.event.venueName}
          partySize={pass.partySize}
          admittedCount={pass.admittedCount}
          status={pass.status}
          instructions={settings.passInstructions}
          allowDownload={settings.allowPassDownload}
          allowPrint={settings.allowPassPrint}
          showPartySize={settings.showPartySizeOnPass}
          preset="minimal"
          className="px-0 pb-0 pt-0"
        />
        <div className="mt-5 flex flex-col items-center gap-2">
          <Link href={inviteHref} className="text-sm text-[#0B8A83] hover:underline">
            View Invitation
          </Link>
          {companionHref && (
            <Link
              href={companionHref}
              className="inline-flex items-center justify-center rounded-full bg-[#0B8A83] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#097870]"
            >
              {admitted ? "Open your Event Companion" : "Event Companion (unlocks on arrival)"}
            </Link>
          )}
        </div>
      </AdmissionShell>
    );
  }

  const qrCode = await prisma.qrCode.findUnique({
    where: { token },
    include: {
      guest: { include: { rsvps: { orderBy: { createdAt: "desc" }, take: 1 }, invitation: true } },
      ticket: true,
      event: true,
      scans: { where: { result: "VALID" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!qrCode) notFound();

  const branded = await qrService.getBrandedQrForToken(token);

  if (qrCode.expiresAt && qrCode.expiresAt < new Date()) {
    return (
      <AdmissionShell>
        <Badge variant="destructive">Expired</Badge>
        <p className="text-slate-600 mt-4">This admission pass has expired.</p>
      </AdmissionShell>
    );
  }

  const checkedIn = qrCode.scans.length > 0;
  const guest = qrCode.guest;
  const rsvp = guest?.rsvps[0]?.response;

  return (
    <AdmissionShell>
      <Badge variant={checkedIn ? "success" : "outline"}>
        {checkedIn ? "Checked In" : "Not Yet Checked In"}
      </Badge>

      {guest && (
        <div className="mt-6 space-y-2">
          <p className="font-display text-xl font-bold text-[#0F172A]">{guest.name}</p>
          <p className="text-sm text-slate-500">RSVP: {rsvp ?? guest.status}</p>
        </div>
      )}

      {qrCode.ticket && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-600">
          <Ticket className="h-4 w-4" />
          {qrCode.ticket.name} — {qrCode.ticket.type}
        </div>
      )}

      {qrCode.event && (
        <p className="mt-4 text-sm text-[#0B8A83] font-medium">{qrCode.event.title}</p>
      )}

      <div className="mt-8 flex justify-center">
        <BrandedQrImage
          src={branded.dataUrl}
          token={token}
          size={220}
          caption="Present this code at the venue entrance"
        />
      </div>

      <p className="mt-6 text-xs text-slate-400">
        Staff will scan your admission QR. Keep brightness up for fastest check-in.
      </p>

      {guest?.invitation && (
        <Link
          href={`/invite/${guest.invitation.uniqueLink}?guest=${guest.qrToken}`}
          className="mt-4 inline-block text-sm text-[#0B8A83] hover:underline"
        >
          View Invitation
        </Link>
      )}
    </AdmissionShell>
  );
}

function AdmissionShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F172A] via-[#1a3a38] to-[#0B8A83] px-4 py-10">
      <Card className="w-full max-w-md shadow-2xl border-[#D4A63A]/20">
        <CardContent className="p-8 sm:p-10 text-center">
          <Logo className="justify-center mb-6" size="lg" />
          <h1 className="font-display text-lg font-bold text-[#0F172A] mb-2">Admission Pass</h1>
          {children}
          <div className="mt-8"><AgiFooter /></div>
        </CardContent>
      </Card>
    </div>
  );
}
