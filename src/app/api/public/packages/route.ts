import { NextResponse } from "next/server";
import { getCatalogInvitationPackages } from "@/lib/invitation-mvp/packages";
import { catalogService } from "@/services/commerce/catalog.service";

export async function GET() {
  const packages = await catalogService.getActivePackages().catch(() => getCatalogInvitationPackages());

  return NextResponse.json({
    success: true,
    data: packages.map((p) => ({
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: p.priceGhs,
      currency: "GHS",
      guestLimit: p.guestCapacity ?? null,
      features: p.features,
      popular: p.popular === true,
      quoteOnly: p.quoteOnly === true,
      ctaLabel: p.ctaLabel ?? null,
      teamChatAfterPay: p.teamChatAfterPay === true,
    })),
  });
}
