import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/layout/logo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ticket } from "lucide-react";
import { AgiFooter } from "@/components/agi-engine/agi-badge";
import Link from "next/link";
import { notFound } from "next/navigation";
import { qrService } from "@/services/qr/qr.service";
import { BrandedQrImage } from "@/components/qr/branded-qr-image";
import { resolveShareOgImage } from "@/lib/social/share-image";
import { getServerAppUrl } from "@/lib/app-url";
import { APP_NAME } from "@/lib/constants";

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
  const qrCode = await prisma.qrCode.findUnique({
    where: { token },
    select: { event: { select: { id: true, title: true, hostName: true } } },
  });
  if (!qrCode?.event) return { title: "Admission Pass" };

  const title = `${qrCode.event.title} · Admission Pass`;
  const description = `${qrCode.event.hostName ? `${qrCode.event.hostName}'s` : "Your"} digital admission pass on Celeventic.`;
  const appUrl = await getServerAppUrl();
  const ogImage = await resolveShareOgImage(qrCode.event.id, appUrl);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: APP_NAME,
      images: [{ url: ogImage, alt: qrCode.event.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function AdmissionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

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
