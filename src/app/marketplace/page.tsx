import { MarketplaceClient } from "./marketplace-client";
import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";

export const metadata = {
  title: "Vendor Feed | Celeventic Marketplace",
  description: "Vendors list work, services, rate cards, and quotes. Hosts find them here, connect, and hire on Celeventic Marketplace.",
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
