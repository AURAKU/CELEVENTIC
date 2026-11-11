import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { DummyLiveTapCta } from "@/components/digital-business-card/dummy-live-tap-cta";
import { PublicDigitalCardsShowcase } from "@/components/digital-business-card/public-digital-cards-showcase";

export const metadata = {
  title: "CeleYou templates | Celeventic",
  description:
    "Browse CeleYou themes and see how QR, NFC, and Wallet share one living identity. Original art for every celebration.",
};

export default async function DigitalCardsPage() {
  const dummyLiveCta = await DummyLiveTapCta();
  return (
    <>
      <HeaderShell />
      <main className="min-h-app-viewport bg-mesh">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <PublicDigitalCardsShowcase standalone dummyLiveCta={dummyLiveCta} />
        </div>
      </main>
      <Footer />
    </>
  );
}
