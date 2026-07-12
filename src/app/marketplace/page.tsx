import { MarketplaceClient } from "./marketplace-client";
import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";

export const metadata = {
  title: "Global Event Marketplace | Celeventic",
  description: "Discover trusted event professionals worldwide. Book with confidence — secure payments, verified vendors, built for every event.",
};

export default function MarketplacePage() {
  return (
    <>
      <HeaderShell />
      <MarketplaceClient />
      <Footer />
    </>
  );
}
