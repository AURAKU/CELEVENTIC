import { MarketplaceClient } from "./marketplace-client";
import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";

export const metadata = {
  title: "Vendor Marketplace | Celeventic",
  description: "Discover trusted event vendors, venues, and service providers across Ghana.",
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
