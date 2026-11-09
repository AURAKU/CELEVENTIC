import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { PublicDigitalCardsShowcase } from "@/components/digital-business-card/public-digital-cards-showcase";

export const metadata = {
  title: "CeleCard templates | Celeventic",
  description:
    "Browse CeleCard themes and see how QR, NFC, and Wallet share one living identity. Original art for every celebration.",
};

export default function DigitalCardsPage() {
  return (
    <>
      <HeaderShell />
      <main className="min-h-app-viewport bg-mesh">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <PublicDigitalCardsShowcase standalone />
        </div>
      </main>
      <Footer />
    </>
  );
}
