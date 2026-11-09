import { catalogService } from "@/services/commerce/catalog.service";
import { getCatalogInvitationPackages } from "@/lib/invitation-mvp/packages";
import { PricingDisplay } from "@/components/landing/pricing-display";

export async function Pricing() {
  const packages = await catalogService.getActivePackages().catch(() => getCatalogInvitationPackages());
  return <PricingDisplay packages={packages} />;
}
