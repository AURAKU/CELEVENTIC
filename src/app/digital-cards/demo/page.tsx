import Link from "next/link";
import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { DigitalCardFace } from "@/components/digital-business-card/digital-card-face";
import { CeleCardQrBadge } from "@/components/digital-business-card/celecard-qr-badge";
import { resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";
import {
  DEMO_CARD,
  demoCardGuestPath,
  demoCardNfcPath,
  demoCardQrPath,
  demoCardStudioPath,
} from "@/lib/digital-business-card/demo-card";
import { digitalCardQrImageSrc } from "@/lib/digital-business-card/types";
import { Button } from "@/components/ui/button";
import { Nfc, QrCode, Share2 } from "lucide-react";
import { CeleYouBrandMark, CeleYouMarkIcon } from "@/components/digital-business-card/celeyou-brand-mark";
import { getServerAppUrl } from "@/lib/app-url";
import { redirect } from "next/navigation";
import { CELECARD_DUMMY_LIVE_FALLBACK, viewerMayOpenDummyLive } from "@/lib/digital-business-card/demo-live-access";

export const metadata = {
  title: "CeleYou live dummy | Celeventic",
  description: "See the guest tap and the subscriber live studio for a dummy CeleYou.",
  robots: { index: false, follow: false },
};

export default async function CeleCardDemoHubPage() {
  if (!(await viewerMayOpenDummyLive())) redirect(CELECARD_DUMMY_LIVE_FALLBACK);
  const origin = await getServerAppUrl();
  const guestUrl = `${origin}${demoCardGuestPath()}`;
  const qrUrl = `${origin}${demoCardQrPath()}`;
  const nfcUrl = `${origin}${demoCardNfcPath()}`;
  const qrSrc = digitalCardQrImageSrc(qrUrl);
  const theme = resolveDigitalCardTheme(DEMO_CARD.themeId);

  return (
    <>
      <HeaderShell />
      <main className="min-h-app-viewport bg-mesh">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
          <CeleYouBrandMark variant="chip" tone="light" className="mb-1" markClassName="h-8 w-8" />
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Walk the live tap.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            This is Ama Serwaa, a paid Gold Folio CeleYou. Link, QR, and NFC all open the same guest
            page. The studio view is what she sees after activation. Nothing here writes to a real
            account.
          </p>

          <div className="mt-8 max-w-xl">
            <DigitalCardFace
              themeId={DEMO_CARD.themeId}
              displayName={DEMO_CARD.displayName}
              title={DEMO_CARD.title}
              company={DEMO_CARD.company}
              avatarUrl={DEMO_CARD.avatarUrl}
              qrSrc={qrSrc}
              qrHref={demoCardGuestPath()}
            />
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <Share2 className="h-5 w-5 text-[#0B8A83]" aria-hidden />
              <h2 className="mt-3 font-display text-lg font-semibold text-slate-900">Share link</h2>
              <p className="mt-1 text-sm text-slate-600">
                The URL you send on WhatsApp, Mail, or social. Same page as a scan.
              </p>
              <p className="mt-3 break-all text-xs font-medium text-slate-500">{guestUrl}</p>
              <Button asChild className="mt-4 bg-[#0B8A83] hover:bg-[#097a74]">
                <Link href={demoCardGuestPath()}>Open guest page</Link>
              </Button>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <QrCode className="h-5 w-5 text-[#0B8A83]" aria-hidden />
              <h2 className="mt-3 font-display text-lg font-semibold text-slate-900">Smart QR</h2>
              <p className="mt-1 text-sm text-slate-600">
                The printed code stores the short /c/ address. Tap it, screenshot it, or save the photo. Any camera opens the live profile.
              </p>
              <div className="mt-4">
                <CeleCardQrBadge
                  qrSrc={qrSrc}
                  href={demoCardGuestPath()}
                  theme={theme}
                  avatarUrl={DEMO_CARD.avatarUrl}
                  displayName={DEMO_CARD.displayName}
                  sizeClass="h-52 w-52"
                  padClass="p-1.5"
                />
              </div>
              <p className="mt-2 break-all text-xs font-medium text-slate-500">{qrUrl}</p>
              <Button asChild variant="outline" className="mt-4">
                <Link href={demoCardQrPath()}>Open QR redirect</Link>
              </Button>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <Nfc className="h-5 w-5 text-[#0B8A83]" aria-hidden />
              <h2 className="mt-3 font-display text-lg font-semibold text-slate-900">NFC tap</h2>
              <p className="mt-1 text-sm text-slate-600">
                A Celeventic NFC card stores the short /n/ address. iPhone and Android taps open this
                same guest page automatically.
              </p>
              <p className="mt-3 break-all text-xs font-medium text-slate-500">{nfcUrl}</p>
              <Button asChild variant="outline" className="mt-4">
                <Link href={demoCardNfcPath()}>Simulate NFC tap</Link>
              </Button>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <CeleYouMarkIcon className="h-8 w-8" />
              <h2 className="mt-3 font-display text-lg font-semibold text-slate-900">Subscriber live</h2>
              <p className="mt-1 text-sm text-slate-600">
                Ama after a Yearly plan is paid. Live badge, QR, share, and the same Gold Folio
                face.
              </p>
              <Button asChild className="mt-4 bg-[#0B8A83] hover:bg-[#097a74]">
                <Link href={demoCardStudioPath()}>Open live studio</Link>
              </Button>
            </article>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
