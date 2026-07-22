import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActivePricingPlans } from "@/lib/packages";

export async function GET() {
  const [raw, plans] = await Promise.all([
    prisma.eventPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    getActivePricingPlans(),
  ]);

  const featuresBySlug = Object.fromEntries(plans.map((p) => [p.slug, p.features]));

  return NextResponse.json({
    success: true,
    data: raw.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: Number(p.price),
      currency: p.currency,
      guestLimit: p.guestLimit,
      features: featuresBySlug[p.slug] ?? [],
    })),
  });
}
