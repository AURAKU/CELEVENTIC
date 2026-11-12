import { NextResponse } from "next/server";
import {
  CELECARD_CONCIERGE_EXPLANATION,
  CELECARD_CONCIERGE_HEADLINE,
  CELECARD_CONCIERGE_SOLD_SEPARATELY,
  SMARTCARD_CURRENCY,
} from "@/lib/digital-business-card/plans";
import { getCeleCardCatalog } from "@/services/digital-business-card/catalog.service";
import { publishedCeleYouTiers } from "@/lib/digital-business-card/entitlements";

export const dynamic = "force-dynamic";

export async function GET() {
  const catalog = await getCeleCardCatalog();
  return NextResponse.json({
    success: true,
    data: {
      currency: SMARTCARD_CURRENCY,
      family: "CeleYou Pro",
      plans: catalog.plans,
      conciergePriceGhs: catalog.conciergePriceGhs,
      concierge: {
        headline: CELECARD_CONCIERGE_HEADLINE,
        priceGhs: catalog.conciergePriceGhs,
        oneTime: true,
        soldSeparately: CELECARD_CONCIERGE_SOLD_SEPARATELY,
        explanation: CELECARD_CONCIERGE_EXPLANATION,
      },
      effectiveDatePolicy: catalog.effectiveDatePolicy,
      publishedTiers: publishedCeleYouTiers().map((tier) => tier.id),
    },
  });
}
