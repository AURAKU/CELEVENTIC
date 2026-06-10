import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, isAdminRole } from "@/lib/auth";
import { currencyService } from "@/services/commerce/currency.service";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rates = await currencyService.getExchangeRates();
  return NextResponse.json({ success: true, data: rates });
}

const updateSchema = z.object({
  targetCurrency: z.string().min(3).max(3),
  rate: z.number().positive(),
  source: z.string().optional(),
});

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = updateSchema.parse(await req.json());
    const rate = await currencyService.updateExchangeRate(
      body.targetCurrency,
      body.rate,
      session.user.id,
      body.source ?? "manual"
    );
    return NextResponse.json({ success: true, data: rate });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
