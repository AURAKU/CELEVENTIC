import { NextResponse } from "next/server";
import { SMARTCARD_CURRENCY } from "@/lib/digital-business-card/plans";
import { getCeleCardCatalog } from "@/services/digital-business-card/catalog.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const catalog = await getCeleCardCatalog();
  return NextResponse.json({
    success: true,
    data: {
      currency: SMARTCARD_CURRENCY,
      plans: catalog.plans,
      conciergePriceGhs: catalog.conciergePriceGhs,
    },
  });
}
