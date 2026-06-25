import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export type PricingPlan = {
  name: string;
  price: string;
  priceGhs: number;
  desc: string;
  guests: number;
  features: string[];
  popular: boolean;
  slug: string;
};

const FALLBACK_PLANS: PricingPlan[] = [
  { name: "Starter", price: "Free", priceGhs: 0, desc: "Perfect for intimate gatherings", guests: 50, features: ["Digital Invitations", "RSVP Tracking", "QR Admission", "Basic Templates"], popular: false, slug: "starter" },
  { name: "Growth", price: "₵199", priceGhs: 199, desc: "For growing celebrations", guests: 200, features: ["Everything in Starter", "Ticketing", "Bulk Messaging", "Custom Themes"], popular: true, slug: "growth" },
  { name: "Premium", price: "₵499", priceGhs: 499, desc: "Full event operating system", guests: 1000, features: ["Everything in Growth", "Event Intelligence", "Vendor Marketplace", "Offline QR"], popular: false, slug: "premium" },
  { name: "Enterprise", price: "₵1,499", priceGhs: 1499, desc: "Unlimited scale", guests: 5000, features: ["Everything in Premium", "White Label", "API Access", "Dedicated Manager"], popular: false, slug: "enterprise" },
];

function toPlans(
  packages: Awaited<ReturnType<typeof prisma.eventPackage.findMany>>
): PricingPlan[] {
  if (packages.length === 0) return FALLBACK_PLANS;

  return packages.map((p, i) => ({
    name: p.name,
    priceGhs: Number(p.price),
    price: Number(p.price) === 0 ? "Free" : formatCurrency(Number(p.price), p.currency),
    desc: p.description ?? "",
    guests: p.guestLimit,
    features: Array.isArray(p.features)
      ? (p.features as string[])
      : typeof p.features === "object" && p.features !== null
        ? Object.values(p.features as Record<string, string>)
        : ["Digital Invitations", "RSVP", "QR Admission"],
    popular: i === 1,
    slug: p.slug,
  }));
}

export const getActivePricingPlans = unstable_cache(
  async () => {
    const packages = await prisma.eventPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return toPlans(packages);
  },
  ["active-pricing-plans"],
  { revalidate: 300, tags: ["pricing-plans"] }
);
