import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, isAdminRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currencyService } from "@/services/commerce/currency.service";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await currencyService.ensureCurrenciesSeeded();
  const [currencies, roundingSetting] = await Promise.all([
    prisma.currency.findMany({ orderBy: [{ isDefault: "desc" }, { code: "asc" }] }),
    prisma.adminSetting.findUnique({ where: { key: "commerce.roundingRule" } }),
  ]);

  const roundingRule =
    (roundingSetting?.value as { rule?: string })?.rule ?? "nearest_cent";

  return NextResponse.json({ success: true, data: { currencies, roundingRule } });
}

const updateCurrencySchema = z.object({
  code: z.string().length(3),
  enabled: z.boolean(),
});

const updateRoundingSchema = z.object({
  roundingRule: z.enum(["nearest_cent", "nearest_whole", "ceil", "floor"]),
});

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();

    if ("roundingRule" in body) {
      const { roundingRule } = updateRoundingSchema.parse(body);
      await prisma.adminSetting.upsert({
        where: { key: "commerce.roundingRule" },
        update: { value: { rule: roundingRule } },
        create: { key: "commerce.roundingRule", value: { rule: roundingRule }, category: "commerce" },
      });
      return NextResponse.json({ success: true, data: { roundingRule } });
    }

    const { code, enabled } = updateCurrencySchema.parse(body);
    if (code === "GHS" && !enabled) {
      return NextResponse.json({ error: "GHS cannot be disabled" }, { status: 400 });
    }

    const currency = await prisma.currency.update({
      where: { code },
      data: { enabled },
    });
    return NextResponse.json({ success: true, data: currency });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
