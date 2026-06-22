import { getActivePricingPlans } from "@/lib/packages";
import { PricingDisplay } from "@/components/landing/pricing-display";

export async function Pricing() {
  const plans = await getActivePricingPlans();
  return <PricingDisplay plans={plans} />;
}
